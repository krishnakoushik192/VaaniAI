import { PermissionsAndroid, Platform } from 'react-native';
import Sound, { AudioEncoderAndroidType, AudioSourceAndroidType, OutputFormatAndroidType } from 'react-native-nitro-sound';
import { isApiError } from '../api/client';
import type { StringKey } from '../i18n';

export const MAX_SECONDS = 90; // the server cuts longer audio into ≤25 s pieces for speech-to-text

// 16 kHz mono AAC at 32 kbps (~360 KB for 90 s), in ADTS framing: unlike .m4a, the server
// can cut ADTS between frames without decoding, which it needs for recordings over 30 s.
const AUDIO_SET = {
  AudioSourceAndroid: AudioSourceAndroidType.MIC,
  OutputFormatAndroid: OutputFormatAndroidType.AAC_ADTS,
  AudioEncoderAndroid: AudioEncoderAndroidType.AAC,
  AudioSamplingRate: 16000,
  AudioChannels: 1,
  AudioEncodingBitRate: 32000,
};

let recordingDir: string | null = null; // reuse one file instead of filling up storage
let recording = false;

export type MicPermission = 'granted' | 'denied' | 'blocked';

export async function ensureMicPermission(): Promise<MicPermission> {
  if (Platform.OS !== 'android') {
    return 'granted'; // iOS asks by itself on first use
  }
  const perm = PermissionsAndroid.PERMISSIONS.RECORD_AUDIO;
  if (await PermissionsAndroid.check(perm)) {
    return 'granted';
  }
  const r = await PermissionsAndroid.request(perm);
  return r === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : r === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ? 'blocked' : 'denied';
}

/** Start the microphone. `onMeter(seconds, dB)` is called ~10×/s while recording. */
export async function startRecording(onMeter: (seconds: number, db: number | null) => void): Promise<void> {
  await Sound.stopPlayer().catch(() => {}); // never record over our own voice
  Sound.setSubscriptionDuration(0.1);
  Sound.addRecordBackListener(meta => onMeter(meta.currentPosition / 1000, meta.currentMetering ?? null));
  const uri = recordingDir ? `${recordingDir}/voice-bill.aac` : undefined;
  try {
    const path = await Sound.startRecorder(uri, AUDIO_SET, true);
    recording = true;
    if (!recordingDir) {
      recordingDir = path.replace(/^file:\/\//, '').replace(/\/[^/]+$/, '');
    }
  } catch (e) {
    Sound.removeRecordBackListener();
    throw e;
  }
}

/** Stop the microphone; returns the file:// URI of the recording (null if nothing was recording). */
export async function stopRecording(): Promise<string | null> {
  Sound.removeRecordBackListener();
  if (!recording) {
    return null;
  }
  recording = false;
  try {
    return await Sound.stopRecorder();
  } catch {
    return null;
  }
}

/** Maps a failed voice request to a message for the user. */
export function voiceErrorKey(e: unknown): StringKey {
  if (!isApiError(e)) {
    return 'err.generic';
  }
  if (e.kind === 'network') {
    return 'err.noInternet';
  }
  if (e.kind === 'timeout') {
    return 'err.timeout';
  }
  switch (e.status) {
    case 401:
      return 'err.sessionExpired';
    case 413:
      return 'err.tooLong';
    case 400:
      // Only blame the recording when the server says the audio itself was the problem.
      return /audio/i.test(e.message) ? 'err.audioUnreadable' : 'err.generic';
    case 502:
    case 503:
    case 504:
      return 'err.voiceBusy';
    default:
      return e.status >= 500 ? 'err.server' : 'err.generic';
  }
}

/**
 * Hands-free listening: decides when the shopkeeper has started and finished speaking, from
 * the microphone level (dB, about 10 readings a second). Works relative to the room's own
 * background noise, so a quiet room and a noisy shop both work.
 */
export class SpeechDetector {
  private floor = Infinity; // quietest level heard so far ≈ background noise
  private peak = -Infinity;
  private spoke = false;
  private quietSince: number | null = null;

  constructor(
    private readonly opts = {
      riseDb: 12, // speech must be this much louder than the background
      quietMs: 1600, // this much quiet after speech = finished
      noSpeechMs: 8000, // nobody spoke at all = give up
    },
  ) {}

  /** Feed one reading; returns what to do now. */
  push(db: number | null, atMs: number): 'continue' | 'done' | 'noSpeech' {
    if (db == null || !Number.isFinite(db) || db <= -159) {
      // no usable reading (or digital silence)
      if (!this.spoke && atMs >= this.opts.noSpeechMs) {
        return 'noSpeech';
      }
      return this.spoke && this.quietFor(atMs) ? 'done' : 'continue';
    }
    this.floor = Math.min(this.floor, db);
    this.peak = Math.max(this.peak, db);
    const threshold = this.floor + this.opts.riseDb;
    // Speaking from the very first moment: the "background" we measured was really the voice.
    // Once real quiet shows up, the earlier loud part counts as speech.
    if (!this.spoke && this.peak >= threshold && this.peak > -55) {
      this.spoke = true;
    }
    if (db >= threshold && db > -55) {
      this.spoke = true;
      this.quietSince = null;
      return 'continue';
    }
    if (!this.spoke) {
      return atMs >= this.opts.noSpeechMs ? 'noSpeech' : 'continue';
    }
    if (this.quietSince == null) {
      this.quietSince = atMs;
    }
    return this.quietFor(atMs) ? 'done' : 'continue';
  }

  get heardSpeech() {
    return this.spoke;
  }

  private quietFor(atMs: number) {
    if (this.quietSince == null) {
      this.quietSince = atMs;
    }
    return atMs - this.quietSince >= this.opts.quietMs;
  }
}
