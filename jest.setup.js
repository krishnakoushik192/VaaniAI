/* eslint-env jest */
// Native modules don't exist under Jest: replace them with in-memory fakes.

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest'));

jest.mock('react-native-nitro-sound', () => {
  const sound = {
    startRecorder: jest.fn(async () => 'file:///data/user/0/com.vanniai/files/sound_1.mp4'),
    stopRecorder: jest.fn(async () => 'file:///data/user/0/com.vanniai/files/sound_1.mp4'),
    pauseRecorder: jest.fn(async () => 'paused'),
    resumeRecorder: jest.fn(async () => 'resumed'),
    setSubscriptionDuration: jest.fn(),
    addRecordBackListener: jest.fn(),
    removeRecordBackListener: jest.fn(),
    startPlayer: jest.fn(async () => 'playing'),
    stopPlayer: jest.fn(async () => 'stopped'),
    addPlaybackEndListener: jest.fn(),
    removePlaybackEndListener: jest.fn(),
    addPlayBackListener: jest.fn(),
    removePlayBackListener: jest.fn(),
  };
  return {
    __esModule: true,
    default: sound,
    AudioSourceAndroidType: { MIC: 1 },
    OutputFormatAndroidType: { MPEG_4: 2, AAC_ADTS: 6 },
    AudioEncoderAndroidType: { AAC: 3 },
  };
});
