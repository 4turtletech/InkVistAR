import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

const nativeModule = Platform.OS === 'ios'
  ? requireOptionalNativeModule('TattooAR')
  : null;

export function getTattooARCapabilities() {
  if (!nativeModule) {
    return { osSupported: false, lidar: false, faceTracking: false, bodyTracking: false };
  }

  return nativeModule.getCapabilities();
}

export async function presentTattooAR(mode) {
  if (Platform.OS !== 'ios') {
    throw new Error('The AR tattoo preview is available only on iOS.');
  }

  if (!nativeModule) {
    throw new Error('The iOS AR module is missing. Install a new native development build of InkVistAR.');
  }

  await nativeModule.present(mode);
}
