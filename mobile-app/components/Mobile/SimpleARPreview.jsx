import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Image } from 'react-native';
import { Camera, useCameraDevice, VisionCameraProxy } from 'react-native-vision-camera';
import { useFrameProcessor } from 'react-native-vision-camera';
import { useRunOnJS } from 'react-native-worklets-core';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Line } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Native frame processor plugin
const posePlugin = VisionCameraProxy.initFrameProcessorPlugin('detectPose', {});

// Body segment definitions: [landmarkA, landmarkB]
// Each also has optional rotation reference landmarks to estimate 3D rotation
const BODY_SEGMENTS = {
  'L Forearm':    { pts: ['leftElbowPosition',    'leftWristPosition'],   rot: ['leftPinkyPosition', 'leftThumbPosition'] },
  'R Forearm':    { pts: ['rightElbowPosition',   'rightWristPosition'],  rot: ['rightPinkyPosition', 'rightThumbPosition'] },
  'L Upper Arm':  { pts: ['leftShoulderPosition', 'leftElbowPosition'],   rot: ['leftShoulderPosition', 'leftElbowPosition'] },
  'R Upper Arm':  { pts: ['rightShoulderPosition','rightElbowPosition'],  rot: ['rightShoulderPosition', 'rightElbowPosition'] },
  'Chest':        { pts: ['leftShoulderPosition', 'rightShoulderPosition'], rot: null },
  'Upper Back':   { pts: ['leftShoulderPosition', 'rightShoulderPosition'], rot: null },
  'Lower Back':   { pts: ['leftHipPosition',      'rightHipPosition'],    rot: null },
  'L Thigh':      { pts: ['leftHipPosition',      'leftKneePosition'],   rot: null },
  'R Thigh':      { pts: ['rightHipPosition',     'rightKneePosition'],  rot: null },
  'L Shin':       { pts: ['leftKneePosition',     'leftAnklePosition'],  rot: null },
  'R Shin':       { pts: ['rightKneePosition',    'rightAnklePosition'], rot: null },
};

const SEGMENT_ICONS = {
  'L Forearm': 'hand-left', 'R Forearm': 'hand-right',
  'L Upper Arm': 'fitness', 'R Upper Arm': 'fitness',
  'Chest': 'body', 'Upper Back': 'body', 'Lower Back': 'body',
  'L Thigh': 'walk', 'R Thigh': 'walk',
  'L Shin': 'footsteps', 'R Shin': 'footsteps',
};

// Skeleton connections for debug overlay — body
const SKELETON_CONNECTIONS = [
  ['leftShoulderPosition', 'rightShoulderPosition'],
  ['leftShoulderPosition', 'leftElbowPosition'],
  ['leftElbowPosition', 'leftWristPosition'],
  ['rightShoulderPosition', 'rightElbowPosition'],
  ['rightElbowPosition', 'rightWristPosition'],
  ['leftShoulderPosition', 'leftHipPosition'],
  ['rightShoulderPosition', 'rightHipPosition'],
  ['leftHipPosition', 'rightHipPosition'],
  ['leftHipPosition', 'leftKneePosition'],
  ['leftKneePosition', 'leftAnklePosition'],
  ['rightHipPosition', 'rightKneePosition'],
  ['rightKneePosition', 'rightAnklePosition'],
  // Feet
  ['leftAnklePosition', 'leftHeelPosition'],
  ['leftAnklePosition', 'leftFootIndexPosition'],
  ['leftHeelPosition', 'leftFootIndexPosition'],
  ['rightAnklePosition', 'rightHeelPosition'],
  ['rightAnklePosition', 'rightFootIndexPosition'],
  ['rightHeelPosition', 'rightFootIndexPosition'],
];

// Finger / hand skeleton connections — drawn in a distinct color
const FINGER_CONNECTIONS = [
  // Left hand: wrist → each fingertip
  ['leftWristPosition', 'leftThumbPosition'],
  ['leftWristPosition', 'leftIndexPosition'],
  ['leftWristPosition', 'leftPinkyPosition'],
  // Left hand: inter-finger spans (palm outline)
  ['leftThumbPosition', 'leftIndexPosition'],
  ['leftIndexPosition', 'leftPinkyPosition'],
  // Right hand: wrist → each fingertip
  ['rightWristPosition', 'rightThumbPosition'],
  ['rightWristPosition', 'rightIndexPosition'],
  ['rightWristPosition', 'rightPinkyPosition'],
  // Right hand: inter-finger spans (palm outline)
  ['rightThumbPosition', 'rightIndexPosition'],
  ['rightIndexPosition', 'rightPinkyPosition'],
];

