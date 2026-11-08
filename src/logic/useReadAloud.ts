import { useCallback, useEffect, useRef, useState } from 'react';
import Sound from 'react-native-nitro-sound';
import { speakUrl } from '../api/client';

/**
 * Reads text aloud with the backend's voice (GET /api/voice/speak). Long text is split at
 * sentence ends into parts of ≤ 550 characters that play one after another.
 * `play()` resolves when reading finished, was stopped, or failed (state 'error').
 *
 * States: idle → loading → playing → idle | error
 */
export type ReadAloudState = 'idle' | 'loading' | 'playing' | 'error';

const MAX_PART = 550;
const PART_TIMEOUT_MS = 90_000; // a part never plays longer than this; if no end is reported, move on

/** Split at sentence ends (. ! ? । ॥), then at commas, then hard, keeping parts ≤ MAX_PART. */
export function splitForSpeech(text: string): string[] {
  const sentences = text.replace(/\s+/g, ' ').trim().match(/[^.!?।॥]+[.!?।॥]*\s*/g) ?? [];
  const parts: string[] = [];
  let cur = '';
  const push = (s: string) => {
    if ((cur + s).length > MAX_PART && cur) {
      parts.push(cur.trim());
      cur = '';
    }
    cur += s;
  };
  for (const s of sentences) {
    if (s.length <= MAX_PART) {
      push(s);
      continue;
    }
    for (const piece of s.split(/(?<=,)/)) {
      for (let i = 0; i < piece.length; i += MAX_PART) {
        push(piece.slice(i, i + MAX_PART));
      }
    }
  }
  if (cur.trim()) {
    parts.push(cur.trim());
  }
  return parts;
}

export function useReadAloud(token: string | null) {
  const [state, setState] = useState<ReadAloudState>('idle');
  const run = useRef(0); // bumps on every play/stop so a stale part never starts
  const finish = useRef<(() => void) | null>(null);

  const settle = useCallback(() => {
    const f = finish.current;
    finish.current = null;
    f?.();
  }, []);

  const stop = useCallback(() => {
    run.current++;
    Sound.removePlaybackEndListener();
    Sound.removePlayBackListener();
    Sound.stopPlayer().catch(() => {});
    setState('idle');
    settle();
  }, [settle]);

  const play = useCallback(
    (text: string, language?: string | null): Promise<void> => {
      settle(); // a previous play() caller is released
      const parts = splitForSpeech(text);
      if (!parts.length || !token) {
        return Promise.resolve();
      }
      const id = ++run.current;
      const headers = { Authorization: `Bearer ${token}` };
      const done = new Promise<void>(resolve => {
        finish.current = resolve;
      });
      const playPart = async (i: number) => {
        if (run.current !== id) {
          return;
        }
        if (i >= parts.length) {
          setState('idle');
          settle();
          return;
        }
        setState(i === 0 ? 'loading' : 'playing');
        try {
          await Sound.startPlayer(speakUrl(parts[i]!, language), headers);
          if (run.current === id) {
            setState('playing');
          }
        } catch {
          if (run.current === id) {
            run.current++; // stop here: no later part, timer or event continues this reading
            Sound.removePlayBackListener();
            setState('error'); // no internet, server busy, or the voice service failed
            settle();
          }
        }
      };
      // The end of a part is detected three ways, whichever comes first: the player's "finished"
      // event, the position reaching the duration (some phones skip the event), or a time cap.
      let current = 0;
      let partTimer: ReturnType<typeof setTimeout> | undefined;
      const partEnded = (part: number) => {
        if (run.current !== id || part !== current) {
          return; // already moved past this part
        }
        clearTimeout(partTimer);
        current++;
        if (current < parts.length) {
          partTimer = setTimeout(() => partEnded(current), PART_TIMEOUT_MS);
        } else {
          Sound.removePlayBackListener();
        }
        playPart(current);
      };
      Sound.removePlaybackEndListener();
      Sound.removePlayBackListener();
      Sound.addPlaybackEndListener(() => partEnded(current));
      Sound.addPlayBackListener(meta => {
        if (meta.duration > 0 && meta.currentPosition >= meta.duration - 120) {
          partEnded(current);
        }
      });
      partTimer = setTimeout(() => partEnded(0), PART_TIMEOUT_MS);
      playPart(0);
      return done;
    },
    [token, settle],
  );

  // Stop playing when the screen closes.
  useEffect(
    () => () => {
      run.current++;
      Sound.removePlaybackEndListener();
      Sound.removePlayBackListener();
      Sound.stopPlayer().catch(() => {});
      finish.current?.();
      finish.current = null;
    },
    [],
  );

  return { state, play, stop };
}
