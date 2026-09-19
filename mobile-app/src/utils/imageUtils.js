import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Handle aggressive image compression based on file size.
 * > 5MB = 0.3 quality, > 1MB = 0.5 quality.
 */
const processAndCompressImage = async (uri) => {
    try {
        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (!fileInfo.exists) return uri;

        const sizeMB = fileInfo.size / (1024 * 1024);
        let quality = 1.0;

        if (sizeMB > 5) {
            quality = 0.3;
        } else if (sizeMB > 1) {
            quality = 0.5;
        }

        if (quality < 1.0) {
            const manipResult = await ImageManipulator.manipulateAsync(
                uri,
                [], // no resizing on mobile for now, just quality change
                { compress: quality, format: ImageManipulator.SaveFormat.JPEG, base64: true }
            );
            return `data:image/jpeg;base64,${manipResult.base64}`;
        }

        // If no compression is needed, we still need the base64 string
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        return `data:image/jpeg;base64,${base64}`;
    } catch (e) {
        console.error("Compression error:", e);
        return null; // fallback or error
    }
};

/**
 * Helper to show an ActionSheet to choose between Camera or Gallery.
 * Automatically handles permissions and compression.
 */
export const pickImageWithCompression = (onSuccess, onError, options = {}) => {
    Alert.alert('Select Photo', 'Choose how you want to add a photo', [
        {
            text: 'Take Photo',
            onPress: async () => {
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') {
                    if (onError) onError('Camera access is required to take photos.');
                    return;
                }
                const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 1, ...options });
                if (!result.canceled) {
                    const compressedBase64 = await processAndCompressImage(result.assets[0].uri);
                    if (compressedBase64 && onSuccess) onSuccess(compressedBase64);
                }
            }
        },
        {
            text: 'Choose from Gallery',
            onPress: async () => {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                    if (onError) onError('Photo library access is required.');
                    return;
                }
                const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: true, quality: 1, ...options });
                if (!result.canceled) {
                    const compressedBase64 = await processAndCompressImage(result.assets[0].uri);
                    if (compressedBase64 && onSuccess) onSuccess(compressedBase64);
                }
            }
        },
        { text: 'Cancel', style: 'cancel' }
    ]);
};
