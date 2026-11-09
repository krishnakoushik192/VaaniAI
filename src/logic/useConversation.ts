import { useCallback, useEffect, useRef, useState } from 'react';
import { isApiError, TurnResponse, TurnState, voiceTurn } from '../api/client';
import type { Language } from '../data/types';
import type { StringKey } from '../i18n';
import { ensureMicPermission, MAX_SECONDS, SpeechDetector, startRecording, stopRecording, voiceErrorKey } from './recording';
import { useReadAloud } from './useReadAloud';

/**
 * The voice-bill conversation, like a helper at the counter writing the bill:
 *
 *   listening ──(shopkeeper goes quiet)──▶ thinking ──▶ speaking the reply
 *     ▲                                                     │
 *     ├── question ("Price of oil and sugar?") or nothing ◀─┤  (hands-free: listens again)
 *     │                                                     ▼
 *     └──────────── No: "What should I change?" ◀──── confirm: "Ramesh, 3 items, 310 rupees,
 *                                                       cash. Save?" → keeps listening:
 *                                                       "yes" (spoken or tapped) → confirmed
 *
 * The server applies each answer to the bill (adds, corrections, removals, answers).
 * Nothing is saved here: "confirmed" hands the bill to the screen, which saves it.
 */
export type ConversationPhase = 'starting' | 'listening' | 'thinking' | 'speaking' | 'confirm' | 'confirmed' | 'idle' | 'error';

export type ConversationError = { key: StringKey; canOpenSettings?: boolean };

const SPEECH_LANG: Record<Language, string> = { te: 'te-IN', hi: 'hi-IN', en: 'en-IN' };
const MAX_SILENT_TURNS = 3; // stop listening by itself after this many turns with nothing heard
/** Listening for the answer to "Save?" or "60 or 16?": a short reply, so stop sooner. */
const SHORT_ANSWER = { riseDb: 12, quietMs: 800, noSpeechMs: 6000 };
const SHORT_ANSWER_MAX_S = 6;

export function useConversation(opts: { token: string | null; language: Language; readBack: boolean; readAll: boolean; whatToChange: string }) {
  const [phase, setPhase] = useState<ConversationPhase>('starting');
  const [seconds, setSeconds] = useState(0);
  const [level, setLevel] = useState(0.3);
  const [last, setLast] = useState<TurnResponse | null>(null);
  const [replyText, setReplyText] = useState<string | null>(null);
  const [heard, setHeard] = useState<string[]>([]);
  const [error, setError] = useState<ConversationError | null>(null);
  // The read-back asked "Save?": Yes / Change stay on screen while the mic listens for the answer.
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);
  const voice = useReadAloud(opts.token);

  // Values the engine reads at call time (avoids stale closures between its steps).
  const cfg = useRef({ ...opts, play: voice.play, stopVoice: voice.stop });
  cfg.current = { ...opts, play: voice.play, stopVoice: voice.stop };

  // A fresh engine for every mount (a remount — Android/React restarting the screen — must never
  // leave a switched-off engine behind). It carries on with the bill built so far.
  const engine = useRef<ReturnType<typeof createEngine> | null>(null);
  const lastBill = useRef<TurnState | null>(null);
  lastBill.current = last?.state ?? null;

  useEffect(() => {
    const e = createEngine({ cfg, setPhase, setSeconds, setLevel, setLast, setReplyText, setHeard, setError, setAwaitingConfirm }, lastBill.current);
    engine.current = e;
    e.start();
    return () => e.dispose();
  }, []);

  return {
    phase,
    seconds,
    level,
    bill: last?.state ?? null,
    customer: last?.customer ?? null,
    spokenCustomerName: last?.spokenCustomerName ?? null,
    totals: last?.totals ?? { subtotal: 0, total: 0 },
    detectedLanguage: last?.detectedLanguage ?? null,
    replyText,
    heard,
    error,
    awaitingConfirm,
    maxSeconds: MAX_SECONDS,
    /** Mic button: finish now while listening, otherwise start listening. */
    mic: useCallback(() => engine.current?.mic(), []),
    /** "No": ask what to change, then listen. */
    no: useCallback(() => engine.current?.no(), []),
    /** Answer "did you mean?" by tapping: 0 = what was heard, 1 = the likely other one. */
    choose: useCallback((choice: 0 | 1) => engine.current?.choose(choice), []),
    /** Stop speaking and move on. */
    skip: useCallback(() => engine.current?.skip(), []),
    /** Stop everything (leaving the screen, or Yes). */
    cancel: useCallback(() => engine.current?.dispose(), []),
  };
}

