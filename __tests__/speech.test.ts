/**
 * @format
 */
import { SpeechDetector } from '../src/logic/recording';

/** Feed readings every 100 ms; returns the first non-'continue' decision and when. */
function run(levels: number[]) {
  const d = new SpeechDetector();
  for (let i = 0; i < levels.length; i++) {
    const r = d.push(levels[i]!, i * 100);
    if (r !== 'continue') {
      return { r, atMs: i * 100 };
    }
  }
  return { r: 'continue' as const, atMs: levels.length * 100 };
}
const repeat = (db: number, n: number) => Array(n).fill(db) as number[];

test('quiet room: speech then 1.6 s of quiet = done', () => {
  const levels = [...repeat(-55, 5), ...repeat(-25, 30), ...repeat(-54, 25)];
  const { r, atMs } = run(levels);
  expect(r).toBe('done');
  expect(atMs).toBe((5 + 30 + 16) * 100);
});

test('noisy shop: background at -38 dB, speech at -20 dB', () => {
  const levels = [...repeat(-38, 5), ...repeat(-20, 20), ...repeat(-37, 20)];
  expect(run(levels).r).toBe('done');
});

test('short pauses between words do not end listening', () => {
  const words = [...repeat(-22, 8), ...repeat(-50, 6)]; // 0.6 s pause
  const levels = [...repeat(-52, 4), ...words, ...words, ...words, ...repeat(-50, 30)];
  const { r, atMs } = run(levels);
  expect(r).toBe('done');
  expect(atMs).toBeGreaterThan((4 + 14 * 3) * 100); // only after the final pause
});

test('speaking from the very first moment still ends on quiet', () => {
  const levels = [...repeat(-24, 15), ...repeat(-50, 20)];
  expect(run(levels).r).toBe('done');
});

test('nobody speaks: gives up after 8 s without sending anything', () => {
  const { r, atMs } = run(repeat(-50, 100));
  expect(r).toBe('noSpeech');
  expect(atMs).toBe(8000);
});

test('digital silence (emulator) counts as no speech', () => {
  expect(run(repeat(-160, 100)).r).toBe('noSpeech');
});
