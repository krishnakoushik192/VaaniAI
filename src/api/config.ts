// Where the backend lives. Every request goes to `${API_BASE_URL}/...`.
// For a local backend on the Android emulator use 'http://10.0.2.2:4000/api'.
export const API_BASE_URL = 'https://vaani-api-black.vercel.app/api';

export const REQUEST_TIMEOUT_MS = 20_000;
/** Upload + speech-to-text + AI reading; normally ~2 s, allow for slow mobile data. */
export const VOICE_TIMEOUT_MS = 60_000;
