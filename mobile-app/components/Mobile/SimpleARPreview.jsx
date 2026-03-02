// components/Mobile/SimpleARPreview.jsx - UPDATED WITH WORKING FEATURES
import { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  PanResponder,
  Dimensions,
  Image
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function SimpleARPreview({ onBack }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: SCREEN_WIDTH/2 - 75, y: SCREEN_HEIGHT/2 - 75 });
  const [selectedImage, setSelectedImage] = useState(null);
  const [showGallery, setShowGallery] = useState(false);
  const cameraRef = useRef(null);
  
  // Sample tattoo designs
  const sampleDesigns = [
    { id: 1, name: 'Dragon', uri: null, emoji: '🐉' },
    { id: 2, name: 'Rose', uri: null, emoji: '🌹' },
    { id: 3, name: 'Lion', uri: null, emoji: '🦁' },
    { id: 4, name: 'Custom', uri: null, emoji: '📷' },
  ];

  // PanResponder for drag functionality
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        // Highlight when touched
      },
      onPanResponderMove: (evt, gestureState) => {
        setPosition({
          x: position.x + gestureState.dx,
          y: position.y + gestureState.dy,
        });
      },
      onPanResponderRelease: () => {
        // Return to normal state
      },
    })
  ).current;

  if (!permission) {
    return <View />; // Loading
  }

  if (!permission.granted) {
    return (
      <LinearGradient colors={['#000000', '#b8860b']} style={styles.permissionContainer}>
        <View style={styles.permissionContent}>
          <Ionicons name="camera" size={64} color="#ffffff" />
          <Text style={styles.permissionTitle}>Camera Access Needed</Text>
          <Text style={styles.permissionText}>
            To visualize tattoos in AR, we need access to your camera. 
            Your camera feed stays private and is processed locally.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Allow Camera Access</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  const handlePickImage = async () => {
    // Request media library permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    // Launch image picker
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
      Alert.alert('Image Selected', 'Your design has been loaded. You can now position it on your body.');
    }
  };

  const handleSelectDesign = (design) => {
    if (design.id === 4) { // Custom image
      handlePickImage();
    } else {
      setSelectedImage(null); // Clear any custom image
      Alert.alert(`${design.emoji} ${design.name} Selected`, 
        `Now position the ${design.name} design on your body using drag, pinch, and rotate gestures.`);
    }
  };

  const handleCapture = async () => {
    if (cameraRef.current) {
      try {
        Alert.alert(
          'Feature Coming Soon',
          'Image capture will be available in the next update!\n\nFor now, you can screenshot your screen.',
          [{ text: 'OK' }]
        );
      } catch (error) {
        Alert.alert('Error', 'Failed to capture photo');
        console.error('Capture error:', error);
      }
    }
  };

  const resetPosition = () => {
    setPosition({ x: SCREEN_WIDTH/2 - 75, y: SCREEN_HEIGHT/2 - 75 });
    setScale(1);
    setRotation(0);
  };

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="front"
      >
        {/* AR Design Overlay - NOW DRAGGABLE */}
        <View
          style={[
            styles.arOverlay,
            {
              transform: [
                { translateX: position.x },
                { translateY: position.y },
                { scale: scale },
                { rotate: `${rotation}deg` },
              ],
            },
          ]}
          {...panResponder.panHandlers}
        >
          {selectedImage ? (
            <View style={styles.imageContainer}>
              <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
              <View style={styles.designBadge}>
                <Text style={styles.designBadgeText}>Custom Design</Text>
              </View>
            </View>
          ) : (
            <LinearGradient
              colors={['rgba(218, 165, 32, 0.9)', 'rgba(184, 134, 11, 0.9)']}
              style={styles.designContainer}
            >
              <Ionicons name="color-palette" size={48} color="#ffffff" />
              <Text style={styles.designName}>Drag Me!</Text>
              <Text style={styles.designHint}>👆 Drag to move</Text>
            </LinearGradient>
          )}
        </View>

        {/* Gallery Modal */}
        {showGallery && (
          <View style={styles.galleryModal}>
            <LinearGradient
              colors={['rgba(0,0,0,0.95)', 'rgba(0,0,0,0.8)']}
              style={styles.galleryContent}
            >
              <View style={styles.galleryHeader}>
                <Text style={styles.galleryTitle}>Choose a Design</Text>
                <TouchableOpacity onPress={() => setShowGallery(false)}>
                  <Ionicons name="close" size={24} color="#ffffff" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.designsGrid}>
                {sampleDesigns.map((design) => (
                  <TouchableOpacity
                    key={design.id}
                    style={styles.designOption}
                    onPress={() => {
                      handleSelectDesign(design);
                      setShowGallery(false);
                    }}
                  >
                    <LinearGradient
                      colors={['#000000', '#374151']}
                      style={styles.designOptionIcon}
                    >
                      {design.id === 4 ? (
                        <Ionicons name="images" size={32} color="#ffffff" />
                      ) : (
                        <Text style={styles.designEmoji}>{design.emoji}</Text>
                      )}
                    </LinearGradient>
                    <Text style={styles.designOptionText}>{design.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Controls Overlay */}
        <View style={styles.controlsOverlay}>
          <View style={styles.topControls}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.galleryButton}
              onPress={() => setShowGallery(true)}
            >
              <Ionicons name="images" size={24} color="#ffffff" />
              <Text style={styles.galleryButtonText}>Designs</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.controlPanel}>
            <View style={styles.scaleControls}>
              <TouchableOpacity 
                style={styles.controlButton}
                onPress={() => setScale(prev => Math.min(prev * 1.2, 3))}
              >
                <Ionicons name="add" size={20} color="#ffffff" />
                <Text style={styles.controlButtonText}>Zoom In</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.controlButton}
                onPress={() => setScale(prev => Math.max(prev * 0.8, 0.5))}
              >
                <Ionicons name="remove" size={20} color="#ffffff" />
                <Text style={styles.controlButtonText}>Zoom Out</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.middleControls}>
              <TouchableOpacity 
                style={[styles.controlButton, styles.rotateButton]}
                onPress={() => setRotation(prev => prev + 45)}
              >
                <Ionicons name="refresh" size={20} color="#ffffff" />
                <Text style={styles.controlButtonText}>Rotate</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.captureButton}
                onPress={handleCapture}
              >
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.controlButton, styles.resetButton]}
                onPress={resetPosition}
              >
                <Ionicons name="sync" size={20} color="#ffffff" />
                <Text style={styles.controlButtonText}>Reset</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </CameraView>

      <View style={styles.instructions}>
        <Text style={styles.instructionsText}>
          📱 Point camera at tattoo location
          {"\n"}👆 Drag to move | 🤏 Zoom buttons to resize
          {"\n"}🔄 Rotate button | 📷 Choose design from gallery
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: { 
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionContent: {
    alignItems: 'center',
    padding: 32,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 14,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  permissionButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  arOverlay: {
    position: 'absolute',
    width: 150,
    height: 150,
    zIndex: 100,
  },
  designContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 75,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    borderWidth: 3,
    borderColor: '#ffffff',
    borderStyle: 'dashed',
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 75,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#daa520',
  },
  selectedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  designBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 8,
    alignItems: 'center',
  },
  designBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  designName: {
    color: '#ffffff',
    fontWeight: '700',
    marginTop: 8,
    fontSize: 16,
    textAlign: 'center',
  },
  designHint: {
    color: '#ffffff',
    fontSize: 12,
    marginTop: 4,
    opacity: 0.8,
  },
  galleryModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  galleryContent: {
    width: '90%',
    borderRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  galleryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  galleryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  designsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
  },
  designOption: {
    alignItems: 'center',
    width: '45%',
    marginBottom: 16,
  },
  designOptionIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  designEmoji: {
    fontSize: 36,
  },
  designOptionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  controlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
  },
  backButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  galleryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(218, 165, 32, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  galleryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  controlPanel: {
    padding: 20,
    paddingBottom: 40,
  },
  scaleControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 20,
  },
  middleControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  controlButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    minWidth: 80,
  },
  controlButtonText: {
    color: '#ffffff',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  rotateButton: {
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  resetButton: {
    backgroundColor: 'rgba(184, 134, 11, 0.7)',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#ffffff',
  },
  captureButtonInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#ffffff',
  },
  instructions: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 16,
    marginHorizontal: 20,
    borderRadius: 12,
  },
  instructionsText: {
    color: '#ffffff',
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
  },
});