type Setters = {
  cfg: React.MutableRefObject<{
    token: string | null;
    language: Language;
    readBack: boolean;
    readAll: boolean;
    whatToChange: string;
    play: (text: string, language?: string | null) => Promise<void>;
    stopVoice: () => void;
  }>;
  setPhase: (p: ConversationPhase) => void;
  setSeconds: (n: number) => void;
  setLevel: (n: number) => void;
  setLast: (r: TurnResponse) => void;
  setReplyText: (s: string | null) => void;
  setHeard: (f: (h: string[]) => string[]) => void;
  setError: (e: ConversationError | null) => void;
  setAwaitingConfirm: (v: boolean) => void;
};

function createEngine(s: Setters, initialBill: TurnState | null) {
  let alive = true;
  let phase: ConversationPhase = 'starting';
  let listening = false;
  let bill: TurnState | null = initialBill;
  let silentTurns = 0;
  let awaiting = false; // listening for the answer to "Save?"
  let upload: AbortController | null = null;

  const go = (p: ConversationPhase) => {
    phase = p;
    if (alive) {
      s.setPhase(p);
    }
  };
  const await_ = (v: boolean) => {
    awaiting = v;
    if (alive) {
      s.setAwaitingConfirm(v);
    }
  };
  const fail = (err: ConversationError) => {
    if (alive) {
      s.setError(err);
      go('error');
    }
  };

  async function say(text: string) {
    s.setReplyText(text);
    if (!alive || !s.cfg.current.readBack) {
      return;
    }
    go('speaking');
    await s.cfg.current.play(text, SPEECH_LANG[s.cfg.current.language]);
  }

  async function listen() {
    if (!alive || listening) {
      return;
    }
    s.setError(null);
    s.setSeconds(0);
    const perm = await ensureMicPermission();
    if (!alive) {
      return;
    }
    if (perm !== 'granted') {
      fail({ key: 'err.micDenied', canOpenSettings: perm === 'blocked' });
      return;
    }
    const short = awaiting || !!bill?.check; // "yes" / "sixty": cut off quickly
    const detector = new SpeechDetector(short ? SHORT_ANSWER : undefined);
    listening = true;
    go('listening');
    try {
      await startRecording((sec, db) => {
        if (!listening) {
          return;
        }
        s.setSeconds(Math.floor(sec));
        if (db != null && db > -160) {
          s.setLevel(Math.max(0.15, Math.min(1, (db + 60) / 60)));
        }
        const decision = sec >= (short ? SHORT_ANSWER_MAX_S : MAX_SECONDS) ? 'done' : detector.push(db, sec * 1000);
        if (decision === 'done') {
          finishListening();
        } else if (decision === 'noSpeech') {
          giveUp();
        }
      });
    } catch {
      listening = false;
      fail({ key: 'err.micFailed' });
    }
  }

  /** Nobody spoke: stop without sending anything; the mic button starts again. */
  async function giveUp() {
    if (!listening) {
      return;
    }
    listening = false;
    await stopRecording();
    if (!alive) {
      return;
    }
    if (awaiting) {
      go('confirm'); // no answer to "Save?": the Yes / Change buttons are still there
      return;
    }
    s.setError({ key: 'conv.noSpeech' });
    go('idle');
  }

  async function finishListening() {
    if (!listening) {
      return;
    }
    listening = false;
    const uri = await stopRecording();
    if (!alive) {
      return;
    }
    if (!uri) {
      fail({ key: 'err.micFailed' });
      return;
    }
    await sendTurn(uri);
  }

  /** A recording, or a tapped answer to "did you mean?" (sent without audio). */
  async function sendTurn(fileUri: string | null, choose?: 0 | 1) {
    const token = s.cfg.current.token;
    if (!token) {
      fail({ key: 'err.sessionExpired' });
      return;
    }
    go('thinking');
    const controller = new AbortController();
    upload = controller;
    let res: TurnResponse | null = null;
    // A dropped connection gets one automatic retry (the recording is still on the phone).
    for (let attempt = 0; attempt < 2 && !res; attempt++) {
      try {
        res = await voiceTurn(
          token,
          { fileUri: fileUri ?? undefined, choose, state: bill, language: s.cfg.current.language, readAll: s.cfg.current.readAll },
          controller.signal,
        );
      } catch (e) {
        const retry = attempt === 0 && isApiError(e) && e.kind === 'network' && alive;
        if (retry) {
          await pause(800);
          continue;
        }
        upload = null;
        if (!(isApiError(e) && e.kind === 'aborted')) {
          fail({ key: voiceErrorKey(e) });
        }
        return;
      }
    }
    upload = null;
    if (!res) {
      return;
    }
    if (!alive) {
      return;
    }
    if (awaiting && (!res.heard || res.reply.kind === 'retry')) {
      go('confirm'); // nothing clear in answer to "Save?": keep the bill and the buttons
      return;
    }
    if (res.reply.kind === 'confirmed') {
      await_(false);
      go('confirmed');
      return;
    }
    await_(false);
    bill = res.state;
    s.setLast(res);
    if (res.heard) {
      silentTurns = 0;
      s.setHeard(h => (res.transcript ? [...h, res.transcript] : h)); // a tapped answer has no transcript
    } else {
      silentTurns++;
    }
    await say(res.reply.text);
    if (!alive) {
      return;
    }
    if (res.reply.kind === 'confirm') {
      await_(true);
      go('confirm');
      await pause(250);
      listen(); // hands-free: "yes" saves, or say what to change
    } else if (silentTurns >= MAX_SILENT_TURNS) {
      s.setError({ key: 'conv.noSpeech' });
      go('idle');
    } else {
      await pause(250);
      listen(); // hands-free: answer the question / say it again
    }
  }

  return {
    start: () => {
      listen();
    },
    mic: () => {
      if (phase === 'listening') {
        finishListening();
      } else if (phase === 'speaking') {
        s.cfg.current.stopVoice();
      } else if (phase !== 'thinking') {
        silentTurns = 0;
        listen();
      }
    },
    no: async () => {
      if (!awaiting || phase === 'thinking') {
        return;
      }
      await_(false);
      if (listening) {
        listening = false;
        await stopRecording(); // drop what was being recorded
      }
      await say(s.cfg.current.whatToChange);
      if (alive) {
        await pause(250);
        listen();
      }
    },
    skip: () => s.cfg.current.stopVoice(),
    /** Tapped answer to "did you mean?": 0 = what was heard, 1 = the other one. */
    choose: async (choice: 0 | 1) => {
      if (!bill?.check || phase === 'thinking') {
        return;
      }
      s.cfg.current.stopVoice();
      if (listening) {
        listening = false;
        await stopRecording(); // drop the half-spoken answer: the tap wins
      }
      silentTurns = 0;
      await sendTurn(null, choice);
    },
    dispose: () => {
      alive = false;
      listening = false;
      upload?.abort();
      stopRecording();
      s.cfg.current.stopVoice();
    },
  };
}

const pause = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
