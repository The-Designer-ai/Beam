import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

type ScreenBroadcastModule = {
  startBroadcast: () => void;
};

const nativeModule = NativeModules.VideosdkRPK as ScreenBroadcastModule | undefined;

export async function openIOSScreenBroadcastPicker(timeoutMs = 45_000): Promise<void> {
  if (Platform.OS !== 'ios') return;
  if (!nativeModule?.startBroadcast) {
    throw new Error('The Beam screen broadcast module is unavailable in this build.');
  }

  const emitter = new NativeEventEmitter(NativeModules.VideosdkRPK);

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      subscription.remove();
      error ? reject(error) : resolve();
    };
    const subscription = emitter.addListener('onScreenShare', (status: string) => {
      if (status === 'START_BROADCAST') finish();
      if (status === 'STOP_BROADCAST') finish(new Error('Screen broadcasting was stopped.'));
    });
    const timeout = setTimeout(() => {
      finish(new Error('The screen broadcast was not started. Open the picker and try again.'));
    }, timeoutMs);

    try {
      nativeModule.startBroadcast();
    } catch (error) {
      finish(error instanceof Error ? error : new Error('Could not open the iOS screen picker.'));
    }
  });
}