const LANDMARK_KEYS = [
  'nosePosition',
  'leftEyeInnerPosition', 'leftEyePosition', 'leftEyeOuterPosition',
  'rightEyeInnerPosition', 'rightEyePosition', 'rightEyeOuterPosition',
  'leftEarPosition', 'rightEarPosition',
  'leftMouthPosition', 'rightMouthPosition',
  'leftShoulderPosition', 'rightShoulderPosition',
  'leftElbowPosition', 'rightElbowPosition',
  'leftWristPosition', 'rightWristPosition',
  'leftPinkyPosition', 'rightPinkyPosition',
  'leftIndexPosition', 'rightIndexPosition',
  'leftThumbPosition', 'rightThumbPosition',
  'leftHipPosition', 'rightHipPosition',
  'leftKneePosition', 'rightKneePosition',
  'leftAnklePosition', 'rightAnklePosition',
  'leftHeelPosition', 'rightHeelPosition',
  'leftFootIndexPosition', 'rightFootIndexPosition',
];

// Camera permissions hook
const usePermissions = () => {
  const [hasPermission, setHasPermission] = useState(false);
  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'granted');
    })();
  }, []);
  return hasPermission;
};

export function SimpleARPreview({ selectedDesign, onBack, onChangeDesign }) {
  const hasPermission = usePermissions();
  const [cameraFacing, setCameraFacing] = useState('front');
  const device = useCameraDevice(cameraFacing);
  const [poseData, setPoseData] = useState(null);
  const [frameSize, setFrameSize] = useState({ width: 640, height: 480 });
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState('R Forearm');
  const [tattooOpacity, setTattooOpacity] = useState(0.85);
  const [tattooScale, setTattooScale] = useState(1.0);
  const [showControls, setShowControls] = useState(false);
  const [prevTattooPos, setPrevTattooPos] = useState(null);
  const isFront = cameraFacing === 'front';

  const handlePoseResult = useCallback((resultJson) => {
    try {
      const result = JSON.parse(resultJson);
      if (result.pose) {
        setPoseData(result.pose);
        setFrameSize({ width: result.fw, height: result.fh });
      } else {
        setPoseData(null);
      }
    } catch (e) {
      setPoseData(null);
    }
  }, []);

  const sendToJs = useRunOnJS(handlePoseResult, [handlePoseResult]);

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    try {
      if (posePlugin == null) return;
      const pose = posePlugin.call(frame, { mode: 'stream' });
      const fw = frame.width;
      const fh = frame.height;
      if (pose && Object.keys(pose).length > 0) {
        sendToJs(JSON.stringify({ pose, fw, fh }));
      } else {
        sendToJs(JSON.stringify({ pose: null, fw, fh }));
      }
    } catch (e) {
      sendToJs(JSON.stringify({ pose: null, fw: 0, fh: 0 }));
    }
  }, [sendToJs]);

  // Coordinate scaling (MLKit portrait coords → screen)
  const scalePoint = (pt) => {
    if (!pt || pt.x === undefined || pt.y === undefined) return null;
    const virtualW = frameSize.height;
    const virtualH = frameSize.width;
    const scale = Math.max(SCREEN_WIDTH / virtualW, SCREEN_HEIGHT / virtualH);
    const offsetX = (virtualW * scale - SCREEN_WIDTH) / 2;
    const offsetY = (virtualH * scale - SCREEN_HEIGHT) / 2;
    let sx = pt.x * scale - offsetX;
    const sy = pt.y * scale - offsetY;
    if (isFront) sx = SCREEN_WIDTH - sx; // mirror only for front cam
    return { x: sx, y: sy };
  };

  // Get the tattoo position/rotation/scale for the selected body segment
  const getTattooTransform = () => {
    if (!poseData) return null;
    const segment = BODY_SEGMENTS[selectedSegment];
    if (!segment) return null;

    const rawA = poseData[segment.pts[0]];
    const rawB = poseData[segment.pts[1]];
    if (!rawA || !rawB) return null;

    const a = scalePoint(rawA);
    const b = scalePoint(rawB);
    if (!a || !b) return null;

    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const angle = Math.atan2(dy, dx);
    const segLen = Math.sqrt(dx * dx + dy * dy);

    // Estimate arm rotation (0=facing camera, 1=edge-on) using hand landmarks
    let rotationFactor = 1.0; // 1.0 = fully facing camera
    if (segment.rot) {
      const rawR1 = poseData[segment.rot[0]];
      const rawR2 = poseData[segment.rot[1]];
      if (rawR1 && rawR2) {
        const r1 = scalePoint(rawR1);
        const r2 = scalePoint(rawR2);
        if (r1 && r2) {
          // Distance between rotation reference points
          const rdx = r2.x - r1.x;
          const rdy = r2.y - r1.y;
          const refDist = Math.sqrt(rdx * rdx + rdy * rdy);
          // Normalize: when arm faces camera, thumb-pinky spread is ~15-25% of forearm length
          // When rotated edge-on, it drops to ~5% or less
          const spread = refDist / Math.max(segLen, 1);
          // Map spread to rotation: 0.2+ = facing camera, <0.05 = edge-on
          rotationFactor = Math.min(1.0, Math.max(0.15, spread / 0.2));
        }
      }
    }

    // For chest, shift midpoint down
    let finalMidY = midY;
    if (selectedSegment === 'Chest') {
      finalMidY = midY + segLen * 0.4;
    }

    // Lerp with previous position for smoothness
    let smoothX = midX;
    let smoothY = finalMidY;
    let smoothAngle = angle;
    let smoothRotation = rotationFactor;
    if (prevTattooPos) {
      const lerp = 0.35;
      smoothX = prevTattooPos.x + (midX - prevTattooPos.x) * lerp;
      smoothY = prevTattooPos.y + (finalMidY - prevTattooPos.y) * lerp;
      smoothRotation = prevTattooPos.rotation + (rotationFactor - prevTattooPos.rotation) * lerp;
      // Smooth angle (handle wrapping)
      let angleDiff = angle - prevTattooPos.angle;
      if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
      if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
      smoothAngle = prevTattooPos.angle + angleDiff * lerp;
    }

    const result = { x: smoothX, y: smoothY, angle: smoothAngle, segLen, rotation: smoothRotation };

    // Update prev position (defer to avoid re-render loop)
    setTimeout(() => setPrevTattooPos(result), 0);

    return result;
  };

  if (!hasPermission) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera" size={64} color="#daa520" />
        <Text style={styles.permissionTitle}>Camera Access Needed</Text>
        <Text style={styles.permissionText}>Grant camera permission to preview tattoos in AR.</Text>
      </View>
    );
  }

  if (device == null) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>No Camera Found</Text>
      </View>
    );
  }

  const tattooTransform = getTattooTransform();

  // Calculate tattoo image dimensions based on arm length and rotation
  const getTattooTransformStyle = () => {
    if (!tattooTransform) return null;
    const baseSize = tattooTransform.segLen * 0.75 * tattooScale;
    const size = Math.max(40, baseSize);
    // Width scales with arm rotation (narrower when edge-on)
    const widthScale = tattooTransform.rotation || 1.0;
    // Fade opacity when arm is nearly edge-on
    const rotOpacity = Math.min(1.0, (widthScale - 0.15) / 0.3);
    // Perspective-based rotateY to simulate cylinder wrapping
    const rotateYDeg = (1 - widthScale) * 45; // max 45° when edge-on

    return {
      containerStyle: {
        position: 'absolute',
        width: size,
        height: size * 1.3, // slightly taller than wide for arm proportions
        left: tattooTransform.x - size / 2,
        top: tattooTransform.y - (size * 1.3) / 2,
        opacity: tattooOpacity * Math.max(0, rotOpacity),
        transform: [
          { perspective: 400 },
          { rotate: `${tattooTransform.angle + Math.PI / 2}rad` },
          { scaleX: Math.max(0.1, widthScale) },
          { rotateY: `${rotateYDeg}deg` },
        ],
      },
      imageStyle: {
        width: '100%',
        height: '100%',
        borderRadius: size * 0.15, // round edges to follow skin curvature
      },
      // Edge shadow for curved surface illusion
      edgeShadow: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        borderRadius: size * 0.15,
        borderWidth: size * 0.06,
        borderColor: 'rgba(0,0,0,0.15)',
      },
      size,
      widthScale,
    };
  };

  const tattooRender = getTattooTransformStyle();

  // Scaled points for skeleton overlay
  const getScaledPoints = () => {
    if (!poseData) return {};
    const pts = {};
    for (const key of LANDMARK_KEYS) {
      const raw = poseData[key];
      if (raw) pts[key] = scalePoint(raw);
    }
    return pts;
  };

  const scaledPoints = showSkeleton ? getScaledPoints() : {};

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        frameProcessor={frameProcessor}
        pixelFormat="yuv"
      />

      {/* Tattoo overlay — wraps around skin with perspective */}
      {selectedDesign?.image_url && tattooRender && (
        <View style={tattooRender.containerStyle} pointerEvents="none">
          <Image
            source={{ uri: selectedDesign.image_url }}
            style={tattooRender.imageStyle}
            resizeMode="contain"
          />
          {/* Edge vignette — simulates shadow on curved surface */}
          <View style={tattooRender.edgeShadow} />
        </View>
      )}

      {/* Skeleton debug overlay */}
      {showSkeleton && poseData && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg height="100%" width="100%">
            {/* Body skeleton lines */}
            {SKELETON_CONNECTIONS.map(([from, to], i) => {
              const a = scaledPoints[from];
              const b = scaledPoints[to];
              if (!a || !b) return null;
              return (
                <Line key={`b-${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke="rgba(0,255,136,0.4)" strokeWidth="2" strokeLinecap="round" />
              );
            })}
            {/* Finger / hand skeleton lines — amber color */}
            {FINGER_CONNECTIONS.map(([from, to], i) => {
              const a = scaledPoints[from];
              const b = scaledPoints[to];
              if (!a || !b) return null;
              return (
                <Line key={`f-${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke="rgba(218,165,32,0.55)" strokeWidth="1.5" strokeLinecap="round"
                  strokeDasharray="4,3" />
              );
            })}
            {/* Body landmark dots */}
            {LANDMARK_KEYS.map((key, i) => {
              const pt = scaledPoints[key];
              if (!pt) return null;
              // Finger landmarks get a distinct amber dot + slightly larger radius
              const isFinger = key.includes('Thumb') || key.includes('Index') || key.includes('Pinky');
              return (
                <Circle key={`j-${i}`} cx={pt.x} cy={pt.y}
                  r={isFinger ? 5 : 4}
                  fill={isFinger ? 'rgba(218,165,32,0.65)' : 'rgba(16,185,129,0.5)'}
                  stroke={isFinger ? 'rgba(255,215,0,0.5)' : 'rgba(255,255,255,0.3)'}
                  strokeWidth={isFinger ? 1.5 : 1} />
              );
            })}
          </Svg>
        </View>
      )}

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.topBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>

        <View style={styles.designLabel}>
          <Text style={styles.designLabelText} numberOfLines={1}>
            {selectedDesign?.title || 'No Design'}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={styles.topBtn}
            onPress={() => {
              setCameraFacing(f => f === 'front' ? 'back' : 'front');
              setPrevTattooPos(null);
            }}
          >
            <Ionicons name="camera-reverse" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.topBtn, showSkeleton && { backgroundColor: 'rgba(16,185,129,0.6)' }]}
            onPress={() => setShowSkeleton(!showSkeleton)}
          >
            <Ionicons name="body" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.topBtn}
            onPress={() => setShowControls(!showControls)}
          >
            <Ionicons name={showControls ? 'chevron-down' : 'options'} size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Status indicator */}
      <View style={styles.statusBadge}>
        <View style={[styles.statusDot, { backgroundColor: poseData ? '#10b981' : '#ef4444' }]} />
        <Text style={styles.statusText}>
          {poseData ? `Tracking · ${selectedSegment}` : 'Point camera at body'}
        </Text>
      </View>

      {/* Bottom controls panel */}
      {showControls && (
        <View style={styles.controlsPanel}>
          {/* Body part selector */}
          <Text style={styles.controlLabel}>Placement</Text>
          <ScrollViewHorizontal segments={Object.keys(BODY_SEGMENTS)} selected={selectedSegment} onSelect={setSelectedSegment} />

          {/* Size slider */}
          <View style={styles.sliderRow}>
            <Ionicons name="resize" size={16} color="#aaa" />
            <Text style={styles.sliderLabel}>Size</Text>
            <View style={styles.sliderContainer}>
              <View style={styles.sliderTrack}>
                <View style={[styles.sliderFill, { width: `${((tattooScale - 0.3) / 2.7) * 100}%` }]} />
              </View>
              <TouchableOpacity style={styles.sliderBtn} onPress={() => setTattooScale(Math.max(0.3, tattooScale - 0.1))}>
                <Ionicons name="remove" size={16} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.sliderValue}>{Math.round(tattooScale * 100)}%</Text>
              <TouchableOpacity style={styles.sliderBtn} onPress={() => setTattooScale(Math.min(3.0, tattooScale + 0.1))}>
                <Ionicons name="add" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Opacity slider */}
          <View style={styles.sliderRow}>
            <Ionicons name="eye" size={16} color="#aaa" />
            <Text style={styles.sliderLabel}>Opacity</Text>
            <View style={styles.sliderContainer}>
              <View style={styles.sliderTrack}>
                <View style={[styles.sliderFill, { width: `${tattooOpacity * 100}%` }]} />
              </View>
              <TouchableOpacity style={styles.sliderBtn} onPress={() => setTattooOpacity(Math.max(0.1, tattooOpacity - 0.1))}>
                <Ionicons name="remove" size={16} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.sliderValue}>{Math.round(tattooOpacity * 100)}%</Text>
              <TouchableOpacity style={styles.sliderBtn} onPress={() => setTattooOpacity(Math.min(1.0, tattooOpacity + 0.1))}>
                <Ionicons name="add" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Change design button */}
          {onChangeDesign && (
            <TouchableOpacity style={styles.changeDesignBtn} onPress={onChangeDesign}>
              <Ionicons name="images" size={18} color="#daa520" />
              <Text style={styles.changeDesignText}>Change Design</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

// Horizontal scrollable body part selector
function ScrollViewHorizontal({ segments, selected, onSelect }) {
  return (
    <View style={styles.segmentRow}>
      <ScrollViewWrapper>
        {segments.map(seg => (
          <TouchableOpacity
            key={seg}
            style={[styles.segmentChip, selected === seg && styles.segmentChipActive]}
            onPress={() => onSelect(seg)}
          >
            <Ionicons
              name={SEGMENT_ICONS[seg] || 'body'}
              size={14}
              color={selected === seg ? '#000' : '#aaa'}
            />
            <Text style={[styles.segmentText, selected === seg && styles.segmentTextActive]}>
              {seg}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollViewWrapper>
    </View>
  );
}

// Wrapper since we can't import ScrollView inside function easily
function ScrollViewWrapper({ children }) {
  const { ScrollView } = require('react-native');
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingRight: 16 }}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  permissionContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#000', padding: 20,
  },
  permissionTitle: { fontSize: 22, fontWeight: '700', color: '#fff', marginTop: 16 },
  permissionText: { fontSize: 14, color: '#aaa', textAlign: 'center', marginTop: 8 },

  // Top bar
  topBar: {
    position: 'absolute', top: 0, width: '100%',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, paddingTop: 50, zIndex: 20,
  },
  topBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  designLabel: {
    flex: 1, marginHorizontal: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  designLabelText: { color: '#daa520', fontSize: 13, fontWeight: '600' },

  // Status
  statusBadge: {
    position: 'absolute', top: 110, alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', gap: 6, zIndex: 20,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '500' },

  // Controls panel
  controlsPanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(10,10,15,0.92)',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 36,
    zIndex: 20,
  },
  controlLabel: {
    fontSize: 12, fontWeight: '600', color: '#888',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
  },
  segmentRow: { marginBottom: 16 },
  segmentChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  segmentChipActive: { backgroundColor: '#daa520', borderColor: '#daa520' },
  segmentText: { fontSize: 12, color: '#aaa', fontWeight: '600' },
  segmentTextActive: { color: '#000' },

  sliderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: 12,
  },
  sliderLabel: { fontSize: 12, color: '#888', fontWeight: '500', width: 50 },
  sliderContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  sliderTrack: {
    flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2, overflow: 'hidden',
  },
  sliderFill: { height: '100%', backgroundColor: '#daa520', borderRadius: 2 },
  sliderBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  sliderValue: { fontSize: 11, color: '#daa520', fontWeight: '600', width: 36, textAlign: 'center' },

  changeDesignBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, marginTop: 4,
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(218,165,32,0.3)',
    backgroundColor: 'rgba(218,165,32,0.08)',
  },
  changeDesignText: { fontSize: 14, color: '#daa520', fontWeight: '600' },
});