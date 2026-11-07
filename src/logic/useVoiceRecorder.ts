import { useCallback, useEffect, useRef, useState } from 'react';
import { sampleExtraction } from '../data/sample';
import { BillItem } from './money';

export type RecorderState = 'recording' | 'paused' | 'processing' | 'done';
export const PROCESSING_STEPS = ['Listening back', 'Finding items', 'Counting the money'] as const;

/**
 * Mock recorder. Integration points:
 *  - start/pause/stop → a native audio module (e.g. react-native-audio-recorder-player)
 *  - stop → upload audio to the Node/Express API: speech-to-text + item extraction
 *  - the API returns names, quantities, units, spoken amounts only; totals come from logic/money.ts
 */
export function useVoiceRecorder() {
  const [state, setState] = useState<RecorderState>('recording');
  const [seconds, setSeconds] = useState(0);
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<{ transcript: string; items: BillItem[]; customerId: string } | null>(null);
  const words = useRef(sampleExtraction.transcript.split(' ')).current;

  useEffect(() => {
    if (state !== 'recording') {
      return;
    }
    const t = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [state]);

  useEffect(() => {
    if (state !== 'processing') {
      return;
    }
    if (step >= PROCESSING_STEPS.length) {
      setResult(sampleExtraction);
      setState('done');
      return;
    }
    const t = setTimeout(() => setStep(s => s + 1), 700);
    return () => clearTimeout(t);
  }, [state, step]);

  const transcript = words.slice(0, Math.min(words.length, Math.ceil(seconds * 1.5))).join(' ');

  return {
    state,
    seconds,
    step,
    transcript,
    result,
    pause: useCallback(() => setState('paused'), []),
    resume: useCallback(() => setState('recording'), []),
    stop: useCallback(() => {
      setStep(0);
      setState('processing');
    }, []),
  };
}

export const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
