import React from 'react';
import { useState, useRef, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import { loadPoseModel, detectPose } from '../../src/utils/poseDetection';
import { cameraWithTensors } from '@tensorflow/tfjs-react-native';

// Patch: inject legacy Constants that tfjs-react-native's HOC needs.
// Expo 55 removed Camera.Constants entirely, so we wrap CameraView.
class CameraViewWithConstants extends React.Component {
  static Constants = {
    Type: { back: 'back', front: 'front' },
  };
  render() {
    return <CameraView {...this.props} />;
  }
}

const TensorCamera = cameraWithTensors(CameraViewWithConstants);
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function SimpleARPreview({ onBack }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [showGallery, setShowGallery] = useState(false);
  const [tfReady, setTfReady] = useState(false);
  const [isTracking, setIsTracking] = useState(false);

  const cameraRef = useRef(null);
  const rightMeshRef = useRef(null);  // Right arm cylinder
  const leftMeshRef = useRef(null);   // Left arm cylinder
  const materialRef = useRef(null);
  const renderReqRef = useRef(null);
  const detectorRef = useRef(null);
  const lastPoseRef = useRef(null);

  const sampleDesigns = [
    { id: 1, name: 'Dragon', uri: null, emoji: '🐉' },
    { id: 2, name: 'Rose', uri: null, emoji: '🌹' },
    { id: 3, name: 'Lion', uri: null, emoji: '🦁' },
    { id: 4, name: 'Custom', uri: null, emoji: '📷' },
  ];

  // Initialize TensorFlow + Pose Model
  useEffect(() => {
    const initAR = async () => {
      try {
        const detector = await loadPoseModel();
        detectorRef.current = detector;
        setTfReady(true);
      } catch (err) {
        console.warn('TFJS initialization warning:', err);
      }
    };
    initAR();
  }, []);

  // Frame processing loop from TensorCamera
  const handleCameraStream = (images) => {
    const loop = async () => {
      if (!tfReady || !detectorRef.current) {
        requestAnimationFrame(loop);
        return;
      }
      const imageTensor = images.next().value;
      if (imageTensor) {
        const armPose = await detectPose(detectorRef.current, imageTensor);
        lastPoseRef.current = armPose;
        setIsTracking(!!armPose?.active);
        tf.dispose(imageTensor);
      }
      requestAnimationFrame(loop);
    };
    loop();
  };

  // Three.js 3D Scene
  const onContextCreate = async (gl) => {
    const { drawingBufferWidth: width, drawingBufferHeight: height } = gl;
    const scene = new THREE.Scene();
    const renderer = new Renderer({ gl, antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 5;

    // Build a reusable arm cylinder factory
    const makeArmMesh = () => {
      const geo = new THREE.CylinderGeometry(0.5, 0.4, 3, 32);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xdaa520, wireframe: true, transparent: true, opacity: 0.5,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      scene.add(mesh);
      return mesh;
    };

    const rightMesh = makeArmMesh();
    const leftMesh  = makeArmMesh();
    rightMeshRef.current = rightMesh;
    leftMeshRef.current  = leftMesh;
    materialRef.current  = rightMesh.material; // For texture apply

    // Convert MoveNet pixel coords (0-256) → Three.js world space
    const mapTo3D = (kp) => {
      const ndcX = (kp.x / 256) * 2 - 1;
      const ndcY = -((kp.y / 256) * 2 - 1);
      return new THREE.Vector3(ndcX * 2 * (width / height), ndcY * 2, 0);
    };

    // Helper: place a cylinder from pointA to pointB
    const positionArm = (mesh, a, b) => {
      if (!a || !b) { mesh.visible = false; return; }
      const vA = mapTo3D(a);
      const vB = mapTo3D(b);
      const dir = new THREE.Vector3().subVectors(vB, vA);
      const len = dir.length();
      const lerpF = 0.2;
      const mid = new THREE.Vector3().lerpVectors(vA, vB, 0.5);
      mesh.position.lerp(mid, lerpF);
      const q = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0), dir.clone().normalize()
      );
      mesh.quaternion.slerp(q, lerpF);
      mesh.scale.y = THREE.MathUtils.lerp(mesh.scale.y, len / 3, lerpF);
      mesh.visible = true;
    };

    const render = () => {
      renderReqRef.current = requestAnimationFrame(render);
      const arm = lastPoseRef.current;

      if (arm && arm.active) {
        // Right arm: shoulder→elbow + elbow→wrist (two segments for full sleeve)
        if (arm.right) {
          positionArm(rightMesh, arm.right.elbow, arm.right.wrist);
        } else {
          rightMesh.visible = false;
        }
        // Left arm
        if (arm.left) {
          positionArm(leftMesh, arm.left.elbow, arm.left.wrist);
        } else {
          leftMesh.visible = false;
        }
      } else {
        rightMesh.visible = false;
        leftMesh.visible  = false;
      }
      renderer.render(scene, camera);
      gl.endFrameEXP();
    };
    render();
  };

  useEffect(() => {
    return () => { if (renderReqRef.current) cancelAnimationFrame(renderReqRef.current); };
  }, []);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'We need camera roll access to load your tattoo design.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 1,
    });
    if (!result.canceled) {
      applyTattooTextureToMesh(result.assets[0].uri);
    }
  };

  const handleSelectDesign = (design) => {
    if (design.id === 4) {
      handlePickImage();
    } else {
      if (materialRef.current) {
        materialRef.current.wireframe = false;
        materialRef.current.color.setHex(0xdaa520);
      }
      Alert.alert(`${design.emoji} ${design.name} Selected`, 'Design applied to your 3D body tracker!');
    }
  };

  const applyTattooTextureToMesh = (uri) => {
    // Apply texture to both arm meshes
    const meshes = [rightMeshRef.current, leftMeshRef.current].filter(Boolean);
    if (!meshes.length || !uri) return;
    if (uri.startsWith('http') || uri.startsWith('file') || uri.startsWith('content')) {
      const loader = new THREE.TextureLoader();
      loader.load(
        uri,
        (texture) => {
          meshes.forEach(m => {
            m.material.map = texture;
            m.material.wireframe = false;
            m.material.opacity = 0.85;
            m.material.transparent = true;
            m.material.color.setHex(0xffffff);
            m.material.needsUpdate = true;
          });
          Alert.alert('AR Texture Active', 'Tattoo design applied to both arms!');
        },
        undefined,
        (err) => {
          console.error('Texture loading error:', err);
          meshes.forEach(m => {
            m.material.wireframe = false;
            m.material.color.setHex(0xdaa520);
          });
        }
      );
    } else {
      meshes.forEach(m => {
        m.material.wireframe = false;
        m.material.color.setHex(0xdaa520);
      });
    }
  };

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <LinearGradient colors={['#000000', '#b8860b']} style={styles.permissionContainer}>
        <View style={styles.permissionContent}>
          <Ionicons name="camera" size={64} color="#ffffff" />
          <Text style={styles.permissionTitle}>Camera Access Needed</Text>
          <Text style={styles.permissionText}>
            To visualize tattoos in AR, we need access to your camera.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Allow Camera Access</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.container}>
      {/* Layer 1: Camera + Tensor Feed */}
      <TensorCamera
        ref={cameraRef}
        style={styles.camera}
        type="front"
        facing="front"
        autorender={true}
        resizeWidth={256}
        resizeHeight={256}
        resizeDepth={3}
        onReady={handleCameraStream}
      />

      {/* Layer 2: Three.js 3D Overlay (zIndex 15, above HOC's internal GLView at 10) */}
      <GLView style={[StyleSheet.absoluteFill, { zIndex: 15 }]} onContextCreate={onContextCreate} />

      {/* Layer 3: Calibration HUD (zIndex 20) */}
      {!isTracking && tfReady && (
        <View style={styles.calibrationOverlay}>
          <View style={styles.armOutline}>
            <View style={styles.elbowCircle} />
            <View style={styles.armBeam} />
            <View style={styles.wristCircle} />
          </View>
          <Text style={styles.calibrationText}>Align your arm within the outline</Text>
        </View>
      )}

      <View style={styles.statusBadge}>
        <View style={[styles.statusDot, {
          backgroundColor: !tfReady ? '#f59e0b' : (isTracking ? '#10b981' : '#ef4444')
        }]} />
        <Text style={styles.statusText}>
          {!tfReady
            ? 'Loading AI Model...'
            : (isTracking
              ? `✓ Arm${lastPoseRef.current?.right && lastPoseRef.current?.left ? 's' : ''} Tracked`
              : 'Point camera at your arm')}
        </Text>
      </View>

      {/* Layer 5: Gallery Modal (zIndex 1000) */}
      {showGallery && (
        <View style={styles.galleryModal}>
          <LinearGradient colors={['rgba(0,0,0,0.95)', 'rgba(0,0,0,0.8)']} style={styles.galleryContent}>
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
                  onPress={() => { handleSelectDesign(design); setShowGallery(false); }}
                >
                  <LinearGradient colors={['#000000', '#374151']} style={styles.designOptionIcon}>
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

      {/* Layer 6: Controls (zIndex 30 — topmost) */}
      <View style={styles.controlsOverlay}>
        <View style={styles.topControls}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.galleryButton} onPress={() => setShowGallery(true)}>
            <Ionicons name="images" size={24} color="#ffffff" />
            <Text style={styles.galleryButtonText}>Library</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.instructions}>
          <Text style={styles.instructionsText}>
            📱 Point camera at your arm{"\n"}📷 Tap Library to pick a tattoo design
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  camera: { flex: 1 },
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  permissionContent: { alignItems: 'center', padding: 32 },
  permissionTitle: { fontSize: 24, fontWeight: '700', color: '#ffffff', marginTop: 16, marginBottom: 8 },
  permissionText: { fontSize: 14, color: '#ffffff', textAlign: 'center', marginBottom: 32, lineHeight: 20 },
  permissionButton: { backgroundColor: '#ffffff', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 12 },
  permissionButtonText: { fontSize: 16, fontWeight: '600', color: '#000000' },
  // ZIndex layers: HOC's GLView=10 | Three.js GLView=15 | calibration=20 | status=25 | controls=30 | gallery=1000
  calibrationOverlay: {
    ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)', zIndex: 20,
  },
  armOutline: { width: 100, height: 300, alignItems: 'center', opacity: 0.7 },
  elbowCircle: { width: 30, height: 30, borderRadius: 15, borderWidth: 3, borderColor: '#daa520', borderStyle: 'dashed' },
  armBeam: { width: 40, height: 180, borderLeftWidth: 2, borderRightWidth: 2, borderColor: '#daa520', borderStyle: 'dashed', marginVertical: 5 },
  wristCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 3, borderColor: '#daa520', borderStyle: 'dashed' },
  calibrationText: {
    color: '#daa520', marginTop: 20, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 1, fontSize: 12, backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 4,
  },
  statusBadge: {
    position: 'absolute', top: 60, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    flexDirection: 'row', alignItems: 'center', gap: 6, zIndex: 25,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: 'white', fontSize: 12, fontWeight: '600' },
  galleryModal: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center', zIndex: 1000,
  },
  galleryContent: { width: '90%', borderRadius: 24, padding: 24, maxHeight: '80%' },
  galleryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  galleryTitle: { fontSize: 20, fontWeight: '700', color: '#ffffff' },
  designsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16 },
  designOption: { alignItems: 'center', width: '45%', marginBottom: 16 },
  designOptionIcon: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  designEmoji: { fontSize: 36 },
  designOptionText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  controlsOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'space-between', zIndex: 30,
  },
  topControls: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, paddingTop: 60 },
  backButton: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
  },
  galleryButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(218, 165, 32, 0.85)',
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 25, gap: 8,
  },
  galleryButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  instructions: {
    marginBottom: 40, backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 16, marginHorizontal: 20, borderRadius: 12,
  },
  instructionsText: { color: '#ffffff', textAlign: 'center', fontSize: 12, lineHeight: 18 },
});