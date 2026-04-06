import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import * as poseDetection from '@tensorflow-models/pose-detection';

export const initTF = async () => {
  await tf.ready();
  console.log('TFJS is ready for AR Tracking');
};

export const loadPoseModel = async () => {
  await initTF();
  const model = poseDetection.SupportedModels.MoveNet;
  const detectorConfig = {
    modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
    enableSmoothing: true,
  };
  const detector = await poseDetection.createDetector(model, detectorConfig);
  console.log('MoveNet SinglePose Model Loaded');
  return detector;
};

// Process a single frame and return arm coordinates
export const detectPose = async (detector, tensor) => {
  if (!detector || !tensor) return { active: false };
  try {
    const poses = await detector.estimatePoses(tensor, {
      maxPoses: 1,
      flipHorizontal: false,
    });
    return getAllArmKeypoints(poses);
  } catch (err) {
    console.error('Pose estimation error:', err);
    return { active: false };
  }
};

// Returns BOTH arms independently for full-sleeve support
export const getAllArmKeypoints = (pose) => {
  if (!pose || pose.length === 0) return { active: false };
  const keypoints = pose[0].keypoints;

  // Per-keypoint minimum confidence. Lowered to 0.25 so mobile cameras can trigger.
  const MIN_SCORE = 0.25;

  const kp = (name) => {
    const point = keypoints.find(k => k.name === name);
    return (point && point.score >= MIN_SCORE) ? point : null;
  };

  const rightShoulder = kp('right_shoulder');
  const rightElbow    = kp('right_elbow');
  const rightWrist    = kp('right_wrist');

  const leftShoulder  = kp('left_shoulder');
  const leftElbow     = kp('left_elbow');
  const leftWrist     = kp('left_wrist');

  // An arm segment is valid if we can see at least elbow + wrist
  const rightValid = !!(rightElbow && rightWrist);
  const leftValid  = !!(leftElbow  && leftWrist);

  if (!rightValid && !leftValid) return { active: false };

  return {
    active: true,
    // Right arm (forearm = elbow→wrist, full arm = shoulder→wrist)
    right: rightValid ? {
      shoulder: rightShoulder,
      elbow: rightElbow,
      wrist: rightWrist,
    } : null,
    // Left arm
    left: leftValid ? {
      shoulder: leftShoulder,
      elbow: leftElbow,
      wrist: leftWrist,
    } : null,
  };
};

// Legacy single-arm getter kept for backwards compatibility
export const getArmKeypoints = getAllArmKeypoints;
