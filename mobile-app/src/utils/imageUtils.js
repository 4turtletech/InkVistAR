import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

// Normalize camera and gallery assets to a bounded JPEG before sending them as
// base64. SDK 54's FileSystem.getInfoAsync/readAsStringAsync exports throw at runtime.
const processAndCompressImage = async (asset) => {
    const longestSide = Math.max(asset.width || 0, asset.height || 0);
    const actions = longestSide > 1600
        ? [{ resize: asset.width >= asset.height ? { width: 1600 } : { height: 1600 } }]
        : [];
    const result = await ImageManipulator.manipulateAsync(asset.uri, actions, {
        compress: 0.7,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
    });
    if (!result.base64) throw new Error('The selected photo could not be prepared. Please try another photo.');
    return `data:image/jpeg;base64,${result.base64}`;
};

const selectImage = async (source, onSuccess, onError, options = {}) => {
    try {
        if (source === 'camera') {
            const permission = await ImagePicker.requestCameraPermissionsAsync();
            if (!permission.granted) {
                onError?.('Allow camera access in your device settings to take a photo.');
                return;
            }
        }

        const pickerOptions = { mediaTypes: ['images'], allowsEditing: true, quality: 1, ...options };
        const result = source === 'camera'
            ? await ImagePicker.launchCameraAsync(pickerOptions)
            : await ImagePicker.launchImageLibraryAsync(pickerOptions);
        if (result.canceled) return;
        const asset = result.assets?.[0];
        if (!asset?.uri) throw new Error('No photo was selected. Please try again.');
        onSuccess?.(await processAndCompressImage(asset));
    } catch (error) {
        console.error('Photo selection failed:', error);
        onError?.(error?.message || 'Could not add the photo. Please try again.');
    }
};

export const takeImageWithCompression = (onSuccess, onError, options) =>
    selectImage('camera', onSuccess, onError, options);

export const chooseImageWithCompression = (onSuccess, onError, options) =>
    selectImage('gallery', onSuccess, onError, options);

export const pickImageWithCompression = (onSuccess, onError, options = {}) => {
    Alert.alert('Select Photo', 'Choose how you want to add a photo', [
        { text: 'Take Photo', onPress: () => takeImageWithCompression(onSuccess, onError, options) },
        { text: 'Choose from Gallery', onPress: () => chooseImageWithCompression(onSuccess, onError, options) },
        { text: 'Cancel', style: 'cancel' },
    ]);
};
