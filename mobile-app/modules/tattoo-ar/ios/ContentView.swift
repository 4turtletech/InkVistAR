//
//  ContentView.swift
//  TattooAR
//
//  Created by Clarence Celis on 3/16/26.
//

import SwiftUI

fileprivate let screenScaleRatio = UIScreen.main.bounds.width / 393.0
import RealityKit
import ARKit
import PhotosUI
import Photos
import UIKit
import simd
import Vision
import AVFoundation
// DockKit deprecated — skin segmentation replaces gimbal tracking

private struct TattooConfiguration: Equatable {
    var image: UIImage?
    var bodyLocation: BodyLocation
    var bodyPartMode: BodyPartMode
    var scale: Float
    var rotationDegrees: Float
    var nudge: SIMD3<Float>
    var lockToSurface: Bool
    var smoothing: Float
    var isFrontCamera: Bool
    var bodyTrackingEnabled: Bool
    var showSkeletonOverlay: Bool
    var isRecording: Bool
    var regularModeLocked: Bool
}

private enum BodyLocation: String, CaseIterable, Identifiable {
    case leftForearm
    case rightForearm
    case leftUpperArm
    case rightUpperArm
    case chest
    case back

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .leftForearm:
            return "Left Forearm"
        case .rightForearm:
            return "Right Forearm"
        case .leftUpperArm:
            return "Left Upper Arm"
        case .rightUpperArm:
            return "Right Upper Arm"
        case .chest:
            return "Chest"
        case .back:
            return "Back"
        }
    }

    var jointName: ARSkeleton.JointName {
        switch self {
        case .leftForearm:
            return ARSkeleton.JointName(rawValue: "left_forearm_joint")
        case .rightForearm:
            return ARSkeleton.JointName(rawValue: "right_forearm_joint")
        case .leftUpperArm:
            return ARSkeleton.JointName(rawValue: "left_arm_joint")
        case .rightUpperArm:
            return ARSkeleton.JointName(rawValue: "right_arm_joint")
        case .chest:
            return ARSkeleton.JointName(rawValue: "spine_7_joint")
        case .back:
            return ARSkeleton.JointName(rawValue: "spine_7_joint")
        }
    }

    var defaultSizeMeters: CGSize {
        switch self {
        case .leftForearm, .rightForearm:
            return CGSize(width: 0.09, height: 0.05)
        case .leftUpperArm, .rightUpperArm:
            return CGSize(width: 0.11, height: 0.06)
        case .chest, .back:
            return CGSize(width: 0.14, height: 0.10)
        }
    }

    var curveRadiusMeters: Float {
        switch self {
        case .leftForearm, .rightForearm:
            return 0.04
        case .leftUpperArm, .rightUpperArm:
            return 0.05
        case .chest, .back:
            return 0.0
        }
    }

    var localOffset: SIMD3<Float> {
        switch self {
        case .leftForearm, .rightForearm, .leftUpperArm, .rightUpperArm:
            return SIMD3<Float>(0.0, 0.03, 0.025)
        case .chest:
            return SIMD3<Float>(0.0, 0.09, 0.08)
        case .back:
            return SIMD3<Float>(0.0, 0.09, -0.08)
        }
    }

    var baseRotation: simd_quatf {
        switch self {
        case .leftForearm, .rightForearm, .leftUpperArm, .rightUpperArm:
            return simd_quatf(angle: .pi / 2.0, axis: SIMD3<Float>(1.0, 0.0, 0.0))
        case .chest:
            return simd_quatf(angle: .pi, axis: SIMD3<Float>(0.0, 1.0, 0.0))
        case .back:
            return simd_quatf(angle: 0.0, axis: SIMD3<Float>(0.0, 1.0, 0.0))
        }
    }

    var presetRotationDegrees: Float {
        switch self {
        case .leftForearm, .rightForearm:
            return 8.0
        case .leftUpperArm, .rightUpperArm:
            return 4.0
        case .chest, .back:
            return 0.0
        }
    }
}

// MARK: - Projection Profile (per-body-part tuning)

private struct ProjectionProfile: Equatable {
    let searchRadiusMultiplier: Float
    let maxTriangles: Int
    let spatialHashScale: Float
    let baseSurfaceOffset: Float
    let maxAdditionalOffset: Float
    let offsetCurvatureScale: Float
    let minEstimatedRadius: Float
    let arcBlendRampStart: Float
    let arcBlendRampEnd: Float
    let backfaceThreshold: Float
    let normalConsistencyThreshold: Float
    let uvAcceptanceTolerance: Float
    let sphereFilterMultiplier: Float
    let defaultSizeMeters: CGSize
    let defaultScale: Float

    /// Known anatomical cross-section radius in meters for cylindrical body parts.
    /// When set, overrides the noisy LiDAR-estimated radius for more reliable
    /// arc-length UV wrapping. Nil for non-cylindrical body parts.
    let knownAnatomicalRadius: Float?

    /// When true, forces pure planar UV mapping regardless of detected curvature.
    /// Used for body parts whose geometry is NOT cylindrical (face, hand, back, chest)
    /// where the atan2-based arc-length UV model would produce incorrect warping.
    let prefersPlanarUV: Bool

    /// Maximum allowed scale for this body part. Prevents oversized tattoos that
    /// wrap excessively and waste CPU processing unnecessary triangles.
    let maxScale: Float
}

/// Tracks which body side (left/right) was detected with higher confidence.
/// Used for bilateral body parts (arms, legs) to anchor the tattoo to the correct side.
private enum DetectedBodySide: Equatable {
    case left, right
}

private enum BodyPartMode: String, CaseIterable, Identifiable, Equatable {
    case back
    case chest
    case neck
    case upperArms
    case forearms
    case hand
    case calves
    case thighs
    case general
    // Front camera (TrueDepth) face placement categories
    case forehead
    case temple
    case cheekbone
    case underEye
    case nose
    case jawline
    case chin
    case faceGeneral

    var id: String { rawValue }

    static func fromBridgeValue(_ value: String) -> BodyPartMode {
        switch value {
        case "upper_arm", "upperArms": return .upperArms
        case "forearm", "forearms": return .forearms
        case "face", "faceGeneral": return .faceGeneral
        default: return BodyPartMode(rawValue: value) ?? .general
        }
    }

    var displayName: String {
        switch self {
        case .back: return "BACK"
        case .chest: return "CHEST"
        case .neck: return "NECK"
        case .upperArms: return "UPPER ARM"
        case .forearms: return "FOREARM"
        // MARK: HAND (WIP — excluded from picker via modes(forFrontCamera:); preserve for future use)
        case .hand: return "HAND"
        case .calves: return "CALVES"
        case .thighs: return "THIGHS"
        case .general: return "GENERAL"
        case .forehead: return "FOREHEAD"
        case .temple: return "TEMPLE"
        case .cheekbone: return "CHEEK"
        case .underEye: return "UNDER EYE"
        case .nose: return "NOSE"
        case .jawline: return "JAWLINE"
        case .chin: return "CHIN"
        case .faceGeneral: return "GENERAL"
        }
    }

    var icon: String {
        switch self {
        case .back: return "figure.stand"
        case .chest: return "heart"
        case .neck: return "person.bust"
        case .upperArms: return "figure.arms.open"
        case .forearms: return "hand.raised"
        case .hand: return "hand.point.up"
        case .calves: return "figure.walk"
        case .thighs: return "figure.stand"
        case .general: return "circle.dashed"
        case .forehead: return "brain.head.profile"
        case .temple: return "eye"
        case .cheekbone: return "face.smiling"
        case .underEye: return "eye.trianglebadge.exclamationmark"
        case .nose: return "nose"
        case .jawline: return "face.dashed"
        case .chin: return "mouth"
        case .faceGeneral: return "circle.dashed"
        }
    }

    /// Whether this mode requires the front (TrueDepth) camera.
    /// Face and Neck modes use ARFaceTrackingConfiguration for
    /// high-fidelity face mesh projection.
    var requiresFrontCamera: Bool {
        switch self {
        case .forehead, .temple, .cheekbone, .underEye, .nose, .jawline, .chin, .faceGeneral:
            return true
        default: return false
        }
    }

    /// Whether this mode targets an arm or hand.
    /// These modes need special placement: when the limb lies on a table,
    /// the raycast hits the TABLE surface. This flag triggers an offset
    /// to snap the projection center onto the body surface instead.
    var isArmMode: Bool {
        switch self {
        case .forearms, .upperArms, .hand: return true
        default: return false
        }
    }

    /// The Vision body pose joints to use for auto-positioning the tattoo.
    /// Returns a pair (primary, secondary) — the tattoo is placed at the midpoint
    /// of both joints to target the center of the body segment.
    /// If secondary is nil, the primary joint alone is used.
    var visionJointPair: (primary: VNHumanBodyPoseObservation.JointName, secondary: VNHumanBodyPoseObservation.JointName?)? {
        switch self {
        case .neck:      return (.neck, nil)
        case .chest:     return (.neck, .root)             // Midpoint = sternum area
        case .back:      return (.neck, .root)             // Same midpoint, different offset
        case .upperArms: return (.leftShoulder, .leftElbow) // Default left — detection picks best side
        case .forearms:  return (.leftElbow, .leftWrist)    // Default left — detection picks best side
        case .hand:      return (.leftWrist, nil)
        case .calves:    return (.leftKnee, .leftAnkle)     // Mid-calf
        case .thighs:    return (.leftHip, .leftKnee)       // Mid-thigh
        case .general:   return (.root, nil)
        default:         return nil                         // Face modes don't use body pose
        }
    }

    /// For bilateral body parts (arms, legs), provides the right-side joint pair
    /// alternative. The detection function checks both sides and picks the one
    /// with higher confidence and more lateral position (further from body center).
    var visionJointPairRight: (primary: VNHumanBodyPoseObservation.JointName, secondary: VNHumanBodyPoseObservation.JointName?)? {
        switch self {
        case .upperArms: return (.rightShoulder, .rightElbow)
        case .forearms:  return (.rightElbow, .rightWrist)
        case .hand:      return (.rightWrist, nil)
        case .calves:    return (.rightKnee, .rightAnkle)
        case .thighs:    return (.rightHip, .rightKnee)
        default:         return nil  // Non-bilateral or face modes
        }
    }

    /// Whether this body part needs a lateral offset applied to the screen point
    /// to push the raycast away from the torso center. Essential for arms because
    /// the 2D midpoint of shoulder↔elbow or elbow↔wrist overlaps the torso when
    /// viewed from the front, causing the raycast to hit the chest instead of the arm.
    var needsLateralOffset: Bool {
        switch self {
        case .upperArms, .forearms, .hand, .calves, .thighs: return true
        default: return false
        }
    }

    /// Filter modes for a given camera position.
    static func modes(forFrontCamera isFront: Bool) -> [BodyPartMode] {
        allCases.filter {
            $0.requiresFrontCamera == isFront
            && $0 != .hand   // HAND: WIP — not yet tuned for rear camera; excluded from picker
        }
    }

    /// The ARSkeleton3D joint to anchor the tattoo to for each body mode.
    /// Used by the rear camera to auto-position the tattoo at the correct body part.
    /// Returns the LEFT side joint by default; use `skeletonJointName(forSide:)` for bilateral parts.
    var skeletonJointName: ARSkeleton.JointName {
        switch self {
        case .back:      return ARSkeleton.JointName(rawValue: "spine_7_joint")
        case .chest:     return ARSkeleton.JointName(rawValue: "spine_5_joint")
        case .neck:      return ARSkeleton.JointName(rawValue: "neck_1_joint")
        case .upperArms: return ARSkeleton.JointName(rawValue: "left_arm_joint")
        case .forearms:  return ARSkeleton.JointName(rawValue: "left_forearm_joint")
        case .hand:      return ARSkeleton.JointName(rawValue: "left_hand_joint")
        case .calves:    return ARSkeleton.JointName(rawValue: "left_leg_joint")
        case .thighs:    return ARSkeleton.JointName(rawValue: "left_upLeg_joint")
        case .general:   return ARSkeleton.JointName(rawValue: "spine_7_joint")
        default:         return ARSkeleton.JointName(rawValue: "spine_7_joint")
        }
    }

    /// Returns the skeleton joint for a specific body side.
    /// For bilateral body parts (arms, legs), selects the left or right joint.
    /// For non-bilateral parts (chest, back, neck), ignores the side parameter.
    func skeletonJointName(forSide side: DetectedBodySide) -> ARSkeleton.JointName {
        guard side == .right else { return skeletonJointName }
        switch self {
        case .upperArms: return ARSkeleton.JointName(rawValue: "right_arm_joint")
        case .forearms:  return ARSkeleton.JointName(rawValue: "right_forearm_joint")
        case .hand:      return ARSkeleton.JointName(rawValue: "right_hand_joint")
        case .calves:    return ARSkeleton.JointName(rawValue: "right_leg_joint")
        case .thighs:    return ARSkeleton.JointName(rawValue: "right_upLeg_joint")
        default:         return skeletonJointName  // Non-bilateral
        }
    }

    /// Returns the local offset with X mirrored for right-side bilateral parts.
    func skeletonLocalOffset(forSide side: DetectedBodySide) -> SIMD3<Float> {
        var offset = skeletonLocalOffset
        if side == .right {
            offset.x = -offset.x  // Mirror X for right side
        }
        return offset
    }

    /// Local offset from the skeleton joint for each body mode.
    /// Positions the tattoo at the correct surface location relative to the joint.
    var skeletonLocalOffset: SIMD3<Float> {
        switch self {
        case .back:      return SIMD3<Float>(0.0, 0.09, -0.08)     // Behind spine
        case .chest:     return SIMD3<Float>(0.0, 0.06, 0.12)      // Raised Y to sternum/pectoral area, pushed forward to chest surface
        case .neck:      return SIMD3<Float>(0.0, 0.02, 0.07)      // Front of neck, forward from spine
        case .upperArms: return SIMD3<Float>(0.0, 0.03, 0.025)     // Outer arm surface
        case .forearms:  return SIMD3<Float>(0.0, 0.03, 0.025)     // Outer forearm
        case .hand:      return SIMD3<Float>(0.0, 0.0, 0.02)       // Back of hand
        case .calves:    return SIMD3<Float>(0.0, 0.0, 0.03)       // Outer calf
        case .thighs:    return SIMD3<Float>(0.0, 0.0, 0.04)       // Outer thigh
        case .general:   return SIMD3<Float>(0.0, 0.09, 0.08)      // Default to chest
        default:         return .zero
        }
    }

    /// Base rotation for the tattoo entity relative to the skeleton joint.
    var skeletonBaseRotation: simd_quatf {
        switch self {
        case .back:
            return simd_quatf(angle: 0.0, axis: SIMD3<Float>(0, 1, 0))
        case .chest:
            return simd_quatf(angle: .pi, axis: SIMD3<Float>(0, 1, 0))
        case .neck:
            return simd_quatf(angle: .pi, axis: SIMD3<Float>(0, 1, 0))  // Face forward (toward camera)
        case .upperArms, .forearms, .hand:
            return simd_quatf(angle: .pi / 2.0, axis: SIMD3<Float>(1, 0, 0))
        case .calves, .thighs:
            return simd_quatf(angle: .pi / 2.0, axis: SIMD3<Float>(1, 0, 0))
        default:
            return simd_quatf(angle: .pi, axis: SIMD3<Float>(0, 1, 0))
        }
    }

    /// Default face-local 3D offset for each face placement category.
    /// The ARFaceAnchor coordinate system:
    ///   Origin: between the eyes (nose bridge)
    ///   X: positive to viewer's right (face's left)
    ///   Y: positive upward
    ///   Z: positive outward toward camera
    var defaultFaceLocalOffset: SIMD3<Float> {
        switch self {
        case .forehead:    return SIMD3<Float>(0.0,  0.060,  0.020)   // Above brow ridge
        case .temple:      return SIMD3<Float>(0.055, 0.035, -0.015)  // Side of forehead near hairline
        case .cheekbone:   return SIMD3<Float>(0.045, -0.015,  0.025) // Cheek area below eye
        case .underEye:    return SIMD3<Float>(0.025,  0.005,  0.025) // Just below the eye
        case .nose:        return SIMD3<Float>(0.0,  -0.015,  0.050)  // On the nose bridge
        case .jawline:     return SIMD3<Float>(0.050, -0.055, -0.010) // Along the jaw
        case .chin:        return SIMD3<Float>(0.0,  -0.065,  0.025)  // Below lower lip
        case .faceGeneral: return .zero                                // User taps to place
        // neck uses rear camera now — no face-local offset needed
        case .neck:        return .zero
        default:           return .zero
        }
    }

    var profile: ProjectionProfile {
        switch self {
        // ────────────────────────────────────────────────────────────────────
        // BACK — Large, nearly flat surface with spinal ridge.
        // Anatomy: ~40×50cm usable area. The latissimus dorsi and trapezius
        // create gentle undulations. Spinal column ridge is 5–10mm tall.
        // Strategy: Pure planar UV. Wide search, relaxed filters for oblique views.
        // ────────────────────────────────────────────────────────────────────
        case .back:
            return ProjectionProfile(
                searchRadiusMultiplier: 3.0,    // Wide search for full-back tattoos
                maxTriangles: 28000,            // More triangles — large surface area
                spatialHashScale: 2500,         // Coarser grid (0.4mm) — normals change slowly
                baseSurfaceOffset: 0.005,       // 5mm — clears spinal ridge prominence
                maxAdditionalOffset: 0.008,     // 8mm cap — shoulder blade curvature
                offsetCurvatureScale: 0.035,    // More responsive to shoulder blade curvature
                minEstimatedRadius: 0.15,       // Large min — back is very gently curved
                arcBlendRampStart: 0.05,        // High threshold — almost never triggers
                arcBlendRampEnd: 0.15,          // Would only engage on extreme curvature
                backfaceThreshold: 0.55,        // Relaxed — allow oblique triangles from side views
                normalConsistencyThreshold: 0.08, // Relaxed — match Neck stability, ignore noisy LiDAR normals
                uvAcceptanceTolerance: 0.15,    // Wider — prevent edge clipping on large tattoos
                sphereFilterMultiplier: 2.0,    // Wider coverage for full-back pieces
                defaultSizeMeters: CGSize(width: 0.20, height: 0.20),
                defaultScale: 0.75,
                knownAnatomicalRadius: nil,     // Not cylindrical
                prefersPlanarUV: true,          // Flat surface → planar UV
                maxScale: 2.5                   // Large flat area — full-back tattoos
            )

        // ────────────────────────────────────────────────────────────────────
        // CHEST — Pectoral dome + sternum. NOT cylindrical — convex dome shape.
        // Anatomy: Pectorals are ~15cm wide domes with ~8–12cm radius of
        // curvature. Sternum is flat. Clavicle creates sharp normal transition.
        // Strategy: Pure planar UV (pectoral dome ≠ cylinder). Moderate offset.
        // ────────────────────────────────────────────────────────────────────
        case .chest:
            return ProjectionProfile(
                searchRadiusMultiplier: 2.8,    // Wider search for full torso wrapping
                maxTriangles: 28000,            // More triangles for better coverage
                spatialHashScale: 3000,         // Finer than back — pectoral curvature
                baseSurfaceOffset: 0.005,       // 5mm — better pectoral dome clearance
                maxAdditionalOffset: 0.014,     // 14mm cap — handle deep pectoral curvature
                offsetCurvatureScale: 0.045,    // More curvature-responsive push for breast area
                minEstimatedRadius: 0.10,       // Pectoral dome ≈ 10cm radius
                arcBlendRampStart: 0.04,        // High threshold — resist arc-length
                arcBlendRampEnd: 0.12,
                backfaceThreshold: 0.55,        // Relaxed — allow side-wrapping on curved chest without clipping
                normalConsistencyThreshold: 0.08,  // Relaxed — match Neck stability, prevent fractures
                uvAcceptanceTolerance: 0.15,    // Wider UV tolerance for full coverage
                sphereFilterMultiplier: 2.2,    // Wider sphere to prevent edge cut-off
                defaultSizeMeters: CGSize(width: 0.16, height: 0.16),
                defaultScale: 0.75,
                knownAnatomicalRadius: nil,     // Not cylindrical
                prefersPlanarUV: true,          // Dome shape → planar UV
                maxScale: 1.8                   // Cap to prevent performance issues on large tattoos
            )

        // ────────────────────────────────────────────────────────────────────
        // FOREHEAD — Broad, gently curved surface above the brow ridge.
        // Anatomy: Forehead radius ≈ 9cm. Relatively flat vs other face areas.
        // Common placements: center forehead, above eyebrow, widow's peak area.
        // Strategy: Pure planar UV. Larger default size since it's the biggest face area.
        // ────────────────────────────────────────────────────────────────────
        case .forehead:
            return ProjectionProfile(
                searchRadiusMultiplier: 4.5,
                maxTriangles: 32000,
                spatialHashScale: 8000,
                baseSurfaceOffset: 0.003,
                maxAdditionalOffset: 0.006,
                offsetCurvatureScale: 0.03,
                minEstimatedRadius: 0.08,       // Forehead ≈ 8–9cm radius
                arcBlendRampStart: 1.0,
                arcBlendRampEnd: 2.0,
                backfaceThreshold: 0.65,
                normalConsistencyThreshold: 0.08,
                uvAcceptanceTolerance: 0.20,
                sphereFilterMultiplier: 2.5,
                defaultSizeMeters: CGSize(width: 0.03, height: 0.02),
                defaultScale: 0.55,
                knownAnatomicalRadius: nil,
                prefersPlanarUV: true,
                maxScale: 1.2                   // Small face area
            )

        // ────────────────────────────────────────────────────────────────────
        // TEMPLE — Small, slightly concave area near the hairline.
        // Anatomy: Temple area is thinner and flatter, near the temporal bone.
        // Common placements: small symbols, stars, minimalist designs.
        // Strategy: Pure planar UV. Tight filter for the small target area.
        // ────────────────────────────────────────────────────────────────────
        case .temple:
            return ProjectionProfile(
                searchRadiusMultiplier: 4.0,
                maxTriangles: 32000,
                spatialHashScale: 8000,
                baseSurfaceOffset: 0.003,
                maxAdditionalOffset: 0.005,
                offsetCurvatureScale: 0.03,
                minEstimatedRadius: 0.06,       // Temple ≈ 6cm local radius
                arcBlendRampStart: 1.0,
                arcBlendRampEnd: 2.0,
                backfaceThreshold: 0.70,        // Relaxed — temple wraps toward ear
                normalConsistencyThreshold: 0.06,
                uvAcceptanceTolerance: 0.22,
                sphereFilterMultiplier: 2.2,
                defaultSizeMeters: CGSize(width: 0.02, height: 0.02),
                defaultScale: 0.45,
                knownAnatomicalRadius: nil,
                prefersPlanarUV: true,
                maxScale: 1.2                   // Small face area
            )

        // ────────────────────────────────────────────────────────────────────
        // CHEEKBONE — Medium curvature over the zygomatic bone.
        // Anatomy: Cheek radius ≈ 7cm. Malar eminence creates mild convexity.
        // Common placements: teardrops, cross, small portrait, decorative pieces.
        // Strategy: Pure planar UV with moderate sphere filter.
        // ────────────────────────────────────────────────────────────────────
        case .cheekbone:
            return ProjectionProfile(
                searchRadiusMultiplier: 4.5,
                maxTriangles: 32000,
                spatialHashScale: 8000,
                baseSurfaceOffset: 0.003,
                maxAdditionalOffset: 0.007,
                offsetCurvatureScale: 0.035,
                minEstimatedRadius: 0.06,       // Cheek ≈ 6–7cm radius
                arcBlendRampStart: 1.0,
                arcBlendRampEnd: 2.0,
                backfaceThreshold: 0.70,
                normalConsistencyThreshold: 0.06,
                uvAcceptanceTolerance: 0.22,
                sphereFilterMultiplier: 2.5,
                defaultSizeMeters: CGSize(width: 0.035, height: 0.035),
                defaultScale: 0.50,
                knownAnatomicalRadius: nil,
                prefersPlanarUV: true,
                maxScale: 1.2                   // Small face area
            )

        // ────────────────────────────────────────────────────────────────────
        // UNDER EYE — Delicate infra-orbital area below the eye socket.
        // Anatomy: Thin skin over orbital rim. Very tight, concave-to-flat transition.
        // Common placements: small symbols, dots, fine-line art, teardrop.
        // Strategy: Tiny default size. Extra-relaxed backface threshold so
        // the orbital bone geometry isn't culled.
        // ────────────────────────────────────────────────────────────────────
        case .underEye:
            return ProjectionProfile(
                searchRadiusMultiplier: 4.0,
                maxTriangles: 32000,
                spatialHashScale: 10000,        // 0.1mm — highest precision for tiny details
                baseSurfaceOffset: 0.002,       // 2mm — very close to skin
                maxAdditionalOffset: 0.004,
                offsetCurvatureScale: 0.025,
                minEstimatedRadius: 0.015,      // Orbital rim ≈ 1.5cm radius
                arcBlendRampStart: 1.0,
                arcBlendRampEnd: 2.0,
                backfaceThreshold: 0.80,        // Very relaxed — orbital geometry
                normalConsistencyThreshold: 0.04,
                uvAcceptanceTolerance: 0.25,
                sphereFilterMultiplier: 2.0,    // Tighter — small target
                defaultSizeMeters: CGSize(width: 0.015, height: 0.015),
                defaultScale: 0.40,
                knownAnatomicalRadius: nil,
                prefersPlanarUV: true,
                maxScale: 1.2                   // Small face area
            )

        // ────────────────────────────────────────────────────────────────────
        // JAWLINE — Angular surface along the mandible.
        // Anatomy: Jaw radius ≈ 5cm. Angle of mandible creates sharp curvature.
        // Common placements: scripts, lettering, geometric patterns running
        // along the jaw from ear to chin.
        // Strategy: Planar UV. Horizontally elongated default shape.
        // ────────────────────────────────────────────────────────────────────
        case .jawline:
            return ProjectionProfile(
                searchRadiusMultiplier: 4.5,
                maxTriangles: 32000,
                spatialHashScale: 8000,
                baseSurfaceOffset: 0.003,
                maxAdditionalOffset: 0.007,
                offsetCurvatureScale: 0.04,
                minEstimatedRadius: 0.04,       // Jaw ≈ 4–5cm radius
                arcBlendRampStart: 1.0,
                arcBlendRampEnd: 2.0,
                backfaceThreshold: 0.70,
                normalConsistencyThreshold: 0.06,
                uvAcceptanceTolerance: 0.22,
                sphereFilterMultiplier: 2.5,
                defaultSizeMeters: CGSize(width: 0.04, height: 0.025),
                defaultScale: 0.50,
                knownAnatomicalRadius: nil,
                prefersPlanarUV: true,
                maxScale: 1.2                   // Small face area
            )

        // ────────────────────────────────────────────────────────────────────
        // CHIN — Small, protruding, convex surface below the lower lip.
        // Anatomy: Mental eminence. Sharp convexity. Very small target area.
        // Common placements: small symbols, dots, minimalist marks.
        // Strategy: Planar UV. Small default size matching anatomy.
        // ────────────────────────────────────────────────────────────────────
        case .chin:
            return ProjectionProfile(
                searchRadiusMultiplier: 4.0,
                maxTriangles: 32000,
                spatialHashScale: 8000,
                baseSurfaceOffset: 0.003,
                maxAdditionalOffset: 0.006,
                offsetCurvatureScale: 0.04,
                minEstimatedRadius: 0.025,      // Chin ≈ 2.5cm radius
                arcBlendRampStart: 1.0,
                arcBlendRampEnd: 2.0,
                backfaceThreshold: 0.70,
                normalConsistencyThreshold: 0.06,
                uvAcceptanceTolerance: 0.22,
                sphereFilterMultiplier: 2.2,
                defaultSizeMeters: CGSize(width: 0.025, height: 0.025),
                defaultScale: 0.45,
                knownAnatomicalRadius: nil,
                prefersPlanarUV: true,
                maxScale: 1.2                   // Small face area
            )

        // ────────────────────────────────────────────────────────────────────
        // NECK — Rear camera with LiDAR mesh + body tracking.
        // Anatomy: Average neck circumference ≈ 35–40cm → radius ≈ 5.5–6.4cm.
        // Common placements: side-neck symbols, wrap-around text, larger designs.
        // Strategy: Arc-length UV wrapping onto cylindrical LiDAR mesh.
        // ────────────────────────────────────────────────────────────────────
        case .neck:
            return ProjectionProfile(
                searchRadiusMultiplier: 7.0,        // Wide — capture full neck cylinder
                maxTriangles: 40000,                // High budget for detailed images
                spatialHashScale: 3500,
                baseSurfaceOffset: 0.006,           // 6mm — lift above collar/LiDAR surface
                maxAdditionalOffset: 0.012,         // 12mm max — prevent clipping into shirt
                offsetCurvatureScale: 0.04,
                minEstimatedRadius: 0.045,
                arcBlendRampStart: 0.003,           // Start blending arc UV early
                arcBlendRampEnd: 0.04,              // Full arc blend by 4cm curvature
                backfaceThreshold: 0.25,            // Very relaxed — neck cylinder has extreme oblique angles
                normalConsistencyThreshold: 0.06,   // Relaxed — neck curvature varies greatly
                uvAcceptanceTolerance: 0.50,        // Wide — support wrap-around designs
                sphereFilterMultiplier: 5.0,        // Wide — capture full neck circumference
                defaultSizeMeters: CGSize(width: 0.15, height: 0.15),  // 15cm × 15cm — supports larger designs
                defaultScale: 0.90,                 // Start near full size for visibility
                knownAnatomicalRadius: 0.059,
                prefersPlanarUV: false,              // Arc-length UV wrapping for cylindrical neck
                maxScale: 2.5                       // Allow scaling up for full wrap-around designs
            )

        // ────────────────────────────────────────────────────────────────────
        // UPPER ARMS — Deltoid + bicep/tricep. Clear cylindrical cross-section.
        // Anatomy: Average upper arm circumference ≈ 32–36cm → radius ≈ 5–6cm.
        // Deltoid cap is hemispherical but the main tattoo area (bicep/tricep
        // mid-section) is an excellent cylinder.
        // Strategy: Cylindrical UV with known radius 0.055m.
        // ────────────────────────────────────────────────────────────────────
        case .upperArms:
            return ProjectionProfile(
                searchRadiusMultiplier: 6.0,    // Wide — cylinder wraps aggressively, 360° viewing
                maxTriangles: 40000,            // High budget for detailed images
                spatialHashScale: 4500,
                baseSurfaceOffset: 0.003,
                maxAdditionalOffset: 0.007,
                offsetCurvatureScale: 0.035,
                minEstimatedRadius: 0.045,
                arcBlendRampStart: 0.003,
                arcBlendRampEnd: 0.025,
                backfaceThreshold: 0.50,        // Relaxed — accept side-facing triangles for curvature wrap
                normalConsistencyThreshold: 0.08, // Relaxed — deltoid-to-biceps transition varies normals
                uvAcceptanceTolerance: 0.42,    // Wider acceptance for cylindrical wrap + orbit viewing
                sphereFilterMultiplier: 4.0,    // Wider filter for full arm coverage during orbit
                defaultSizeMeters: CGSize(width: 0.17, height: 0.25),  // 17cm × 25cm — matches visible half-circumference
                defaultScale: 0.90,             // Start near full size for realistic preview
                knownAnatomicalRadius: 0.055,
                prefersPlanarUV: false,          // Arc-length UV — follows arm curvature
                maxScale: 3.0                    // Allow full wrap-around sleeve designs
            )

        // ────────────────────────────────────────────────────────────────────
        // FOREARMS — Radius/ulna create a thinner, slightly elliptical cylinder.
        // Anatomy: Average forearm circumference ≈ 26–28cm → radius ≈ 4–4.5cm.
        // The bone ridge (ulna) creates a slight crease on the outer edge.
        // Strategy: Cylindrical UV with known radius 0.042m.
        // Higher offset than upper arm due to bone proximity.
        // ────────────────────────────────────────────────────────────────────
        case .forearms:
            return ProjectionProfile(
                searchRadiusMultiplier: 6.0,    // Wide — thin cylinder needs extra reach
                maxTriangles: 40000,            // High budget for detailed images
                spatialHashScale: 4500,
                baseSurfaceOffset: 0.003,       // 3mm — bone proximity offset
                maxAdditionalOffset: 0.007,
                offsetCurvatureScale: 0.035,
                minEstimatedRadius: 0.035,
                arcBlendRampStart: 0.003,
                arcBlendRampEnd: 0.02,
                backfaceThreshold: 0.60,        // More relaxed — accept side-facing triangles on thin cylinder
                normalConsistencyThreshold: 0.08, // Very relaxed — ulnar ridge causes sharp normal transitions
                uvAcceptanceTolerance: 0.42,    // Wider — prevent edge clipping on thin cylinder
                sphereFilterMultiplier: 4.0,    // Wider for full forearm coverage
                defaultSizeMeters: CGSize(width: 0.08, height: 0.10),  // 8cm × 10cm — proportional to forearm
                defaultScale: 0.85,             // Larger initial size — matches calves/thighs for consistent coverage
                knownAnatomicalRadius: 0.042,
                prefersPlanarUV: true,           // Use planar UV — arc warp too aggressive on thin cylinder
                maxScale: 1.6                    // Allow reasonable sizing on forearm
            )

        // ────────────────────────────────────────────────────────────────────
        // HAND — Dorsum (back of hand) is a slightly convex plane, NOT a cylinder.
        // Anatomy: Metacarpals create parallel ridges, knuckles are sharp
        // convexities (~1cm radius). Fingers are tiny cylinders (8–12mm
        // radius) but below LiDAR mesh resolution for reliable mapping.
        // Strategy: Pure planar UV. Highest density and offset for knuckles.
        // ────────────────────────────────────────────────────────────────────
        case .hand:
            return ProjectionProfile(
                searchRadiusMultiplier: 5.0,    // Very wide — hand has depth variation
                maxTriangles: 32000,            // Maximum density for knuckle detail
                spatialHashScale: 8000,         // 0.125mm grid — metacarpal ridges
                baseSurfaceOffset: 0.010,       // 10mm — must clear knuckle peaks + slight hover
                maxAdditionalOffset: 0.022,     // Up to 22mm for extreme knuckle curl
                offsetCurvatureScale: 0.08,     // Aggressive — knuckles are sharp
                minEstimatedRadius: 0.015,      // Hand dorsum curvature ~1.5cm
                arcBlendRampStart: 0.4,         // Enable curvature — hand dorsum is slightly curved
                arcBlendRampEnd: 1.0,           // Full arc at moderate curvature
                backfaceThreshold: 0.90,        // Extremely relaxed — hand normals face every direction
                normalConsistencyThreshold: 0.20, // Very lenient — hand dorsum has tendons, knuckles, veins
                uvAcceptanceTolerance: 0.55,    // Very relaxed — accept wide UV range for full coverage
                sphereFilterMultiplier: 5.0,    // Very wide sphere for complete dorsum coverage
                defaultSizeMeters: CGSize(width: 0.04, height: 0.04),  // 4cm × 4cm — small dorsum area
                defaultScale: 0.30,             // Smaller default — hand tattoos are typically small
                knownAnatomicalRadius: 0.025,   // Hand dorsum ~2.5cm thick when flat on table
                prefersPlanarUV: false,          // Allow arc-length UV for curvature conformance
                maxScale: 1.2                   // Slight flexibility for larger hand tattoos
            )

        // ────────────────────────────────────────────────────────────────────
        // CALVES — Asymmetric cylinder: shin (flat/ridge) + gastrocnemius (convex).
        // Anatomy: Average calf circumference ≈ 36–40cm → radius ≈ 5.7–6.4cm.
        // The tibial ridge (shin) creates a sharp edge that the projection
        // must handle — higher offset needed there.
        // Strategy: Cylindrical UV with known radius 0.06m.
        // ────────────────────────────────────────────────────────────────────
        case .calves:
            return ProjectionProfile(
                searchRadiusMultiplier: 6.0,    // Wide — calves wrap aggressively; match forearms
                maxTriangles: 40000,            // High budget for full coverage (match forearms)
                spatialHashScale: 4500,
                baseSurfaceOffset: 0.0035,
                maxAdditionalOffset: 0.008,
                offsetCurvatureScale: 0.04,
                minEstimatedRadius: 0.045,
                arcBlendRampStart: 0.003,
                arcBlendRampEnd: 0.025,
                backfaceThreshold: 0.55,        // More relaxed — shin ridge + gastrocnemius curvature
                normalConsistencyThreshold: 0.10, // Very relaxed — tibial ridge causes sharp normal transitions
                uvAcceptanceTolerance: 0.40,    // Wide — prevent edge clipping on curved surface
                sphereFilterMultiplier: 3.8,    // Wide — prevent bottom cut-off on designs
                defaultSizeMeters: CGSize(width: 0.10, height: 0.10),  // 10×10cm — proportional to calf area
                defaultScale: 0.85,             // Larger default — calves have significant surface area
                knownAnatomicalRadius: 0.060,
                prefersPlanarUV: true,           // Use planar UV — arc warp too aggressive
                maxScale: 1.8                    // Allow larger tattoos on calves
            )

        // ────────────────────────────────────────────────────────────────────
        // THIGHS — Large, gentle cylinder. Smooth quadriceps/hamstring surface.
        // Anatomy: Average thigh circumference ≈ 50–58cm → radius ≈ 8–9cm.
        // Very smooth muscle groups, gentle curvature. The large radius means
        // planar UV is already nearly correct, but mild arc-length helps.
        // Strategy: Mild cylindrical UV with known radius 0.085m.
        // ────────────────────────────────────────────────────────────────────
        case .thighs:
            return ProjectionProfile(
                searchRadiusMultiplier: 5.5,    // Wide — thigh is the largest limb cylinder
                maxTriangles: 40000,            // High budget — large surface area
                spatialHashScale: 3000,         // Coarser — normals change slowly on smooth muscle
                baseSurfaceOffset: 0.002,       // 2mm — smooth muscle groups
                maxAdditionalOffset: 0.005,
                offsetCurvatureScale: 0.02,
                minEstimatedRadius: 0.07,       // Floor near anatomical
                arcBlendRampStart: 0.005,       // Engage gently
                arcBlendRampEnd: 0.04,          // Full blend at moderate curvature
                backfaceThreshold: 0.65,        // Very relaxed — accept side-facing triangles for orbit views
                normalConsistencyThreshold: 0.08, // Relaxed — quadriceps/hamstring transition
                uvAcceptanceTolerance: 0.42,    // Very wide — prevent edge clipping when viewed from side
                sphereFilterMultiplier: 4.2,    // Wide — prevent design cut-off at extremes
                defaultSizeMeters: CGSize(width: 0.12, height: 0.12),  // 12×12cm — proportional to thigh
                defaultScale: 0.85,             // Larger default — thigh has huge surface area
                knownAnatomicalRadius: 0.085,   // 53cm circumference ÷ 2π
                prefersPlanarUV: true,           // Planar UV — large radius makes arc-length negligible
                maxScale: 2.0                    // Large surface allows bigger tattoos
            )

        // ────────────────────────────────────────────────────────────────────
        // GENERAL — Universal mode. Must handle ANY body part (flat torso,
        // curved arms, convex shoulders, cylindrical calves, concave neck).
        // Strategy: Highest triangle budget, fine spatial hash, adaptive
        // curvature blending, relaxed thresholds to accommodate all shapes.
        // This is the MOST advanced profile — it trades specificity for
        // maximum adaptability across all anatomical regions.
        // ────────────────────────────────────────────────────────────────────
        case .general:
            return ProjectionProfile(
                searchRadiusMultiplier: 5.0,    // Wide search — must cover any body region
                maxTriangles: 40000,            // Match thighs — highest budget for any surface
                spatialHashScale: 3000,         // Coarser — prevents over-filtering on smooth skin
                baseSurfaceOffset: 0.002,       // 2mm — tight to skin
                maxAdditionalOffset: 0.005,     // 5mm cap
                offsetCurvatureScale: 0.02,     // Moderate curvature response
                minEstimatedRadius: 0.025,      // 2.5cm floor — handles tight curves (wrist, ankle)
                arcBlendRampStart: 0.004,       // Earlier ramp for cylindrical wrapping
                arcBlendRampEnd: 0.045,         // Gradual blend to full arc UV
                backfaceThreshold: 0.65,        // Match thighs — accept side-facing for wrap-around
                normalConsistencyThreshold: 0.08, // Match thighs/upper-arms — prevents fragmentation
                uvAcceptanceTolerance: 0.35,    // Very wide — prevent edge clipping on varying curvatures
                sphereFilterMultiplier: 3.8,    // Wide — prevent design cut-off on any anatomy
                defaultSizeMeters: CGSize(width: 0.10, height: 0.10),
                defaultScale: 0.75,
                knownAnatomicalRadius: nil,     // Let LiDAR estimate per-surface
                prefersPlanarUV: true,          // Planar UV — safer default for mixed geometry
                maxScale: 2.0                   // User-placed, flexible
            )

        // ────────────────────────────────────────────────────────────────────
        // NOSE — Small, sharply convex surface at the center of the face.
        // Anatomy: Nose bridge ≈ 1.5cm radius, alar cartilage even tighter.
        // Common placements: tiny symbols, dots, bridge piercings, fine lines.
        // Strategy: Planar UV. Very small default. Tight sphere filter.
        // ────────────────────────────────────────────────────────────────────
        case .nose:
            return ProjectionProfile(
                searchRadiusMultiplier: 4.0,
                maxTriangles: 32000,
                spatialHashScale: 10000,        // 0.1mm — highest precision
                baseSurfaceOffset: 0.002,       // 2mm — very tight to skin
                maxAdditionalOffset: 0.004,
                offsetCurvatureScale: 0.025,
                minEstimatedRadius: 0.012,      // Nose bridge ≈ 1.2cm radius
                arcBlendRampStart: 1.0,
                arcBlendRampEnd: 2.0,
                backfaceThreshold: 0.80,        // Very relaxed — nose wraps sharply
                normalConsistencyThreshold: 0.04,
                uvAcceptanceTolerance: 0.25,
                sphereFilterMultiplier: 1.8,    // Tight — small target
                defaultSizeMeters: CGSize(width: 0.02, height: 0.02),
                defaultScale: 0.40,
                knownAnatomicalRadius: nil,
                prefersPlanarUV: true,
                maxScale: 1.2                   // Small face area
            )

        // ────────────────────────────────────────────────────────────────────
        // FACE GENERAL — Free-form tap-to-place anywhere on the face.
        // Uses the same projection parameters as the old unified Face mode.
        // No default position — user must tap to place.
        // ────────────────────────────────────────────────────────────────────
        case .faceGeneral:
            return ProjectionProfile(
                searchRadiusMultiplier: 4.5,
                maxTriangles: 32000,
                spatialHashScale: 8000,
                baseSurfaceOffset: 0.003,
                maxAdditionalOffset: 0.008,
                offsetCurvatureScale: 0.04,
                minEstimatedRadius: 0.015,
                arcBlendRampStart: 1.0,
                arcBlendRampEnd: 2.0,
                backfaceThreshold: 0.75,
                normalConsistencyThreshold: 0.05,
                uvAcceptanceTolerance: 0.25,
                sphereFilterMultiplier: 2.8,
                defaultSizeMeters: CGSize(width: 0.04, height: 0.04),
                defaultScale: 0.45,
                knownAnatomicalRadius: nil,
                prefersPlanarUV: true,
                maxScale: 1.2                   // Small face area
            )
        }
    }
}

@available(iOS 26.0, *)
struct ContentView: View {
    private let onClose: (() -> Void)?
    @State private var selectedItem: PhotosPickerItem?
    @State private var tattooImage: UIImage? = ContentView.defaultTattooImage()
    @State private var bodyLocation: BodyLocation = .chest
    @State private var bodyPartMode: BodyPartMode = .chest
    @State private var tattooScale: Float = 0.75
    @State private var tattooRotationDegrees: Float = 0.0
    @State private var nudgeX: Float = 0.0
    @State private var nudgeY: Float = 0.0
    @State private var nudgeZ: Float = 0.0
    @State private var lockToSurface: Bool = true
    @State private var smoothingAmount: Float = 0.18
    @State private var statusMessage: String?
    @State private var showBodyTrackingAlert: Bool = false
    @State private var showLiDARAlert: Bool = false
    @State private var showAdvancedControls: Bool = false
    @State private var showControlsSheet: Bool = false
    @State private var distanceMeters: Float?
    @State private var manualPlacementEnabled: Bool = false
    @State private var manualDragOffset: CGSize = .zero
    @State private var captureRequestID: Int = 0
    @State private var captureStatus: String?
    @State private var showSplash: Bool = true
    @State private var isSessionReady: Bool = false
    @State private var isMeshStabilizing: Bool = false
    @State private var isProjectionQualityPoor: Bool = false
    /// True when the rear-camera crosshair is pointing at a sensitive body region (eyes, ears)
    @State private var isSensitiveAreaNearby: Bool = false
    /// One-time disclaimer alert about sensitive body areas
    @State private var showSensitiveAreaDisclaimer: Bool = false
    // Video recording state
    @State private var isRecording: Bool = false
    @State private var recordingDuration: TimeInterval = 0
    @State private var recordingTimer: Timer?
    @State private var showVideoSaved: Bool = false
    @State private var lastRecordingDuration: String = "0:00"
    // Skin Segmentation
    @StateObject private var skinSegManager = SkinSegmentationManager()
    // Sensitive Content Analysis (Apple's on-device nudity detection)
    @StateObject private var sensitiveContentManager = SensitiveContentManager()


    // Camera state: false = rear (LiDAR), true = front (TrueDepth)
    @State private var isFrontCamera: Bool = false

    // Body tracking mode: false = LiDAR mesh (ARWorldTracking), true = Skeleton (ARBodyTracking)
    @State private var showSkeletonOverlay: Bool = false
    // Vision body pose tracking for body-part auto-placement
    @State private var bodyTrackingEnabled: Bool = false
    @State private var bodyTracked: Bool = false
    /// Full-screen loading overlay shown during body tracking mode transitions
    @State private var isLoadingBodyTracking: Bool = false
    /// Regular-mode spatial lock: when true, freezes the tattoo in world space
    @State private var regularModeLocked: Bool = false
    /// Sensitive area detection: true when the user is trying to place a tattoo on eyes, ears, or other restricted face regions
    @State private var isSensitiveAreaBlocked: Bool = false

    private let isBodyTrackingSupported = ARBodyTrackingConfiguration.isSupported
    private let isLiDARSupported = ARWorldTrackingConfiguration.supportsSceneReconstruction(.mesh)
    private let isFaceTrackingSupported = ARFaceTrackingConfiguration.isSupported
    private let manualDragScale: Float = 0.0005

    @State private var showCaptureFlash: Bool = false
    // Camera zoom: digital crop 1x–5x (rear camera only)
    @State private var cameraZoom: CGFloat = 1.0
    @State private var showZoomSlider: Bool = false

    init(initialMode: String = "general", onClose: (() -> Void)? = nil) {
        let mode = BodyPartMode.fromBridgeValue(initialMode)
        self.onClose = onClose
        _bodyPartMode = State(initialValue: mode)
        _isFrontCamera = State(initialValue: mode.requiresFrontCamera)
    }

    var body: some View {
        ZStack {
            // ── CAMERA — fills entire screen ──
            TattooARView(
                configuration: TattooConfiguration(
                    image: tattooImage,
                    bodyLocation: bodyLocation,
                    bodyPartMode: bodyPartMode,
                    scale: tattooScale,
                    rotationDegrees: tattooRotationDegrees,
                    nudge: SIMD3<Float>(
                        nudgeX + Float(manualDragOffset.width) * manualDragScale,
                        nudgeY - Float(manualDragOffset.height) * manualDragScale,
                        nudgeZ
                    ),
                    lockToSurface: lockToSurface,
                    smoothing: smoothingAmount,
                    isFrontCamera: isFrontCamera,
                    bodyTrackingEnabled: bodyTrackingEnabled,
                    showSkeletonOverlay: showSkeletonOverlay,
                    isRecording: isRecording,
                    regularModeLocked: regularModeLocked
                ),
                tattooScale: $tattooScale,
                tattooRotationDegrees: $tattooRotationDegrees,
                statusMessage: $statusMessage,
                distanceMeters: $distanceMeters,
                isSessionReady: $isSessionReady,
                captureRequestID: $captureRequestID,
                captureStatus: $captureStatus,
                bodyTracked: $bodyTracked,
                isRecording: $isRecording,
                isProjectionQualityPoor: $isProjectionQualityPoor,
                isSensitiveAreaBlocked: $isSensitiveAreaBlocked,
                isSensitiveAreaNearby: $isSensitiveAreaNearby,
                skinSegmentationManager: skinSegManager,
                sensitiveContentManager: sensitiveContentManager,
                cameraZoom: $cameraZoom
            )
            .ignoresSafeArea()

            // UIKit pinch/rotate gestures are registered directly on the ARView
            // and work for both front and rear cameras. No SwiftUI overlay needed.

            // ── CROSSHAIR — alignment indicator for manual placement ──
            // Visible only in regular mode (body tracking OFF, lock OFF, rear camera).
            if !isFrontCamera && !bodyTrackingEnabled && !regularModeLocked && tattooImage != nil {
                CrosshairView()
                    .allowsHitTesting(false)
                    .transition(.opacity)
                    .animation(.easeInOut(duration: 0.25), value: regularModeLocked)
                    .animation(.easeInOut(duration: 0.25), value: bodyTrackingEnabled)
            }

            // ── SENSITIVE AREA WARNING — blocks placement on eyes/ears/sensitive content ──
            if (isSensitiveAreaBlocked && isFrontCamera) || sensitiveContentManager.isSensitiveContentDetected || isSensitiveAreaNearby {
                VStack {
                    Spacer()
                    HStack(spacing: 8) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.system(size: 18 * screenScaleRatio, weight: .bold))
                            .foregroundStyle(.yellow)
                        Text("Cannot place tattoo on this area")
                            .font(.system(size: 14 * screenScaleRatio, weight: .semibold))
                            .foregroundStyle(.white)
                    }
                    .padding(.horizontal, 20)
                    .padding(.vertical, 12)
                    .background(
                        RoundedRectangle(cornerRadius: 14)
                            .fill(Color.red.opacity(0.75))
                            .overlay(
                                RoundedRectangle(cornerRadius: 14)
                                    .strokeBorder(Color.red, lineWidth: 2)
                            )
                    )
                    .shadow(color: .red.opacity(0.5), radius: 12, y: 4)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                    .padding(.bottom, 160) // Above the bottom toolbar
                    Spacer().frame(height: 0)
                }
                .allowsHitTesting(false)
                .animation(.spring(response: 0.35, dampingFraction: 0.75), value: isSensitiveAreaBlocked)
                .animation(.spring(response: 0.35, dampingFraction: 0.75), value: sensitiveContentManager.isSensitiveContentDetected)
                .onAppear {
                    // Auto-dismiss face exclusion zone warning after 2 seconds
                    // (SCA-detected warnings persist as long as the content is visible)
                    if isSensitiveAreaBlocked && isFrontCamera {
                        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                            withAnimation { isSensitiveAreaBlocked = false }
                        }
                    }
                }
            }

            // ── FLOATING UI — top & bottom bars over camera ──
            VStack(spacing: 0) {
                    // ── TOP BAR — Liquid Glass ──
                    VStack(spacing: 6) {
                        HStack(spacing: 6) {
                            Text("Live Tattoo AR")
                                .font(.caption2.weight(.bold))
                                .foregroundStyle(.white)
                            Text("·")
                                .foregroundStyle(.white.opacity(0.4))
                            Text(isFrontCamera ? "TrueDepth" : "LiDAR")
                                .font(.system(size: 9 * screenScaleRatio))
                                .foregroundStyle(.white.opacity(0.7))
                            if let distanceMeters {
                                Text("·")
                                    .foregroundStyle(.white.opacity(0.4))
                                Text(String(format: "%.2fm", distanceMeters))
                                    .font(.system(size: 9 * screenScaleRatio, weight: .semibold).monospacedDigit())
                                    .foregroundStyle(.white.opacity(0.9))
                            }
                        }
                        .padding(.vertical, 6)
                        .padding(.horizontal, 14)
                        .glassEffect(.regular.interactive(), in: .capsule)

                        if let statusMessage {
                            Text(statusMessage)
                                .font(.system(size: 9 * screenScaleRatio))
                                .padding(.vertical, 3)
                                .padding(.horizontal, 8)
                                .glassEffect(.regular.tint(.red).interactive(), in: .capsule)
                        }
                        if let captureStatus {
                            Text(captureStatus)
                                .font(.system(size: 9 * screenScaleRatio))
                                .padding(.vertical, 3)
                                .padding(.horizontal, 8)
                                .glassEffect(.regular.tint(.green).interactive(), in: .capsule)
                        }
                        if bodyTrackingEnabled && !isFrontCamera {
                            HStack(spacing: 3) {
                                Circle()
                                    .fill(bodyTracked ? Color.green : Color.orange)
                                    .frame(width: 5, height: 5)
                                Text(bodyTracked ? "Body tracked" : "Looking for person")
                                    .font(.system(size: 9 * screenScaleRatio, weight: .semibold))
                                    .foregroundStyle(.white)
                            }
                            .padding(.vertical, 3)
                            .padding(.horizontal, 8)
                            .glassEffect(
                                .regular.tint(bodyTracked ? .green : .orange).interactive(),
                                in: .capsule
                            )
                            .animation(.easeInOut(duration: 0.2), value: bodyTracked)
                        }
                        // Skin segmentation status indicator
                        if skinSegManager.isReady && !isFrontCamera {
                            HStack(spacing: 3) {
                                Image(systemName: "circle.hexagongrid.fill")
                                    .font(.system(size: 8 * screenScaleRatio))
                                Text("Skin Mask")
                                    .font(.system(size: 9 * screenScaleRatio, weight: .semibold))
                                    .foregroundStyle(.white)
                            }
                            .padding(.vertical, 3)
                            .padding(.horizontal, 8)
                            .glassEffect(.regular.tint(.green).interactive(), in: .capsule)
                        }
                        // Sensitive area indicator — shows when rear camera crosshair is near eyes/ears
                        if isSensitiveAreaNearby && !isFrontCamera && tattooImage != nil {
                            HStack(spacing: 4) {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .font(.system(size: 9 * screenScaleRatio, weight: .bold))
                                    .foregroundStyle(.yellow)
                                Text("Sensitive area — tattoo blocked")
                                    .font(.system(size: 9 * screenScaleRatio, weight: .semibold))
                                    .foregroundStyle(.white)
                            }
                            .padding(.vertical, 3)
                            .padding(.horizontal, 8)
                            .glassEffect(.regular.tint(.red).interactive(), in: .capsule)
                            .transition(.opacity)
                            .animation(.easeInOut(duration: 0.25), value: isSensitiveAreaNearby)
                        }
                        // Mesh stabilization indicator — shows while LiDAR surface is building or when projection is poor
                        if (isMeshStabilizing || isProjectionQualityPoor) && !isSensitiveAreaNearby && !isFrontCamera && tattooImage != nil {
                            HStack(spacing: 4) {
                                ProgressView()
                                    .scaleEffect(0.6)
                                    .tint(.white)
                                Text("Configuring projection...")
                                    .font(.system(size: 9 * screenScaleRatio, weight: .semibold))
                                    .foregroundStyle(.white)
                            }
                            .padding(.vertical, 3)
                            .padding(.horizontal, 8)
                            .glassEffect(.regular.tint(.cyan).interactive(), in: .capsule)
                            .transition(.opacity)
                        }
                        // Recording indicator (tap to stop)
                        if isRecording {
                            Button {
                                toggleRecording()
                            } label: {
                                HStack(spacing: 3) {
                                    Circle()
                                        .fill(.red)
                                        .frame(width: 6, height: 6)
                                    Text("REC \(formatDuration(recordingDuration))")
                                        .font(.system(size: 9 * screenScaleRatio, weight: .bold, design: .monospaced))
                                        .foregroundStyle(.white)
                                }
                                .padding(.vertical, 3)
                                .padding(.horizontal, 8)
                                .glassEffect(.regular.tint(.red).interactive(), in: .capsule)
                            }
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.top, 4)
                    .padding(.bottom, 6)

                    Spacer()

                    // ── ZOOM CONTROL — above bottom bar, right-aligned ──
                    if !isFrontCamera {
                        HStack {
                            Spacer()
                            ExpandableZoomControl(
                                zoom: $cameraZoom,
                                isExpanded: $showZoomSlider
                            )
                        }
                        .padding(.horizontal, 12)
                        .padding(.bottom, 4)
                        .opacity(isRecording ? 0 : 1)
                        .animation(.easeInOut(duration: 0.25), value: isRecording)
                    }

                    // ── BOTTOM BAR — Liquid Glass ──
                    VStack(spacing: 8) {
                        GlassEffectContainer {
                            HStack(spacing: 0) {
                                // Camera Capture
                                Button {
                                    let haptic = UIImpactFeedbackGenerator(style: .medium)
                                    haptic.impactOccurred()
                                    captureRequestID += 1
                                    showCaptureFlash = true
                                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
                                        showCaptureFlash = false
                                    }
                                } label: {
                                    Image(systemName: "camera")
                                        .font(.system(size: 16 * screenScaleRatio, weight: .semibold))
                                        .foregroundStyle(.white)
                                        .padding(12)
                                        .glassEffect(.regular.interactive(), in: .circle)
                                }
                                .frame(maxWidth: .infinity)

                                // Video Record Button
                                Button {
                                    let haptic = UIImpactFeedbackGenerator(style: .medium)
                                    haptic.impactOccurred()
                                    toggleRecording()
                                } label: {
                                    ZStack {
                                        if isRecording {
                                            VStack(spacing: 2) {
                                                RoundedRectangle(cornerRadius: 3)
                                                    .fill(.red)
                                                    .frame(width: 14 * screenScaleRatio, height: 14 * screenScaleRatio)
                                                Text(formatDuration(recordingDuration))
                                                    .font(.system(size: 7 * screenScaleRatio, weight: .bold, design: .monospaced))
                                                    .foregroundStyle(.white)
                                            }
                                        } else {
                                            Circle()
                                                .fill(.red)
                                                .frame(width: 16 * screenScaleRatio, height: 16 * screenScaleRatio)
                                        }
                                    }
                                    .frame(width: 38 * screenScaleRatio, height: 38 * screenScaleRatio)
                                    .glassEffect(
                                        isRecording
                                            ? .regular.tint(.red).interactive()
                                            : .regular.interactive(),
                                        in: .circle
                                    )
                                }
                                .frame(maxWidth: .infinity)

                                // Flip Camera
                                if isFaceTrackingSupported && !isRecording {
                                    Button {
                                        let haptic = UIImpactFeedbackGenerator(style: .medium)
                                        haptic.impactOccurred()
                                        isFrontCamera.toggle()
                                        if isFrontCamera {
                                            cameraZoom = 1.0
                                        }
                                        let availableModes = BodyPartMode.modes(forFrontCamera: isFrontCamera)
                                        if !availableModes.contains(bodyPartMode),
                                           let firstMode = availableModes.first {
                                            bodyPartMode = firstMode
                                        }
                                    } label: {
                                        Image(systemName: "arrow.triangle.2.circlepath")
                                            .font(.system(size: 16 * screenScaleRatio, weight: .semibold))
                                            .foregroundStyle(.white)
                                            .padding(12)
                                            .glassEffect(.regular.interactive(), in: .circle)
                                    }
                                    .frame(maxWidth: .infinity)
                                }

                                // Spatial Lock Toggle (Regular Mode)
                                if !isFrontCamera {
                                    Button {
                                        let haptic = UIImpactFeedbackGenerator(style: .rigid)
                                        haptic.impactOccurred()
                                        regularModeLocked.toggle()
                                    } label: {
                                        Image(systemName: regularModeLocked ? "lock.fill" : "lock.open")
                                            .font(.system(size: 16 * screenScaleRatio, weight: .semibold))
                                            .foregroundStyle(.white)
                                            .padding(12)
                                            .glassEffect(
                                                regularModeLocked
                                                    ? .regular.tint(.green).interactive()
                                                    : .regular.interactive(),
                                                in: .circle
                                            )
                                    }
                                    .disabled((bodyTrackingEnabled && bodyTracked) || sensitiveContentManager.isSensitiveContentDetected || isSensitiveAreaNearby)
                                    .opacity((bodyTrackingEnabled && bodyTracked) || sensitiveContentManager.isSensitiveContentDetected || isSensitiveAreaNearby ? 0.4 : 1.0)
                                    .frame(maxWidth: .infinity)
                                }

                                // Settings (hidden during recording)
                                if !isRecording {
                                    Button {
                                        showControlsSheet = true
                                    } label: {
                                        Image(systemName: "slider.horizontal.3")
                                            .font(.system(size: 16 * screenScaleRatio, weight: .semibold))
                                            .foregroundStyle(.white)
                                            .padding(12)
                                            .glassEffect(.regular.interactive(), in: .circle)
                                    }
                                    .frame(maxWidth: .infinity)
                                }
                            }
                            .padding(.horizontal, 4)
                        }


                        BodyPartModePicker(
                            activeMode: $bodyPartMode,
                            availableModes: BodyPartMode.modes(forFrontCamera: isFrontCamera)
                        )
                        .padding(.bottom, 4)
                        .opacity(isRecording ? 0 : 1)
                        .animation(.easeInOut(duration: 0.25), value: isRecording)
                    }


                    // ── FLOATING STOP BUTTON — always visible during recording ──
                    if isRecording {
                        Button {
                            let haptic = UIImpactFeedbackGenerator(style: .heavy)
                            haptic.impactOccurred()
                            toggleRecording()
                        } label: {
                            HStack(spacing: 8) {
                                RoundedRectangle(cornerRadius: 3)
                                    .fill(.white)
                                    .frame(width: 12 * screenScaleRatio, height: 12 * screenScaleRatio)
                                Text("STOP  \(formatDuration(recordingDuration))")
                                    .font(.system(size: 14 * screenScaleRatio, weight: .bold, design: .monospaced))
                                    .foregroundStyle(.white)
                            }
                            .padding(.vertical, 12)
                            .padding(.horizontal, 24)
                            .glassEffect(.regular.tint(.red).interactive(), in: .capsule)
                        }
                        .padding(.bottom, 8)
                        .transition(.scale.combined(with: .opacity))
                    }
                }

            // ── CAPTURE FLASH ──
            if showCaptureFlash {
                Rectangle()
                    .stroke(Color.white, lineWidth: 4)
                    .ignoresSafeArea()
                    .allowsHitTesting(false)
                    .transition(.opacity)
            }

            // ── VIDEO SAVED CONFIRMATION ──
            if showVideoSaved {
                Color.black.opacity(0.35)
                    .ignoresSafeArea()
                    .allowsHitTesting(false)
                    .transition(.opacity)

                VStack(spacing: 12) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 48 * screenScaleRatio))
                        .foregroundStyle(.green)
                        .symbolEffect(.bounce, value: showVideoSaved)

                    Text("Video Saved")
                        .font(.system(size: 18 * screenScaleRatio, weight: .bold))
                        .foregroundStyle(.white)

                    Text(lastRecordingDuration)
                        .font(.system(size: 13 * screenScaleRatio, weight: .medium, design: .monospaced))
                        .foregroundStyle(.white.opacity(0.7))

                    Text("Saved to Photos")
                        .font(.system(size: 11 * screenScaleRatio))
                        .foregroundStyle(.white.opacity(0.5))
                }
                .padding(28)
                .glassEffect(.regular.interactive(), in: .rect(cornerRadius: 20))
                .transition(.scale.combined(with: .opacity))
                .allowsHitTesting(false)
            }

            if onClose != nil {
                VStack {
                    HStack {
                        Button(action: closeAR) {
                            Image(systemName: "xmark")
                                .font(.system(size: 16, weight: .bold))
                                .foregroundStyle(.white)
                                .frame(width: 40, height: 40)
                                .background(.black.opacity(0.55), in: Circle())
                        }
                        .accessibilityLabel("Close AR preview")
                        Spacer()
                    }
                    Spacer()
                }
                .padding(.top, 8)
                .padding(.horizontal, 12)
            }
        }
        .onAppear {
            tattooRotationDegrees = bodyLocation.presetRotationDegrees
            if !isFrontCamera && !isLiDARSupported {
                statusMessage = "LiDAR is required. This app only works on LiDAR-capable devices."
                showLiDARAlert = true
            }
            // Skin segmentation is initialized via @StateObject
        }
        .onDisappear {
            recordingTimer?.invalidate()
            recordingTimer = nil
            TattooAROrientationLock.current = .allButUpsideDown
        }
        .onChange(of: selectedItem) { _, newItem in
            guard let newItem else { return }
            Task {
                statusMessage = "Loading tattoo..."
                let loadedImage = await loadUIImage(from: newItem)
                await MainActor.run {
                    if let loadedImage {
                        tattooImage = loadedImage
                        statusMessage = isBodyTrackingSupported ? nil : statusMessage
                    } else {
                        statusMessage = "Unable to load the selected image. Please choose a compatible photo."
                    }
                }
            }
        }
        .onChange(of: bodyLocation) { _, newLocation in
            tattooRotationDegrees = newLocation.presetRotationDegrees
        }
        .onChange(of: bodyPartMode) { _, newMode in
            // Clamp scale to the new body part's maximum
            let maxScale = newMode.profile.maxScale
            if tattooScale > maxScale {
                tattooScale = maxScale
            }
            // Reset lock state when switching body parts
            bodyTracked = false
            isSensitiveAreaBlocked = false
            isSensitiveAreaNearby = false
            sensitiveContentManager.reset()
            // Show safety notice every time General mode is selected
            if newMode == .general {
                withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) {
                    showSensitiveAreaDisclaimer = true
                }
            }
        }
        .onChange(of: bodyTracked) { _, isTracked in
            // When placement locks (bodyTracked becomes true), dismiss loading overlay
            if isTracked && isLoadingBodyTracking {
                withAnimation(.easeInOut(duration: 0.4)) {
                    isLoadingBodyTracking = false
                }
            }
        }
        .onChange(of: isSessionReady) { _, ready in
            // Show "Scanning surface..." for 3 seconds when the AR session first becomes ready.
            // This communicates that the LiDAR mesh is still building and the projection
            // may appear incomplete until the mesh stabilizes.
            if ready && !isFrontCamera {
                withAnimation(.easeInOut(duration: 0.3)) { isMeshStabilizing = true }
                DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) {
                    withAnimation(.easeInOut(duration: 0.5)) { isMeshStabilizing = false }
                }
            }
        }
        .alert("Body Tracking Unavailable", isPresented: $showBodyTrackingAlert) {
            Button("OK") {}
        } message: {
            Text("This device doesn’t support body tracking. Please use a LiDAR-capable device to see the tattoo anchored to your body.")
        }
        .alert("LiDAR Required", isPresented: $showLiDARAlert) {
            Button("OK") {}
        } message: {
            Text("This app requires a LiDAR-capable device for realistic tattoo visualization.")
        }
        .sheet(isPresented: $showControlsSheet) {
            ControlsSheet(
                selectedItem: $selectedItem,
                tattooImage: $tattooImage,
                tattooScale: $tattooScale,
                tattooRotationDegrees: $tattooRotationDegrees,
                lockToSurface: $lockToSurface,
                smoothingAmount: $smoothingAmount,
                nudgeX: $nudgeX,
                nudgeY: $nudgeY,
                nudgeZ: $nudgeZ,
                showAdvancedControls: $showAdvancedControls,
                manualPlacementEnabled: $manualPlacementEnabled,
                manualDragOffset: $manualDragOffset,
                bodyTrackingEnabled: $bodyTrackingEnabled,
                showSkeletonOverlay: $showSkeletonOverlay,
                bodyTracked: bodyTracked,
                isLoadingBodyTracking: isLoadingBodyTracking,
                isBodyTrackingSupported: isBodyTrackingSupported,
                isFrontCamera: isFrontCamera,
                onBodyTrackingToggle: handleBodyTrackingToggle,
                maxScale: bodyPartMode.profile.maxScale,
                onResetTattoo: resetTattoo
            )
            .presentationDetents([.medium, .large])
        }
        .overlay {
            if showSplash || !isSessionReady {
                SplashLoadingView(showSplash: $showSplash)
            }
        }
        .overlay {
            bodyTrackingLoadingOverlay
        }

        .onAppear {
            if showSplash {
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.6) {
                    withAnimation(.easeOut(duration: 0.4)) {
                        showSplash = false
                    }
                }
            }
        }
        .overlay {
            sensitiveAreaDisclaimerOverlay
        }
    }

    // MARK: - Sensitive Area Disclaimer (extracted for type-checker performance)
    @ViewBuilder
    private var sensitiveAreaDisclaimerOverlay: some View {
        if showSensitiveAreaDisclaimer {
            VStack {
                VStack(spacing: 16) {
                    HStack(spacing: 12) {
                        Image(systemName: "info.circle.fill")
                            .font(.system(size: 24 * screenScaleRatio, weight: .semibold))
                            .foregroundStyle(.white.opacity(0.7))
                        Text("General Mode Advisory")
                            .font(.system(size: 15 * screenScaleRatio, weight: .bold))
                            .foregroundStyle(.white)
                        Spacer()
                    }

                    Text("This mode enables tattoo projection on any body surface. Due to anatomical complexity and sensitivity, placement on areas such as the eyes, ears, and private regions is not recommended and may produce unreliable or unintended results.\n\nFor the best experience, use dedicated body part modes when available.")
                        .font(.system(size: 13 * screenScaleRatio, weight: .medium))
                        .foregroundStyle(.white.opacity(0.7))
                        .fixedSize(horizontal: false, vertical: true)
                        .lineSpacing(3)

                    sensitiveAreaDisclaimerButton
                }
                .padding(.horizontal, 18)
                .padding(.vertical, 20)
                .glassEffect(.regular, in: .rect(cornerRadius: 16))
                .shadow(color: .black.opacity(0.3), radius: 8, y: 4)
                .padding(.horizontal, 20)
                .padding(.top, 100)
                Spacer()
            }
            .allowsHitTesting(true)
            .transition(.move(edge: .top).combined(with: .opacity))
        }
    }

    @ViewBuilder
    private var sensitiveAreaDisclaimerButton: some View {
        Button {
            withAnimation(.easeOut(duration: 0.2)) {
                showSensitiveAreaDisclaimer = false
            }
        } label: {
            Text("I Understand")
                .font(.system(size: 14 * screenScaleRatio, weight: .semibold))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(
                    Capsule()
                        .fill(.white.opacity(0.15))
                )
        }
    }

    // MARK: - Body Tracking Loading Transition (extracted for type-checker performance)
    @ViewBuilder
    private var bodyTrackingLoadingOverlay: some View {
        if isLoadingBodyTracking {
            ZStack {
                // Dark backdrop
                Color.black.opacity(0.75)
                    .ignoresSafeArea()

                VStack(spacing: 24) {
                    // Pulsing body icon
                    Image(systemName: "figure.stand")
                        .font(.system(size: 56 * screenScaleRatio, weight: .light))
                        .foregroundStyle(.cyan)
                        .symbolEffect(.pulse, options: .repeating)

                    VStack(spacing: 8) {
                        Text("Scanning for \(bodyPartMode.displayName)")
                            .font(.system(size: 18 * screenScaleRatio, weight: .semibold, design: .rounded))
                            .foregroundStyle(.white)

                        Text("Point camera at your body. Tattoo will lock in place automatically.")
                            .font(.system(size: 13 * screenScaleRatio, weight: .regular))
                            .foregroundStyle(.white.opacity(0.6))
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 40)
                    }

                    ProgressView()
                        .tint(.cyan)
                        .scaleEffect(1.2)
                }
            }
            .transition(.opacity)
        }
    }

    private func resetTattoo() {
        tattooImage = ContentView.defaultTattooImage()
        tattooScale = 1.0
        tattooRotationDegrees = bodyLocation.presetRotationDegrees
        nudgeX = 0.0
        nudgeY = 0.0
        nudgeZ = 0.0
        manualDragOffset = .zero
    }

    private func loadUIImage(from item: PhotosPickerItem) async -> UIImage? {
        if let data = try? await item.loadTransferable(type: Data.self),
           let image = UIImage(data: data) {
            return normalizeImage(image)
        }

        return nil
    }

    private func normalizeImage(_ image: UIImage) -> UIImage? {
        if image.cgImage != nil {
            return image
        }

        if let ciImage = image.ciImage {
            let context = CIContext(options: nil)
            if let cgImage = context.createCGImage(ciImage, from: ciImage.extent) {
                return UIImage(cgImage: cgImage)
            }
        }

        let format = UIGraphicsImageRendererFormat()
        format.scale = image.scale
        let renderer = UIGraphicsImageRenderer(size: image.size, format: format)
        let rendered = renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: image.size))
        }
        return rendered.cgImage == nil ? nil : rendered
    }

    private static func defaultTattooImage() -> UIImage? {
        let size = CGSize(width: 512, height: 512)
        let renderer = UIGraphicsImageRenderer(size: size)
        let image = renderer.image { context in
            let rect = CGRect(origin: .zero, size: size)
            context.cgContext.setFillColor(UIColor.clear.cgColor)
            context.cgContext.fill(rect)

            let circleRect = rect.insetBy(dx: 64, dy: 64)
            context.cgContext.setStrokeColor(UIColor.black.cgColor)
            context.cgContext.setLineWidth(18)
            context.cgContext.strokeEllipse(in: circleRect)

            let barRect = CGRect(x: rect.midX - 24, y: rect.minY + 80, width: 48, height: rect.height - 160)
            context.cgContext.setFillColor(UIColor.black.cgColor)
            context.cgContext.fill(barRect)
        }

        return image
    }

    // MARK: - Video Recording (AR-only via Coordinator)
    // ContentView just toggles isRecording — the Coordinator's ARVideoRecorder
    // (which owns arView) handles actual AVFoundation capture via ARView.snapshot().
    // This avoids @State threading issues and uses zero ReplayKit.

    private func toggleRecording() {
        if isRecording {
            // Signal Coordinator to stop via configuration change
            recordingTimer?.invalidate()
            recordingTimer = nil
            lastRecordingDuration = formatDuration(recordingDuration)
            isRecording = false

            // Unlock orientation after recording
            TattooAROrientationLock.current = .allButUpsideDown
            if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
               #available(iOS 16.0, *) {
                windowScene.keyWindow?.rootViewController?.setNeedsUpdateOfSupportedInterfaceOrientations()
            }
        } else {
            // Lock orientation to current state while recording
            if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene {
                switch windowScene.interfaceOrientation {
                case .portrait: TattooAROrientationLock.current = .portrait
                case .portraitUpsideDown: TattooAROrientationLock.current = .portraitUpsideDown
                case .landscapeLeft: TattooAROrientationLock.current = .landscapeLeft
                case .landscapeRight: TattooAROrientationLock.current = .landscapeRight
                default: TattooAROrientationLock.current = .allButUpsideDown
                }
                if #available(iOS 16.0, *) {
                    windowScene.keyWindow?.rootViewController?.setNeedsUpdateOfSupportedInterfaceOrientations()
                }
            } else {
                TattooAROrientationLock.current = .portrait
            }

            isRecording = true
            recordingDuration = 0
            recordingTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
                self.recordingDuration += 1
            }
        }
    }

    private func closeAR() {
        if isRecording {
            toggleRecording()
        }
        recordingTimer?.invalidate()
        recordingTimer = nil
        onClose?()
    }

    private func startRecording() { /* unused — toggleRecording() handles both */ }
    private func stopRecording()  { /* unused — toggleRecording() handles both */ }

    // MARK: - Body Tracking Toggle Helper
    // Called by the Options sheet body tracking button.
    // Previously inline in the toolbar button; extracted so it can be passed as a closure.
    private func handleBodyTrackingToggle() {
        let haptic = UIImpactFeedbackGenerator(style: .medium)
        haptic.impactOccurred()
        if !bodyTrackingEnabled {
            regularModeLocked = false
            withAnimation(.easeInOut(duration: 0.3)) { isLoadingBodyTracking = true }
            bodyTrackingEnabled = true
            DispatchQueue.main.asyncAfter(deadline: .now() + 5.0) {
                if isLoadingBodyTracking {
                    withAnimation(.easeInOut(duration: 0.4)) { isLoadingBodyTracking = false }
                }
            }
        } else if bodyTracked {
            bodyTracked = false
            withAnimation(.easeInOut(duration: 0.3)) { isLoadingBodyTracking = true }
            DispatchQueue.main.asyncAfter(deadline: .now() + 5.0) {
                if isLoadingBodyTracking {
                    withAnimation(.easeInOut(duration: 0.4)) { isLoadingBodyTracking = false }
                }
            }
        } else {
            bodyTrackingEnabled = false
            withAnimation(.easeInOut(duration: 0.3)) { isLoadingBodyTracking = false }
        }
    }

    private func formatDuration(_ seconds: TimeInterval) -> String {
        let mins = Int(seconds) / 60
        let secs = Int(seconds) % 60
        return String(format: "%d:%02d", mins, secs)
    }

    // MARK: - DockKit (Deprecated)
    // DockKit integration has been replaced by skin segmentation + ARBodyAnchor tracking.
}

@available(iOS 26.0, *)
private struct ControlsSheet: View {
    @Binding var selectedItem: PhotosPickerItem?
    @Binding var tattooImage: UIImage?
    @Binding var tattooScale: Float
    @Binding var tattooRotationDegrees: Float
    @Binding var lockToSurface: Bool
    @Binding var smoothingAmount: Float
    @Binding var nudgeX: Float
    @Binding var nudgeY: Float
    @Binding var nudgeZ: Float
    @Binding var showAdvancedControls: Bool
    @Binding var manualPlacementEnabled: Bool
    @Binding var manualDragOffset: CGSize
    // Body tracking (moved from toolbar)
    @Binding var bodyTrackingEnabled: Bool
    @Binding var showSkeletonOverlay: Bool
    var bodyTracked: Bool
    var isLoadingBodyTracking: Bool
    var isBodyTrackingSupported: Bool
    var isFrontCamera: Bool
    var onBodyTrackingToggle: () -> Void
    // Tattoo
    var maxScale: Float
    var onResetTattoo: () -> Void

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 14) {

                    // ── TATTOO SECTION ──
                    VStack(spacing: 12) {
                        HStack {
                            Image(systemName: "photo.artframe")
                                .font(.system(size: 13 * screenScaleRatio, weight: .semibold))
                                .foregroundStyle(.white.opacity(0.6))
                            Text("TATTOO")
                                .font(.system(size: 11 * screenScaleRatio, weight: .bold, design: .rounded))
                                .foregroundStyle(.white.opacity(0.6))
                                .tracking(1.2)
                            Spacer()
                        }

                        if let image = tattooImage {
                            HStack(spacing: 14) {
                                Image(uiImage: image)
                                    .resizable()
                                    .scaledToFit()
                                    .frame(width: 64, height: 64)
                                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                                    .glassEffect(.regular, in: .rect(cornerRadius: 12))

                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Current Tattoo")
                                        .font(.system(size: 12 * screenScaleRatio, weight: .semibold))
                                        .foregroundStyle(.white)
                                    Text("\(Int(image.size.width))×\(Int(image.size.height)) px")
                                        .font(.system(size: 10 * screenScaleRatio, weight: .medium).monospacedDigit())
                                        .foregroundStyle(.white.opacity(0.5))
                                }

                                Spacer()
                            }
                        }

                        HStack(spacing: 10) {
                            PhotosPicker(selection: $selectedItem, matching: .images) {
                                HStack(spacing: 6) {
                                    Image(systemName: "photo.on.rectangle.angled")
                                        .font(.system(size: 12 * screenScaleRatio, weight: .semibold))
                                    Text("Pick Tattoo")
                                        .font(.system(size: 12 * screenScaleRatio, weight: .semibold))
                                }
                                .foregroundStyle(.white)
                                .padding(.vertical, 8)
                                .padding(.horizontal, 14)
                                .glassEffect(.regular.tint(.blue).interactive(), in: .capsule)
                            }

                            Spacer()

                            Button {
                                onResetTattoo()
                            } label: {
                                HStack(spacing: 4) {
                                    Image(systemName: "arrow.counterclockwise")
                                        .font(.system(size: 11 * screenScaleRatio, weight: .semibold))
                                    Text("Reset")
                                        .font(.system(size: 12 * screenScaleRatio, weight: .semibold))
                                }
                                .foregroundStyle(.white.opacity(0.8))
                                .padding(.vertical, 8)
                                .padding(.horizontal, 14)
                                .glassEffect(.regular.tint(.red).interactive(), in: .capsule)
                            }
                        }
                    }
                    .padding(16)
                    .glassEffect(.regular, in: .rect(cornerRadius: 20))

                    // ── PLACEMENT SECTION ──
                    VStack(spacing: 14) {
                        HStack {
                            Image(systemName: "move.3d")
                                .font(.system(size: 13 * screenScaleRatio, weight: .semibold))
                                .foregroundStyle(.white.opacity(0.6))
                            Text("PLACEMENT")
                                .font(.system(size: 11 * screenScaleRatio, weight: .bold, design: .rounded))
                                .foregroundStyle(.white.opacity(0.6))
                                .tracking(1.2)
                            Spacer()
                        }

                        // Size slider
                        VStack(spacing: 4) {
                            HStack {
                                Text("Size")
                                    .font(.system(size: 12 * screenScaleRatio, weight: .medium))
                                    .foregroundStyle(.white.opacity(0.8))
                                Spacer()
                                Text(String(format: "%.2fx", tattooScale))
                                    .font(.system(size: 11 * screenScaleRatio, weight: .semibold).monospacedDigit())
                                    .foregroundStyle(.white.opacity(0.6))
                            }
                            Slider(value: $tattooScale, in: 0.05...maxScale, step: 0.05)
                                .tint(.white.opacity(0.5))
                        }

                        // Rotation slider
                        VStack(spacing: 4) {
                            HStack {
                                Text("Rotate")
                                    .font(.system(size: 12 * screenScaleRatio, weight: .medium))
                                    .foregroundStyle(.white.opacity(0.8))
                                Spacer()
                                Text("\(Int(tattooRotationDegrees))°")
                                    .font(.system(size: 11 * screenScaleRatio, weight: .semibold).monospacedDigit())
                                    .foregroundStyle(.white.opacity(0.6))
                            }
                            Slider(value: $tattooRotationDegrees, in: -180...180, step: 1)
                                .tint(.white.opacity(0.5))
                        }
                    }
                    .padding(16)
                    .glassEffect(.regular, in: .rect(cornerRadius: 20))

                    // ── OPTIONS SECTION ──
                    VStack(spacing: 12) {
                        HStack {
                            Image(systemName: "gearshape.2")
                                .font(.system(size: 13 * screenScaleRatio, weight: .semibold))
                                .foregroundStyle(.white.opacity(0.6))
                            Text("OPTIONS")
                                .font(.system(size: 11 * screenScaleRatio, weight: .bold, design: .rounded))
                                .foregroundStyle(.white.opacity(0.6))
                                .tracking(1.2)
                            Spacer()
                        }

                        // Manual placement toggle
                        HStack {
                            Text("Manual Placement (Drag)")
                                .font(.system(size: 12 * screenScaleRatio, weight: .medium))
                                .foregroundStyle(.white.opacity(0.8))
                            Spacer()
                            Toggle("", isOn: $manualPlacementEnabled)
                                .labelsHidden()
                                .onChange(of: manualPlacementEnabled) { _, isEnabled in
                                    if !isEnabled { manualDragOffset = .zero }
                                }
                        }

                        Divider().opacity(0.3)

                        // Advanced toggle
                        Button {
                            withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                                showAdvancedControls.toggle()
                            }
                        } label: {
                            HStack {
                                Text("Advanced")
                                    .font(.system(size: 12 * screenScaleRatio, weight: .medium))
                                    .foregroundStyle(.white.opacity(0.8))
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.system(size: 10 * screenScaleRatio, weight: .semibold))
                                    .foregroundStyle(.white.opacity(0.4))
                                    .rotationEffect(.degrees(showAdvancedControls ? 90 : 0))
                            }
                        }

                        if showAdvancedControls {
                            VStack(spacing: 10) {
                                // Lock to surface
                                HStack {
                                    Text("Lock To Surface")
                                        .font(.system(size: 11 * screenScaleRatio, weight: .medium))
                                        .foregroundStyle(.white.opacity(0.7))
                                    Spacer()
                                    Toggle("", isOn: $lockToSurface)
                                        .labelsHidden()
                                }

                                // Smoothing slider
                                glassSlider(label: "Smooth", value: $smoothingAmount, range: 0.0...0.5, step: 0.01, format: "%.2f")

                                // Nudge sliders
                                glassSlider(label: "Nudge X", value: $nudgeX, range: -0.06...0.06, step: 0.001, format: "%.3f")
                                glassSlider(label: "Nudge Y", value: $nudgeY, range: -0.06...0.06, step: 0.001, format: "%.3f")
                                glassSlider(label: "Nudge Z", value: $nudgeZ, range: -0.06...0.06, step: 0.001, format: "%.3f")
                            }
                            .padding(12)
                            .glassEffect(.regular, in: .rect(cornerRadius: 14))
                            .transition(.opacity.combined(with: .move(edge: .top)))
                        }
                    }
                    .padding(16)
                    .glassEffect(.regular, in: .rect(cornerRadius: 20))

                    // ── BODY TRACKING SECTION ──
                    if !isFrontCamera && isBodyTrackingSupported {
                        VStack(spacing: 12) {
                            HStack {
                                Image(systemName: "person.and.background.dotted")
                                    .font(.system(size: 13 * screenScaleRatio, weight: .semibold))
                                    .foregroundStyle(.white.opacity(0.6))
                                Text("BODY TRACKING")
                                    .font(.system(size: 11 * screenScaleRatio, weight: .bold, design: .rounded))
                                    .foregroundStyle(.white.opacity(0.6))
                                    .tracking(1.2)
                                Spacer()
                            }

                            // Body Tracking Toggle
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Enable Body Tracking")
                                        .font(.system(size: 12 * screenScaleRatio, weight: .medium))
                                        .foregroundStyle(.white.opacity(0.85))
                                    Text("Anchors tattoo to body and follows movement")
                                        .font(.system(size: 10 * screenScaleRatio))
                                        .foregroundStyle(.white.opacity(0.4))
                                }
                                Spacer()
                                Button {
                                    onBodyTrackingToggle()
                                } label: {
                                    Image(systemName: bodyTrackingEnabled
                                        ? (bodyTracked ? "lock.fill" : "person.and.background.dotted")
                                        : "person.and.background.striped.horizontal")
                                        .font(.system(size: 16 * screenScaleRatio, weight: .semibold))
                                        .foregroundStyle(.white)
                                        .padding(10)
                                        .glassEffect(
                                            bodyTrackingEnabled
                                                ? (bodyTracked
                                                    ? .regular.tint(.green).interactive()
                                                    : .regular.tint(.cyan).interactive())
                                                : .regular.interactive(),
                                            in: .circle
                                        )
                                }
                                .disabled(isLoadingBodyTracking)
                            }

                            Divider().opacity(0.3)

                            // Skeleton Overlay Toggle
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Skeleton Overlay")
                                        .font(.system(size: 12 * screenScaleRatio, weight: .medium))
                                        .foregroundStyle(.white.opacity(0.85))
                                    Text("Show body joint markers on screen")
                                        .font(.system(size: 10 * screenScaleRatio))
                                        .foregroundStyle(.white.opacity(0.4))
                                }
                                Spacer()
                                Button {
                                    showSkeletonOverlay.toggle()
                                } label: {
                                    Image(systemName: showSkeletonOverlay ? "figure.stand" : "figure.stand.line.dotted.figure.stand")
                                        .font(.system(size: 16 * screenScaleRatio, weight: .semibold))
                                        .foregroundStyle(.white)
                                        .padding(10)
                                        .glassEffect(
                                            showSkeletonOverlay
                                                ? .regular.tint(.green).interactive()
                                                : .regular.interactive(),
                                            in: .circle
                                        )
                                }
                            }
                        }
                        .padding(16)
                        .glassEffect(.regular, in: .rect(cornerRadius: 20))
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 8)
                .padding(.bottom, 20)
            }
            .scrollContentBackground(.hidden)
            .background(.clear)
            .navigationTitle("Controls")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    /// Reusable glass-styled slider row
    @ViewBuilder
    private func glassSlider(label: String, value: Binding<Float>, range: ClosedRange<Float>, step: Float, format: String) -> some View {
        VStack(spacing: 2) {
            HStack {
                Text(label)
                    .font(.system(size: 11 * screenScaleRatio, weight: .medium))
                    .foregroundStyle(.white.opacity(0.7))
                Spacer()
                Text(String(format: format, value.wrappedValue))
                    .font(.system(size: 10 * screenScaleRatio, weight: .semibold).monospacedDigit())
                    .foregroundStyle(.white.opacity(0.5))
            }
            Slider(value: value, in: range, step: step)
                .tint(.white.opacity(0.4))
        }
    }
}
// MARK: - Crosshair Alignment Indicator

/// Minimal crosshair overlay for manual tattoo alignment in regular mode.
/// Thin white lines forming a cross at screen center with a small gap.
private struct CrosshairView: View {
    /// Length of each crosshair arm (from gap edge to tip)
    private let armLength: CGFloat = 18
    /// Gap radius around center (half the empty space)
    private let gapRadius: CGFloat = 6
    /// Line thickness
    private let lineWidth: CGFloat = 1.2

    var body: some View {
        ZStack {
            // Vertical line — top arm
            Rectangle()
                .fill(Color.white)
                .frame(width: lineWidth, height: armLength)
                .offset(y: -(gapRadius + armLength / 2))

            // Vertical line — bottom arm
            Rectangle()
                .fill(Color.white)
                .frame(width: lineWidth, height: armLength)
                .offset(y: gapRadius + armLength / 2)

            // Horizontal line — left arm
            Rectangle()
                .fill(Color.white)
                .frame(width: armLength, height: lineWidth)
                .offset(x: -(gapRadius + armLength / 2))

            // Horizontal line — right arm
            Rectangle()
                .fill(Color.white)
                .frame(width: armLength, height: lineWidth)
                .offset(x: gapRadius + armLength / 2)
        }
        .compositingGroup()
        .shadow(color: .black.opacity(0.5), radius: 1, x: 0, y: 0)
        .opacity(0.8)
    }
}

@available(iOS 26.0, *)
private struct SplashLoadingView: View {
    @Binding var showSplash: Bool
    @State private var pulse: Bool = false

    var body: some View {
        ZStack {
            // Dark gradient background — gives glass material something to refract
            LinearGradient(
                colors: [Color(white: 0.08), Color(white: 0.04), .black],
                startPoint: .topLeading, endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 20) {
                SplashIcon()
                    .frame(width: 120, height: 120)
                    .scaleEffect(pulse ? 1.05 : 0.95)
                    .opacity(pulse ? 1.0 : 0.8)
                    .animation(.easeInOut(duration: 1.0).repeatForever(autoreverses: true), value: pulse)

                Text("Live Tattoo AR")
                    .font(.headline.weight(.semibold))
                    .foregroundStyle(.white)
                    .padding(.vertical, 6)
                    .padding(.horizontal, 16)
                    .glassEffect(.regular.interactive(), in: .capsule)

                Text(showSplash ? "Initializing AR..." : "Loading...")
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.7))
            }
        }
        .onAppear {
            pulse = true
        }
        .transition(.opacity)
    }
}

private struct SplashIcon: View {
    var body: some View {
        if let uiImage = loadAppIcon() {
            Image(uiImage: uiImage)
                .resizable()
                .scaledToFit()
                .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        } else if let uiImage = UIImage(named: "AppIconPreview") {
            Image(uiImage: uiImage)
                .resizable()
                .scaledToFit()
                .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        } else {
            Image(systemName: "sparkles")
                .resizable()
                .scaledToFit()
                .foregroundStyle(.white)
                .padding(28)
                .background(.white.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        }
    }

    private func loadAppIcon() -> UIImage? {
        guard let icons = Bundle.main.infoDictionary?["CFBundleIcons"] as? [String: Any],
              let primary = icons["CFBundlePrimaryIcon"] as? [String: Any],
              let iconFiles = primary["CFBundleIconFiles"] as? [String],
              let iconName = iconFiles.last else {
            return nil
        }
        return UIImage(named: iconName)
    }
}

// MARK: - Camera-App-Style Body Part Mode Picker

// MARK: - Camera Zoom Control (Expandable)

/// A small zoom-level button that expands to a full-width horizontal slider.
/// Button sits above the right side of the action bar. When tapped, a
/// horizontal slider expands across the full width with 1x/2x/5x snap points.
/// Auto-collapses after 3 seconds of inactivity.
@available(iOS 26.0, *)
private struct ExpandableZoomControl: View {
    @Binding var zoom: CGFloat
    @Binding var isExpanded: Bool
    private let minZoom: CGFloat = 1.0
    private let maxZoom: CGFloat = 5.0
    private let snapPoints: [(label: String, value: CGFloat)] = [
        ("1x", 1.0), ("2x", 2.0), ("5x", 5.0)
    ]

    @State private var collapseTimer: Timer?
    private let haptic = UIImpactFeedbackGenerator(style: .light)

    private func normalizedPosition(for z: CGFloat) -> CGFloat {
        (z - minZoom) / (maxZoom - minZoom)
    }

    private func zoomValue(for norm: CGFloat) -> CGFloat {
        minZoom + norm * (maxZoom - minZoom)
    }

    private func scheduleCollapse() {
        collapseTimer?.invalidate()
        collapseTimer = Timer.scheduledTimer(withTimeInterval: 3.0, repeats: false) { _ in
            withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                isExpanded = false
            }
        }
    }

    var body: some View {
        if isExpanded {
            // ── EXPANDED: Full-width horizontal slider ──
            HStack(spacing: 0) {
                // Snap buttons
                ForEach(Array(snapPoints.enumerated()), id: \.offset) { idx, snap in
                    Button {
                        haptic.impactOccurred()
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.75)) {
                            zoom = snap.value
                        }
                        scheduleCollapse()
                    } label: {
                        Text(snap.label)
                            .font(.system(size: 11, weight: isNearSnap(snap.value) ? .bold : .medium,
                                          design: .rounded))
                            .foregroundStyle(isNearSnap(snap.value)
                                ? Color(red: 1.0, green: 0.82, blue: 0.25)
                                : .white.opacity(0.6))
                            .frame(width: 34, height: 28)
                    }

                    // Slider track between 1x and the rest
                    if idx == 0 {
                        expandedSliderTrack
                    }
                }

                // Close button
                Button {
                    haptic.impactOccurred()
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                        isExpanded = false
                    }
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 9 * screenScaleRatio, weight: .bold))
                        .foregroundStyle(.white.opacity(0.5))
                        .frame(width: 24, height: 28)
                }
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .glassEffect(.regular.interactive(), in: .capsule)
            .transition(.asymmetric(
                insertion: .scale(scale: 0.5, anchor: .trailing).combined(with: .opacity),
                removal: .scale(scale: 0.5, anchor: .trailing).combined(with: .opacity)
            ))
            .onAppear { scheduleCollapse() }
            .onDisappear { collapseTimer?.invalidate() }
        } else {
            // ── COLLAPSED: Small zoom button ──
            Button {
                haptic.impactOccurred()
                withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                    isExpanded = true
                }
            } label: {
                Text(String(format: "%.1fx", zoom))
                    .font(.system(size: 10 * screenScaleRatio, weight: .bold, design: .rounded))
                    .foregroundStyle(zoom > 1.05
                        ? Color(red: 1.0, green: 0.82, blue: 0.25)
                        : .white)
                    .frame(width: 36, height: 36)
                    .glassEffect(
                        zoom > 1.05
                            ? .regular.tint(Color(red: 0.6, green: 0.5, blue: 0.1)).interactive()
                            : .regular.interactive(),
                        in: .circle
                    )
            }
            .transition(.asymmetric(
                insertion: .scale(scale: 0.5, anchor: .trailing).combined(with: .opacity),
                removal: .scale(scale: 0.5, anchor: .trailing).combined(with: .opacity)
            ))
        }
    }

    private func isNearSnap(_ value: CGFloat) -> Bool {
        abs(zoom - value) < 0.15
    }

    private var expandedSliderTrack: some View {
        GeometryReader { geo in
            let trackWidth = geo.size.width
            let thumbX = normalizedPosition(for: zoom) * trackWidth

            ZStack(alignment: .leading) {
                Capsule()
                    .fill(.white.opacity(0.15))
                    .frame(height: 3)

                Capsule()
                    .fill(Color(red: 1.0, green: 0.82, blue: 0.25).opacity(0.5))
                    .frame(width: max(0, thumbX), height: 3)

                ZStack {
                    Circle()
                        .fill(Color(red: 1.0, green: 0.82, blue: 0.25))
                        .frame(width: 20, height: 20)
                        .shadow(color: .black.opacity(0.3), radius: 2, y: 1)

                    Text(String(format: "%.1f", zoom))
                        .font(.system(size: 7 * screenScaleRatio, weight: .bold, design: .rounded))
                        .foregroundStyle(.black)
                }
                .offset(x: thumbX - 10)
            }
            .frame(height: 28)
            .contentShape(Rectangle())
            .gesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { value in
                        let norm = max(0, min(1, value.location.x / trackWidth))
                        let newZoom = zoomValue(for: norm)
                        zoom = max(minZoom, min(maxZoom, newZoom))
                        scheduleCollapse()
                    }
                    .onEnded { _ in
                        for snap in snapPoints {
                            if abs(zoom - snap.value) < 0.25 {
                                haptic.impactOccurred()
                                withAnimation(.spring(response: 0.2, dampingFraction: 0.8)) {
                                    zoom = snap.value
                                }
                                break
                            }
                        }
                        scheduleCollapse()
                    }
            )
        }
        .frame(height: 28)
    }
}

@available(iOS 26.0, *)
private struct BodyPartModePicker: View {
    @Binding var activeMode: BodyPartMode
    var availableModes: [BodyPartMode]

    private let haptic = UIImpactFeedbackGenerator(style: .light)

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 18) {
                    ForEach(availableModes) { mode in
                        VStack(spacing: 4) {
                            Text(mode.displayName)
                                .font(.system(size: 11 * screenScaleRatio, weight: mode == activeMode ? .bold : .medium))
                                .foregroundStyle(mode == activeMode
                                    ? Color(red: 1.0, green: 0.82, blue: 0.25)
                                    : .white.opacity(0.55))
                                .scaleEffect(mode == activeMode ? 1.1 : 1.0)
                                .animation(.spring(response: 0.3, dampingFraction: 0.7), value: activeMode)

                            // Gold dot indicator under active mode
                            Circle()
                                .fill(mode == activeMode
                                    ? Color(red: 1.0, green: 0.82, blue: 0.25)
                                    : .clear)
                                .frame(width: 5, height: 5)
                                .animation(.easeInOut(duration: 0.2), value: activeMode)
                        }
                        .id(mode)
                        .onTapGesture {
                            guard mode != activeMode else { return }
                            haptic.impactOccurred()
                            withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                                activeMode = mode
                            }
                            withAnimation {
                                proxy.scrollTo(mode, anchor: .center)
                            }
                        }
                    }
                }
                .padding(.horizontal, 40)
            }
            .onChange(of: activeMode) { _, newMode in
                withAnimation {
                    proxy.scrollTo(newMode, anchor: .center)
                }
            }
        }
        .frame(height: 36)
        .glassEffect(.regular.interactive(), in: .capsule)
        .padding(.horizontal, 12)
    }
}

// MARK: - AR Video Recorder
/// Captures the ARView's rendered output (tattoo + camera feed) as a clean MP4.
/// Uses ARView.snapshot() + CADisplayLink + AVAssetWriter — zero ReplayKit, zero screen recording.
/// Must live in the Coordinator (a reference type) so closures and threading are safe.
private final class ARVideoRecorder {
    private var assetWriter: AVAssetWriter?
    private var videoInput: AVAssetWriterInput?
    private var pixelBufferAdaptor: AVAssetWriterInputPixelBufferAdaptor?
    private var displayLink: CADisplayLink?
    private(set) var isRecording: Bool = false
    private weak var arView: ARView?
    private var sessionStartTime: CFTimeInterval = 0
    private var isCapturingFrame: Bool = false
    private var outputURL: URL?

    /// Called on the main thread when recording finishes. URL is nil on failure.
    var onStopped: ((URL?) -> Void)?

    func start(arView: ARView) {
        guard !isRecording else { return }
        self.arView = arView

        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent("TattooAR_\(Int(Date().timeIntervalSince1970)).mp4")
        try? FileManager.default.removeItem(at: url)
        self.outputURL = url

        guard let writer = try? AVAssetWriter(outputURL: url, fileType: .mp4) else { return }

        // Match ARView bounds for pixel-perfect capture
        let bounds = arView.bounds
        let scale  = UIScreen.main.scale
        let w = Int(bounds.width  * scale)
        let h = Int(bounds.height * scale)

        let videoSettings: [String: Any] = [
            AVVideoCodecKey: AVVideoCodecType.hevc,
            AVVideoWidthKey: w,
            AVVideoHeightKey: h,
            AVVideoCompressionPropertiesKey: [
                AVVideoAverageBitRateKey: 8_000_000,  // 8 Mbps — good quality AR
                AVVideoExpectedSourceFrameRateKey: 30
            ]
        ]
        let input = AVAssetWriterInput(mediaType: .video, outputSettings: videoSettings)
        input.expectsMediaDataInRealTime = true

        let srcAttrs: [String: Any] = [
            kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
            kCVPixelBufferWidthKey  as String: w,
            kCVPixelBufferHeightKey as String: h
        ]
        let adaptor = AVAssetWriterInputPixelBufferAdaptor(
            assetWriterInput: input,
            sourcePixelBufferAttributes: srcAttrs
        )

        guard writer.canAdd(input) else { return }
        writer.add(input)
        writer.startWriting()
        writer.startSession(atSourceTime: .zero)

        assetWriter       = writer
        videoInput        = input
        pixelBufferAdaptor = adaptor
        isRecording       = true
        sessionStartTime  = CACurrentMediaTime()

        displayLink = CADisplayLink(target: self, selector: #selector(captureFrame))
        displayLink?.preferredFrameRateRange = CAFrameRateRange(minimum: 24, maximum: 30, preferred: 30)
        displayLink?.add(to: .main, forMode: .common)
    }

    @objc private func captureFrame(_ link: CADisplayLink) {
        guard !isCapturingFrame, let arView = arView else { return }
        isCapturingFrame = true
        let elapsed = link.timestamp - sessionStartTime
        let pts = CMTime(seconds: elapsed, preferredTimescale: 600)

        arView.snapshot(saveToHDR: false) { [weak self] image in
            defer { self?.isCapturingFrame = false }
            guard let self, self.isRecording,
                  let image,
                  let input   = self.videoInput,
                  let adaptor = self.pixelBufferAdaptor,
                  input.isReadyForMoreMediaData
            else { return }
            if let px = image.toARPixelBuffer() {
                adaptor.append(px, withPresentationTime: pts)
            }
        }
    }

    func stop() {
        guard isRecording else { return }
        isRecording = false
        displayLink?.invalidate()
        displayLink    = nil
        isCapturingFrame = false

        guard let writer = assetWriter, let input = videoInput else {
            DispatchQueue.main.async { self.onStopped?(nil) }
            return
        }
        input.markAsFinished()
        let url = outputURL
        writer.finishWriting { [weak self] in
            guard let self else { return }
            let finalURL = writer.status == .completed ? url : nil
            self.assetWriter        = nil
            self.videoInput         = nil
            self.pixelBufferAdaptor = nil
            DispatchQueue.main.async { self.onStopped?(finalURL) }
        }
    }
}

private extension UIImage {
    /// Renders UIImage into a CVPixelBuffer (BGRA) for AVAssetWriter.
    func toARPixelBuffer() -> CVPixelBuffer? {
        let w = Int(size.width  * scale)
        let h = Int(size.height * scale)
        let attrs: [String: Any] = [
            kCVPixelBufferCGImageCompatibilityKey        as String: true,
            kCVPixelBufferCGBitmapContextCompatibilityKey as String: true
        ]
        var px: CVPixelBuffer?
        CVPixelBufferCreate(kCFAllocatorDefault, w, h, kCVPixelFormatType_32BGRA, attrs as CFDictionary, &px)
        guard let buffer = px else { return nil }
        CVPixelBufferLockBaseAddress(buffer, [])
        defer { CVPixelBufferUnlockBaseAddress(buffer, []) }
        guard let ctx = CGContext(
            data: CVPixelBufferGetBaseAddress(buffer),
            width: w, height: h,
            bitsPerComponent: 8,
            bytesPerRow: CVPixelBufferGetBytesPerRow(buffer),
            space: CGColorSpaceCreateDeviceRGB(),
            bitmapInfo: CGBitmapInfo.byteOrder32Little.rawValue | CGImageAlphaInfo.premultipliedFirst.rawValue
        ) else { return nil }
        // ── Fix vertical flip ──
        // CGContext uses bottom-left origin; UIImage uses top-left.
        // Without this transform, the recorded video appears upside-down in the gallery.
        ctx.translateBy(x: 0, y: CGFloat(h))
        ctx.scaleBy(x: 1.0, y: -1.0)
        UIGraphicsPushContext(ctx)
        draw(in: CGRect(x: 0, y: 0, width: w, height: h))
        UIGraphicsPopContext()
        return buffer
    }
}

private struct TattooARView: UIViewRepresentable {
    var configuration: TattooConfiguration
    @Binding var tattooScale: Float
    @Binding var tattooRotationDegrees: Float
    @Binding var statusMessage: String?
    @Binding var distanceMeters: Float?
    @Binding var isSessionReady: Bool
    @Binding var captureRequestID: Int
    @Binding var captureStatus: String?
    @Binding var bodyTracked: Bool
    @Binding var isRecording: Bool
    @Binding var isProjectionQualityPoor: Bool
    @Binding var isSensitiveAreaBlocked: Bool
    @Binding var isSensitiveAreaNearby: Bool
    var skinSegmentationManager: SkinSegmentationManager
    var sensitiveContentManager: SensitiveContentManager
    @Binding var cameraZoom: CGFloat

    func makeCoordinator() -> Coordinator {
        Coordinator(
            configuration: configuration,
            tattooScale: $tattooScale,
            tattooRotationDegrees: $tattooRotationDegrees,
            statusMessage: $statusMessage,
            distanceMeters: $distanceMeters,
            isSessionReady: $isSessionReady,
            captureStatus: $captureStatus,
            bodyTracked: $bodyTracked,
            isRecording: $isRecording,
            isProjectionQualityPoor: $isProjectionQualityPoor,
            isSensitiveAreaBlocked: $isSensitiveAreaBlocked,
            isSensitiveAreaNearby: $isSensitiveAreaNearby
        )
    }

    func makeUIView(context: Context) -> UIView {
        // Container clips the scaled ARView to produce true zoom.
        // We cannot transform ARView directly because RealityKit
        // detects its own transform and compensates (adjusts projection).
        let container = UIView(frame: .zero)
        container.clipsToBounds = true
        container.backgroundColor = .black

        let arView = ARView(frame: .zero)
        arView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        container.addSubview(arView)

        context.coordinator.attachARView(arView)
        context.coordinator.skinSegmentationManager = skinSegmentationManager
        context.coordinator.sensitiveContentManager = sensitiveContentManager

        // UIKit gesture recognizers for both cameras
        // Tap: face/body placement. Pinch/Rotation: both cameras.

        // Tap: face/body placement (handler routes by camera)
        let tap = UITapGestureRecognizer(
            target: context.coordinator,
            action: #selector(Coordinator.handleFaceTap(_:))
        )
        tap.isEnabled = true  // Enabled for both cameras
        arView.addGestureRecognizer(tap)
        context.coordinator.faceTapGesture = tap

        // Pinch: scale
        let pinch = UIPinchGestureRecognizer(
            target: context.coordinator,
            action: #selector(Coordinator.handlePinch(_:))
        )
        pinch.isEnabled = true  // Enabled for both cameras
        arView.addGestureRecognizer(pinch)
        context.coordinator.facePinchGesture = pinch

        // Rotation: rotate
        let rotation = UIRotationGestureRecognizer(
            target: context.coordinator,
            action: #selector(Coordinator.handleRotation(_:))
        )
        rotation.isEnabled = true  // Enabled for both cameras
        arView.addGestureRecognizer(rotation)
        context.coordinator.faceRotationGesture = rotation

        // Double-tap: relocate tattoo when body tracking is locked
        let bodyRelocate = UITapGestureRecognizer(
            target: context.coordinator,
            action: #selector(Coordinator.handleBodyTapRelocate(_:))
        )
        bodyRelocate.numberOfTapsRequired = 2
        bodyRelocate.isEnabled = true
        arView.addGestureRecognizer(bodyRelocate)
        context.coordinator.bodyTapRelocateGesture = bodyRelocate

        // Single tap should wait for double-tap to fail first
        tap.require(toFail: bodyRelocate)

        // Allow simultaneous gestures (pinch + rotation at same time)
        pinch.delegate = context.coordinator
        rotation.delegate = context.coordinator

        return container
    }

    func updateUIView(_ uiView: UIView, context: Context) {
        context.coordinator.updateConfiguration(configuration)
        context.coordinator.handleCaptureRequest(captureRequestID)

        // Apply digital zoom by scaling the ARView child inside the
        // clipping container. The container stays screen-sized, the
        // ARView scales up, and the container clips the overflow —
        // producing a center-crop zoom effect. RealityKit doesn't
        // detect any transform on the container, so it renders normally.
        guard let arView = uiView.subviews.first else { return }
        let zoom = cameraZoom
        if zoom > 1.01 {
            arView.transform = CGAffineTransform(scaleX: zoom, y: zoom)
        } else {
            arView.transform = .identity
        }
    }

    static func dismantleUIView(_ uiView: UIView, coordinator: Coordinator) {
        coordinator.shutdown()
    }

    final class Coordinator: NSObject, ARSessionDelegate, UIGestureRecognizerDelegate {
        private var configuration: TattooConfiguration
        private var tattooScale: Binding<Float>
        private var tattooRotationDegrees: Binding<Float>
        private var statusMessage: Binding<String?>
        private var distanceMeters: Binding<Float?>
        private var isSessionReady: Binding<Bool>
        private var isProjectionQualityPoor: Binding<Bool>
        private var isSensitiveAreaNearby: Binding<Bool>
        private var captureStatus: Binding<String?>
        private var lastCaptureRequestID: Int = 0
        private weak var arView: ARView?
        private var bodyAnchorEntity: AnchorEntity?
        private var previewAnchorEntity: AnchorEntity?
        private var worldAnchorEntity: AnchorEntity?
        private var projectionAnchorEntity: AnchorEntity?
        private var projectionEntity: ModelEntity?
        private var tattooEntity: ModelEntity?
        private var lastImageIdentifier: ObjectIdentifier?
        private var lastLocation: BodyLocation?
        private var lastScale: Float?
        private var lastRotation: Float?
        private var lastNudge: SIMD3<Float>?
        private var lastLockToSurface: Bool?
        private var lastSmoothing: Float?
        private var lastSmoothedTransform: Transform?
        private var lastBodyAnchorUpdate: Date?
        private var usingPreviewPlacement: Bool = false
        private var lastWorldPlacementTime: Date?
        private var latestBodyAnchor: ARBodyAnchor?
        private var meshAnchors: [UUID: ARMeshAnchor] = [:]
        private var lastProjectionTime: Date?
        /// Anti-flicker: time of the last successful mesh projection
        private var lastSuccessfulProjectionTime: Date?
        /// Anti-flicker: count of consecutive projection failures
        private var consecutiveProjectionFailures: Int = 0
        /// Anti-flicker: minimum time (seconds) to hold projection visible after last success
        private let projectionHoldDuration: TimeInterval = 1.0  // Increased for movement resilience
        /// Cached body joint up-vector (spine Y axis in world space) for tilt-locked UV projection
        private var bodyJointUpVector: SIMD3<Float>?
        /// Cached body joint forward-vector (spine Z axis in world space) for body-aligned projection normal
        private var bodyJointForwardVector: SIMD3<Float>?
        /// Which body side (left/right) was detected with higher confidence for bilateral parts
        private var detectedBodySide: DetectedBodySide = .left
        /// Cached normalized Vision positions of sensitive head joints (ears, eyes)
        /// Used for rear-camera proximity detection to block tattoo on face areas.
        private var cachedHeadJointPositions: [(name: String, position: CGPoint)] = []
        /// Minimum decal size depends on camera mode — face tattoos can be much smaller
        private var minimumDecalSizeMeters: Float {
            configuration.bodyPartMode.requiresFrontCamera ? 0.005 : 0.02
        }
        private var latestFaceAnchor: ARFaceAnchor?
        private var faceAnchorEntity: AnchorEntity?
        private var currentlyUsingFrontCamera: Bool = false
        /// Face-local offset for tap-to-place. The user taps on their face
        /// and this stores the position in face-anchor-local coordinates
        /// so the tattoo sticks to that spot as the face moves.
        private var faceTapLocalOffset: SIMD3<Float> = .zero
        /// Body-tracking tap-to-place offset. Stored as a delta from the default
        /// skeletonLocalOffset so the user can reposition the tattoo on the chest.
        private var bodyTapNudgeOffset: SIMD3<Float> = .zero
        /// TrueDepth depth data for depth-based positioning
        private var latestDepthData: AVDepthData?
        private var latestCameraIntrinsics: simd_float3x3?
        private var latestCameraTransform: simd_float4x4?
        private var latestCameraImageResolution: CGSize?
        fileprivate var faceTapGesture: UITapGestureRecognizer?
        fileprivate var facePinchGesture: UIPinchGestureRecognizer?
        fileprivate var faceRotationGesture: UIRotationGestureRecognizer?
        /// Base values for UIKit gesture tracking
        private var uikitPinchBaseScale: Float = 0.45
        private var uikitRotationBaseAngle: Float = 0.0

        // MARK: - Skin Segmentation
        /// Reference to the shared skin segmentation manager
        var skinSegmentationManager: SkinSegmentationManager?
        var sensitiveContentManager: SensitiveContentManager?
        /// ARKit's built-in person segmentation buffer (255=person, 0=background).
        /// More reliable than skin-only model for person vs background distinction.
        private var latestPersonSegBuffer: CVPixelBuffer?

        // MARK: - Place-and-Lock State
        /// Whether the tattoo is locked to a world position (Phase B).
        /// When false, body tracking is in detection mode (Phase A).
        private var isPlacementLocked: Bool = false
        /// The VIO-locked world position where the tattoo was placed
        private var lockedProjectionCenter: SIMD3<Float>?
        /// The surface normal at the locked placement point
        private var lockedSurfaceNormal: SIMD3<Float>?
        /// Camera view direction (center→camera, normalized) at lock time — stable backface reference
        private var lockedCameraDirection: SIMD3<Float>?
        /// Camera position at lock time — stable depth filter reference
        private var lockedCameraPosition: SIMD3<Float>?
        /// Flags that LiDAR mesh near the locked point has updated (needs re-projection)
        private var meshNeedsReProjection: Bool = true
        /// Last camera forward direction when projection was computed
        private var lastLockedCameraForward: SIMD3<Float>?
        /// Last camera position when projection was computed (for translation-based re-projection)
        private var lastLockedCameraPosition: SIMD3<Float>?
        /// Drift detection: last time we ran Vision body pose for drift checking
        private var lastDriftCheckTime: Date?
        /// Drift detection interval (1 Hz) — much slower than Phase A detection (4 Hz)
        private let driftCheckInterval: TimeInterval = 1.0
        /// Drift correction smoothing factor (0.05 = very gentle nudge)
        private let driftCorrectionRate: Float = 0.05
        /// Drift threshold: body must move >3cm before correction kicks in
        private let driftThreshold: Float = 0.03
        /// Re-lock threshold: body moved >10cm — position considered lost
        private let relockThreshold: Float = 0.10
        /// Tap gesture for relocating the tattoo in locked mode
        fileprivate var bodyTapRelocateGesture: UITapGestureRecognizer?
        /// Phase A: consecutive successful detections required before locking
        private var phaseADetectionCount: Int = 0
        /// Last time Vision successfully detected a body (for presence timeout)
        private var lastBodyDetectionTime: Date?
        /// Phase B: how long without body detection before hiding (seconds)
        private let bodyPresenceHideTimeout: TimeInterval = 2.0
        /// Phase B: how long without body detection before unlocking (seconds)
        private let bodyPresenceUnlockTimeout: TimeInterval = 4.0
        /// Phase A: minimum consecutive detections required before locking
        private let minDetectionsForLock: Int = 3

        // MARK: - Vision Body Pose Tracking State
        private var bodyTracked: Binding<Bool>
        private var isRecording: Binding<Bool>
        private var isSensitiveAreaBlocked: Binding<Bool>

        // MARK: - AR Video Recorder
        let videoRecorder = ARVideoRecorder()
        private var bodyPoseWorldPosition: SIMD3<Float>?
        private var lastBodyPoseDetectionTime: Date?
        private let bodyPoseDetectionInterval: TimeInterval = 0.25  // 4Hz — sufficient for body tracking
        private var isProcessingBodyPose: Bool = false
        /// Auto-disable body tracking when subject is closer than this distance (meters)
        private let bodyTrackingAutoDisableDistance: Float = 0.3
        /// Reusable Vision body pose request — creating one per frame is expensive
        private lazy var bodyPoseRequest: VNDetectHumanBodyPoseRequest = {
            let request = VNDetectHumanBodyPoseRequest()
            return request
        }()
        /// Shared CIContext for efficient buffer downscaling (reused across frames)
        private lazy var ciContext: CIContext = {
            CIContext(options: [.useSoftwareRenderer: false])
        }()

        init(
            configuration: TattooConfiguration,
            tattooScale: Binding<Float>,
            tattooRotationDegrees: Binding<Float>,
            statusMessage: Binding<String?>,
            distanceMeters: Binding<Float?>,
            isSessionReady: Binding<Bool>,
            captureStatus: Binding<String?>,
            bodyTracked: Binding<Bool>,
            isRecording: Binding<Bool>,
            isProjectionQualityPoor: Binding<Bool>,
            isSensitiveAreaBlocked: Binding<Bool>,
            isSensitiveAreaNearby: Binding<Bool>
        ) {
            self.configuration = configuration
            self.tattooScale = tattooScale
            self.tattooRotationDegrees = tattooRotationDegrees
            self.statusMessage = statusMessage
            self.distanceMeters = distanceMeters
            self.isSessionReady = isSessionReady
            self.isProjectionQualityPoor = isProjectionQualityPoor
            self.captureStatus = captureStatus
            self.bodyTracked = bodyTracked
            self.isRecording = isRecording
            self.isSensitiveAreaBlocked = isSensitiveAreaBlocked
            self.isSensitiveAreaNearby = isSensitiveAreaNearby
            super.init()
        }

        func attachARView(_ arView: ARView) {
            self.arView = arView
            arView.session.delegate = self
            arView.automaticallyConfigureSession = false
            arView.renderOptions.insert(.disableGroundingShadows)
            arView.environment.sceneUnderstanding.options.insert(.occlusion)
            usingPreviewPlacement = true
            if configuration.isFrontCamera {
                configureFaceSession(for: arView)
            } else {
                configureSession(for: arView)
            }
            setupBodyAnchor(in: arView)
            setupPreviewAnchor(in: arView)
            setupWorldAnchor(in: arView)
            setupProjectionAnchor(in: arView)
        }

        func shutdown() {
            videoRecorder.stop()
            arView?.session.pause()
            arView?.session.delegate = nil
            arView?.scene.anchors.removeAll()
            arView = nil
            skinSegmentationManager?.reset()
            sensitiveContentManager?.reset()
        }

        func updateConfiguration(_ configuration: TattooConfiguration) {
            let cameraChanged = configuration.isFrontCamera != currentlyUsingFrontCamera
            let modeChanged = configuration.bodyPartMode != self.configuration.bodyPartMode
            let skeletonOverlayChanged = configuration.showSkeletonOverlay != self.configuration.showSkeletonOverlay
            let bodyTrackingChanged = configuration.bodyTrackingEnabled != self.configuration.bodyTrackingEnabled
            let recordingChanged = configuration.isRecording != self.configuration.isRecording
            self.configuration = configuration

            // ── AR Video Recording ──
            if recordingChanged {
                if configuration.isRecording {
                    // Start: ARVideoRecorder captures ARView.snapshot() frames via CADisplayLink
                    if let arView {
                        videoRecorder.onStopped = { [weak self] url in
                            guard let self else { return }
                            // Recording finished — save to Photos
                            guard let url else {
                                self.captureStatus.wrappedValue = "Write failed"
                                return
                            }
                            PHPhotoLibrary.requestAuthorization { status in
                                guard status == .authorized || status == .limited else {
                                    DispatchQueue.main.async {
                                        self.captureStatus.wrappedValue = "Photo access denied"
                                    }
                                    return
                                }
                                PHPhotoLibrary.shared().performChanges({
                                    PHAssetChangeRequest.creationRequestForAssetFromVideo(atFileURL: url)
                                }) { success, _ in
                                    DispatchQueue.main.async {
                                        self.captureStatus.wrappedValue = success ? "Video saved ✓" : "Save failed"
                                    }
                                }
                            }
                        }
                        videoRecorder.start(arView: arView)
                    }
                } else {
                    // Stop: finalize AVAssetWriter and trigger onStopped → Photos save
                    videoRecorder.stop()
                }
            }

            if cameraChanged {
                switchCamera(toFront: configuration.isFrontCamera)
            }
            // Reset tap offset when switching between face modes
            // so the new mode's default anatomical position is used
            if modeChanged && configuration.bodyPartMode.requiresFrontCamera {
                faceTapLocalOffset = .zero
            }
            // Update skeleton overlay visibility
            if skeletonOverlayChanged {
                updateSkeletonOverlay(visible: configuration.showSkeletonOverlay)
            }
            // Disable pinch/rotation when body tracking is active (user can't reach their body)
            if bodyTrackingChanged || cameraChanged {
                let disableGestures = !configuration.isFrontCamera && configuration.bodyTrackingEnabled
                facePinchGesture?.isEnabled = !disableGestures
                faceRotationGesture?.isEnabled = !disableGestures
            }
            // Reset Place-and-Lock state when body tracking is disabled or mode changes
            if (bodyTrackingChanged && !configuration.bodyTrackingEnabled) || modeChanged {
                resetPlacementLock()
            }
            // When UI sets bodyTracked to false while tracking is still on → re-enter Phase A
            if bodyTrackingChanged || modeChanged {
                if configuration.bodyTrackingEnabled && !bodyTracked.wrappedValue {
                    resetPlacementLock()
                }
            }
            // ── Regular-mode spatial lock ──
            let regularLockChanged = configuration.regularModeLocked != (isPlacementLocked && !configuration.bodyTrackingEnabled)
            if regularLockChanged && !configuration.bodyTrackingEnabled {
                if configuration.regularModeLocked {
                    // Lock: capture the current world anchor position
                    if let worldAnchorEntity {
                        lockedProjectionCenter = worldAnchorEntity.position(relativeTo: nil)
                        isPlacementLocked = true
                        meshNeedsReProjection = true  // Force initial locked projection
                        lastSuccessfulProjectionTime = Date()
                        consecutiveProjectionFailures = 0
                        // Store camera state for movement detection AND stable filtering
                        if let av = self.arView {
                            let camPos = av.cameraTransform.translation
                            lastLockedCameraForward = simd_normalize(
                                SIMD3<Float>(av.cameraTransform.matrix.columns.2.x,
                                            av.cameraTransform.matrix.columns.2.y,
                                            av.cameraTransform.matrix.columns.2.z))
                            lastLockedCameraPosition = camPos
                            // Store lock-time camera state for stable filtering
                            let lockCenter = worldAnchorEntity.position(relativeTo: nil)
                            lockedCameraDirection = simd_normalize(lockCenter - camPos)
                            lockedCameraPosition = camPos
                        }
                    }
                } else {
                    // Unlock: return to following screen center
                    resetPlacementLock()
                }
            }
            updateTattooEntityIfNeeded()
        }

        /// Applies true camera zoom via AVCaptureDevice.videoZoomFactor.
        /// This uses the actual camera sensor's crop/interpolation pipeline,
        /// producing much sharper results than view-level scaling.
        private var lastAppliedZoom: CGFloat = 1.0
        func applyCameraZoom(_ zoomFactor: CGFloat) {
            // Avoid redundant device locks
            guard abs(zoomFactor - lastAppliedZoom) > 0.01 else { return }
            lastAppliedZoom = zoomFactor

            guard let device = ARWorldTrackingConfiguration
                .configurableCaptureDeviceForPrimaryCamera else { return }
            do {
                try device.lockForConfiguration()
                let maxZoom = min(device.activeFormat.videoMaxZoomFactor, 5.0)
                device.videoZoomFactor = max(1.0, min(CGFloat(zoomFactor), maxZoom))
                device.unlockForConfiguration()
            } catch {
                // Configuration lock failed — skip this frame
            }
        }

        func handleCaptureRequest(_ requestID: Int) {
            guard requestID != lastCaptureRequestID else { return }
            lastCaptureRequestID = requestID
            captureSnapshot()
        }

        private func captureSnapshot() {
            guard let arView else { return }
            arView.snapshot(saveToHDR: false) { [weak self] image in
                guard let self else { return }
                guard let image else {
                    self.setCaptureStatus("Capture failed")
                    return
                }

                PHPhotoLibrary.requestAuthorization { status in
                    guard status == .authorized || status == .limited else {
                        self.setCaptureStatus("Photo access denied")
                        return
                    }
                    PHPhotoLibrary.shared().performChanges({
                        PHAssetChangeRequest.creationRequestForAsset(from: image)
                    }, completionHandler: { success, _ in
                        self.setCaptureStatus(success ? "Saved to Photos" : "Save failed")
                    })
                }
            }
        }

        private func setCaptureStatus(_ message: String) {
            DispatchQueue.main.async {
                self.captureStatus.wrappedValue = message
                DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                    if self.captureStatus.wrappedValue == message {
                        self.captureStatus.wrappedValue = nil
                    }
                }
            }
        }

        private func configureSession(for arView: ARView) {
            guard ARWorldTrackingConfiguration.supportsSceneReconstruction(.mesh) else {
                statusMessage.wrappedValue = "LiDAR is required. Please use a LiDAR-capable device."
                return
            }

            let config = ARWorldTrackingConfiguration()
            config.isAutoFocusEnabled = true
            config.sceneReconstruction = .mesh
            if ARWorldTrackingConfiguration.supportsFrameSemantics(.personSegmentationWithDepth) {
                config.frameSemantics.insert(.personSegmentationWithDepth)
            }
            if ARWorldTrackingConfiguration.supportsFrameSemantics(.sceneDepth) {
                config.frameSemantics.insert(.sceneDepth)
            }
            // NOTE: .bodyDetection is NOT added here. Combining it with
            // personSegmentationWithDepth + sceneDepth + mesh reconstruction
            // causes the session to fail silently on some devices.
            // Body tracking uses Vision framework (detectBodyPose) instead.

            config.isLightEstimationEnabled = true
            arView.session.run(config, options: [.resetTracking, .removeExistingAnchors])
            currentlyUsingFrontCamera = false
        }


        // MARK: - Skeleton Overlay

        private var skeletonAnchorEntity: AnchorEntity?
        private var skeletonJointEntities: [String: ModelEntity] = [:]
        private var skeletonBoneEntities: [String: ModelEntity] = [:]

        /// Updates or creates the skeleton overlay wireframe.
        private func updateSkeletonOverlay(visible: Bool) {
            if visible {
                if skeletonAnchorEntity == nil {
                    let anchor = AnchorEntity(world: .zero)
                    arView?.scene.addAnchor(anchor)
                    skeletonAnchorEntity = anchor
                }
            } else {
                removeSkeletonEntities()
            }
        }

        /// Removes all skeleton overlay entities from the scene.
        private func removeSkeletonEntities() {
            skeletonAnchorEntity?.removeFromParent()
            skeletonAnchorEntity = nil
            skeletonJointEntities.removeAll()
            skeletonBoneEntities.removeAll()
        }

        /// Updates skeleton joint positions and bone connections each frame.
        /// Called from the session delegate when a body anchor is detected.
        private func renderSkeletonOverlay(_ bodyAnchor: ARBodyAnchor) {
            guard configuration.showSkeletonOverlay,
                  let skeletonAnchorEntity else { return }

            let skeleton = bodyAnchor.skeleton
            let bodyTransform = bodyAnchor.transform

            // Key joints to display
            let jointNames: [String] = [
                "head_joint", "neck_1_joint",
                "spine_7_joint", "spine_5_joint", "spine_3_joint", "hips_joint",
                "left_shoulder_1_joint", "left_arm_joint", "left_forearm_joint", "left_hand_joint",
                "right_shoulder_1_joint", "right_arm_joint", "right_forearm_joint", "right_hand_joint",
                "left_upLeg_joint", "left_leg_joint", "left_foot_joint",
                "right_upLeg_joint", "right_leg_joint", "right_foot_joint"
            ]

            // Bone connections (pairs of joint names)
            let boneConnections: [(String, String)] = [
                ("head_joint", "neck_1_joint"),
                ("neck_1_joint", "spine_7_joint"),
                ("spine_7_joint", "spine_5_joint"),
                ("spine_5_joint", "spine_3_joint"),
                ("spine_3_joint", "hips_joint"),
                ("spine_7_joint", "left_shoulder_1_joint"),
                ("left_shoulder_1_joint", "left_arm_joint"),
                ("left_arm_joint", "left_forearm_joint"),
                ("left_forearm_joint", "left_hand_joint"),
                ("spine_7_joint", "right_shoulder_1_joint"),
                ("right_shoulder_1_joint", "right_arm_joint"),
                ("right_arm_joint", "right_forearm_joint"),
                ("right_forearm_joint", "right_hand_joint"),
                ("hips_joint", "left_upLeg_joint"),
                ("left_upLeg_joint", "left_leg_joint"),
                ("left_leg_joint", "left_foot_joint"),
                ("hips_joint", "right_upLeg_joint"),
                ("right_upLeg_joint", "right_leg_joint"),
                ("right_leg_joint", "right_foot_joint")
            ]

            // Update or create joint spheres
            for name in jointNames {
                let jointName = ARSkeleton.JointName(rawValue: name)
                let idx = skeleton.definition.index(for: jointName)
                guard idx >= 0 && idx < skeleton.jointModelTransforms.count else { continue }

                let jointModelTransform = skeleton.jointModelTransforms[idx]
                let worldTransform = simd_mul(bodyTransform, jointModelTransform)
                let worldPos = SIMD3<Float>(worldTransform.columns.3.x, worldTransform.columns.3.y, worldTransform.columns.3.z)

                if let existing = skeletonJointEntities[name] {
                    existing.position = worldPos
                } else {
                    let sphere = ModelEntity(
                        mesh: .generateSphere(radius: 0.015),
                        materials: [SimpleMaterial(color: .green.withAlphaComponent(0.8), isMetallic: false)]
                    )
                    sphere.position = worldPos
                    skeletonAnchorEntity.addChild(sphere)
                    skeletonJointEntities[name] = sphere
                }
            }

            // Update or create bone connections
            for (startName, endName) in boneConnections {
                let boneKey = "\(startName)_\(endName)"
                let startJoint = ARSkeleton.JointName(rawValue: startName)
                let endJoint = ARSkeleton.JointName(rawValue: endName)
                let startIdx = skeleton.definition.index(for: startJoint)
                let endIdx = skeleton.definition.index(for: endJoint)
                guard startIdx >= 0 && startIdx < skeleton.jointModelTransforms.count,
                      endIdx >= 0 && endIdx < skeleton.jointModelTransforms.count else { continue }

                let startWorld = simd_mul(bodyTransform, skeleton.jointModelTransforms[startIdx])
                let endWorld = simd_mul(bodyTransform, skeleton.jointModelTransforms[endIdx])
                let startPos = SIMD3<Float>(startWorld.columns.3.x, startWorld.columns.3.y, startWorld.columns.3.z)
                let endPos = SIMD3<Float>(endWorld.columns.3.x, endWorld.columns.3.y, endWorld.columns.3.z)

                let midpoint = (startPos + endPos) / 2.0
                let boneLength = simd_distance(startPos, endPos)
                guard boneLength > 0.001 else { continue }

                let direction = simd_normalize(endPos - startPos)
                let defaultUp = SIMD3<Float>(0, 1, 0)
                let rotation: simd_quatf
                if abs(simd_dot(direction, defaultUp)) > 0.999 {
                    rotation = direction.y > 0
                        ? simd_quatf(angle: 0, axis: SIMD3<Float>(1, 0, 0))
                        : simd_quatf(angle: .pi, axis: SIMD3<Float>(1, 0, 0))
                } else {
                    let axis = simd_normalize(simd_cross(defaultUp, direction))
                    let angle = acos(simd_clamp(simd_dot(defaultUp, direction), -1, 1))
                    rotation = simd_quatf(angle: angle, axis: axis)
                }

                if let existing = skeletonBoneEntities[boneKey] {
                    existing.position = midpoint
                    existing.orientation = rotation
                    // Update the mesh for length changes
                    existing.model?.mesh = .generateBox(size: SIMD3<Float>(0.005, boneLength, 0.005), cornerRadius: 0.002)
                } else {
                    let bone = ModelEntity(
                        mesh: .generateBox(size: SIMD3<Float>(0.005, boneLength, 0.005), cornerRadius: 0.002),
                        materials: [SimpleMaterial(color: .cyan.withAlphaComponent(0.6), isMetallic: false)]
                    )
                    bone.position = midpoint
                    bone.orientation = rotation
                    skeletonAnchorEntity.addChild(bone)
                    skeletonBoneEntities[boneKey] = bone
                }
            }
        }

        /// Switches between rear (LiDAR) and front (TrueDepth) cameras.
        /// Resets the AR session and clears stale anchor data.
        private func switchCamera(toFront useFront: Bool) {
            guard let arView else { return }

            // Clean up old state
            tattooEntity?.removeFromParent()
            projectionEntity?.components.remove(ModelComponent.self)
            meshAnchors.removeAll()
            latestBodyAnchor = nil
            latestFaceAnchor = nil
            lastProjectionTime = nil
            lastSmoothedTransform = nil
            isSessionReady.wrappedValue = false
            faceTapLocalOffset = .zero
            bodyTapNudgeOffset = .zero
            bodyJointUpVector = nil
            bodyJointForwardVector = nil
            removeSkeletonEntities()

            // Enable UIKit gestures based on camera and mode
            // Front camera: tap + pinch + rotation
            // Rear camera body tracking: tap only (user can't reach their body)
            // Rear camera no body tracking: tap + pinch + rotation
            faceTapGesture?.isEnabled = true  // Always enabled — used for face and body tap-to-place
            let disableGestures = !useFront && configuration.bodyTrackingEnabled
            facePinchGesture?.isEnabled = !disableGestures
            faceRotationGesture?.isEnabled = !disableGestures
            uikitPinchBaseScale = configuration.scale
            uikitRotationBaseAngle = configuration.rotationDegrees

            if useFront {
                configureFaceSession(for: arView)
            } else {
                configureSession(for: arView)
            }

            attachTattooEntity()
        }

        /// Configures the AR session for front-camera face tracking using
        /// the TrueDepth sensor. Provides ARFaceAnchor with a high-fidelity
        /// 1,220-vertex face mesh that tracks expressions in real-time.
        private func configureFaceSession(for arView: ARView) {
            guard ARFaceTrackingConfiguration.isSupported else {
                statusMessage.wrappedValue = "Face tracking requires a TrueDepth camera."
                return
            }

            let config = ARFaceTrackingConfiguration()
            config.isLightEstimationEnabled = true
            config.maximumNumberOfTrackedFaces = 1
            // Enable world tracking on devices that support it (A12+)
            // so we get better positional tracking for the face mesh
            if ARFaceTrackingConfiguration.supportsWorldTracking {
                config.isWorldTrackingEnabled = true
            }
            arView.session.run(config, options: [.resetTracking, .removeExistingAnchors])
            currentlyUsingFrontCamera = true
        }

        private func setupBodyAnchor(in arView: ARView) {
            guard ARBodyTrackingConfiguration.isSupported else { return }
            let anchor = AnchorEntity(.body)
            arView.scene.addAnchor(anchor)
            bodyAnchorEntity = anchor
        }

        private func setupPreviewAnchor(in arView: ARView) {
            let anchor = AnchorEntity(.camera)
            arView.scene.addAnchor(anchor)
            previewAnchorEntity = anchor
        }

        private func setupWorldAnchor(in arView: ARView) {
            let anchor = AnchorEntity(world: .zero)
            arView.scene.addAnchor(anchor)
            worldAnchorEntity = anchor
        }

        private func setupProjectionAnchor(in arView: ARView) {
            let anchor = AnchorEntity(world: .zero)
            arView.scene.addAnchor(anchor)
            projectionAnchorEntity = anchor
        }

        private func updateTattooEntityIfNeeded() {
            guard let image = configuration.image else { return }

            let imageIdentifier = ObjectIdentifier(image)
            let needsRebuild = imageIdentifier != lastImageIdentifier
                || configuration.bodyLocation != lastLocation
                || configuration.scale != lastScale
                || configuration.rotationDegrees != lastRotation
                || configuration.nudge != lastNudge
                || configuration.lockToSurface != lastLockToSurface
                || configuration.smoothing != lastSmoothing

            guard needsRebuild else { return }

            lastImageIdentifier = imageIdentifier
            lastLocation = configuration.bodyLocation
            lastScale = configuration.scale
            lastRotation = configuration.rotationDegrees
            lastNudge = configuration.nudge
            lastLockToSurface = configuration.lockToSurface
            lastSmoothing = configuration.smoothing

            tattooEntity?.removeFromParent()
            tattooEntity = makeTattooEntity(image: image, configuration: configuration)
            lastSmoothedTransform = nil
            setPreviewModeEnabled(false)
            attachTattooEntity()
            updateWorldPlacement()

            if projectionEntity == nil {
                let entity = ModelEntity()
                projectionEntity = entity
                projectionAnchorEntity?.addChild(entity)
            }
        }

        private func makeTattooEntity(image: UIImage, configuration: TattooConfiguration) -> ModelEntity {
            let location = configuration.bodyLocation
            let size = location.defaultSizeMeters
            let width = Float(size.width) * configuration.scale
            let height = Float(size.height) * configuration.scale

            let mesh: MeshResource
            if location.curveRadiusMeters > 0 {
                mesh = MeshResource.generateCurvedPlane(
                    width: width,
                    height: height,
                    radius: location.curveRadiusMeters,
                    widthSegments: 36,
                    heightSegments: 8
                )
            } else {
                mesh = MeshResource.generatePlane(width: width, depth: height)
            }

            let material = makeTattooMaterial(image: image)
            let model = ModelEntity(mesh: mesh, materials: [material])
            model.name = "TattooEntity"
            return model
        }

        private func makeTattooMaterial(image: UIImage) -> UnlitMaterial {
            if let cgImage = image.cgImage,
               let texture = try? TextureResource(image: cgImage, options: .init(semantic: .color)) {
                var unlit = UnlitMaterial(texture: texture)
                unlit.blending = .transparent(opacity: 1.0)
                unlit.faceCulling = .none
                unlit.readsDepth = true
                unlit.writesDepth = false
                return unlit
            }

            var fallback = UnlitMaterial(color: .white)
            fallback.readsDepth = true
            fallback.writesDepth = false
            return fallback
        }

        func session(_ session: ARSession, didUpdate anchors: [ARAnchor]) {
            for anchor in anchors {
                if let meshAnchor = anchor as? ARMeshAnchor {
                    meshAnchors[meshAnchor.identifier] = meshAnchor

                    // ── Place-and-Lock: flag re-projection when mesh near locked position updates ──
                    if isPlacementLocked, let lockedCenter = lockedProjectionCenter {
                        let anchorPos = SIMD3<Float>(meshAnchor.transform.columns.3.x,
                                                     meshAnchor.transform.columns.3.y,
                                                     meshAnchor.transform.columns.3.z)
                        if simd_distance(anchorPos, lockedCenter) < 0.5 {
                            meshNeedsReProjection = true
                        }
                    }
                }
            }

            if currentlyUsingFrontCamera {
                // Front camera: handle face anchors
                if let faceAnchor = anchors.compactMap({ $0 as? ARFaceAnchor }).first {
                    latestFaceAnchor = faceAnchor
                    applyFaceAnchor(faceAnchor)
                }
            } else {
                // Rear camera: handle body anchors
                if let bodyAnchor = anchors.compactMap({ $0 as? ARBodyAnchor }).first {
                    latestBodyAnchor = bodyAnchor
                    applyBodyAnchor(bodyAnchor)
                    renderSkeletonOverlay(bodyAnchor)
                }
            }
        }

        func session(_ session: ARSession, didAdd anchors: [ARAnchor]) {
            let hasBody = anchors.contains(where: { $0 is ARBodyAnchor })
            let hasFace = anchors.contains(where: { $0 is ARFaceAnchor })
            guard hasBody || hasFace else { return }
            if hasBody {
                lastBodyAnchorUpdate = Date()
            }
            statusMessage.wrappedValue = nil
            setPreviewModeEnabled(false)
            attachTattooEntity()
            updateDistanceMeters()
        }

        func session(_ session: ARSession, didRemove anchors: [ARAnchor]) {
            for anchor in anchors {
                if let meshAnchor = anchor as? ARMeshAnchor {
                    meshAnchors.removeValue(forKey: meshAnchor.identifier)
                }
            }
        }

        func session(_ session: ARSession, didUpdate frame: ARFrame) {
            if currentlyUsingFrontCamera {
                // Face tracking session is ready as soon as we get frames
                if !isSessionReady.wrappedValue {
                    isSessionReady.wrappedValue = true
                }
                // Capture TrueDepth depth data for depth-based neck positioning
                latestDepthData = frame.capturedDepthData
                latestCameraIntrinsics = frame.camera.intrinsics
                latestCameraTransform = frame.camera.transform
                latestCameraImageResolution = frame.camera.imageResolution
                statusMessage.wrappedValue = nil
                return
            }

            guard ARWorldTrackingConfiguration.supportsSceneReconstruction(.mesh) else { return }
            if !isSessionReady.wrappedValue {
                isSessionReady.wrappedValue = true
            }

            // Don't blanket-clear status when any lock is active (proximity warning)
            if !isPlacementLocked {
                statusMessage.wrappedValue = nil
            }
            setPreviewModeEnabled(false)

            // ── Spatial Lock: Camera movement detection ──
            // When ANY lock is active (body tracking Phase B or regular-mode lock),
            // check if camera rotated or translated enough to trigger re-projection.
            // This enables 360° viewing from all angles.
            if isPlacementLocked, lockedProjectionCenter != nil {
                if let av = self.arView {
                    let camForward = simd_normalize(
                        SIMD3<Float>(av.cameraTransform.matrix.columns.2.x,
                                    av.cameraTransform.matrix.columns.2.y,
                                    av.cameraTransform.matrix.columns.2.z))
                    let camPos = av.cameraTransform.translation

                    // Angle-based: re-project if camera rotated >~2.5°
                    // Tighter threshold (was 0.996/~5°) for smoother updates
                    // when orbiting around the subject.
                    if let lastFwd = lastLockedCameraForward {
                        let angleDot = abs(simd_dot(camForward, lastFwd))
                        if angleDot < 0.999 {
                            meshNeedsReProjection = true
                        }
                    } else {
                        meshNeedsReProjection = true
                    }

                    // Position-based: re-project if camera moved >2cm
                    // (walking around the subject changes viewing angle even
                    // if camera forward direction doesn't change much)
                    // Tighter threshold (was 3cm) for smoother parallax.
                    if let lastPos = lastLockedCameraPosition {
                        if simd_distance(camPos, lastPos) > 0.02 {
                            meshNeedsReProjection = true
                        }
                    }
                }
            }

            // Run Vision body pose detection (rear camera only):
            // - When body tracking is ON and NOT locked: full detection for placement
            // - When body tracking is OFF: lightweight head-only detection for sensitive area gating
            // Front camera uses ARKit face mesh exclusion zones instead.
            if !isPlacementLocked && !configuration.bodyPartMode.requiresFrontCamera {
                detectBodyPose(in: frame)
            }

            // Run skin segmentation on rear camera frames.
            // Used for: triangle filtering in ALL rear-camera projection modes.
            // Skip during recording to save CPU for video encoding.
            if !configuration.bodyPartMode.requiresFrontCamera && !configuration.isRecording {
                skinSegmentationManager?.processFrame(pixelBuffer: frame.capturedImage)
            }

            // Run Apple's Sensitive Content Analysis on rear camera frames.
            // Detects nudity on-device and blocks tattoo placement when detected.
            // Internally throttled to ~1 frame/second to avoid GPU thrashing.
            if !configuration.bodyPartMode.requiresFrontCamera && !configuration.isRecording {
                sensitiveContentManager?.processFrame(pixelBuffer: frame.capturedImage)
            }

            // Cache ARKit's built-in person segmentation buffer for mesh filtering.
            // This is a FREE mask (255=person, 0=background) provided by personSegmentationWithDepth.
            // More reliable than our skin model for distinguishing person vs background/walls.
            if !configuration.bodyPartMode.requiresFrontCamera {
                latestPersonSegBuffer = frame.segmentationBuffer
            }

            updateWorldPlacement()
            updateDistanceMeters()
        }

        private func attachTattooEntity() {
            guard let tattooEntity else { return }
            if usingPreviewPlacement {
                if let previewAnchorEntity {
                    previewAnchorEntity.addChild(tattooEntity)
                    tattooEntity.transform = previewTransform()
                }
            } else {
                let now = Date()
                let lastUpdate = lastBodyAnchorUpdate ?? .distantPast
                if let bodyAnchorEntity, now.timeIntervalSince(lastUpdate) < 1.0 {
                    bodyAnchorEntity.addChild(tattooEntity)
                } else if let worldAnchorEntity {
                    worldAnchorEntity.addChild(tattooEntity)
                }
            }
        }

        private func setPreviewModeEnabled(_ enabled: Bool) {
            guard enabled != usingPreviewPlacement else { return }
            usingPreviewPlacement = enabled
            tattooEntity?.removeFromParent()
            attachTattooEntity()
        }

        private func previewTransform() -> Transform {
            Transform(
                scale: SIMD3<Float>(repeating: 1.0),
                rotation: simd_quatf(angle: 0.0, axis: SIMD3<Float>(0.0, 1.0, 0.0)),
                translation: SIMD3<Float>(0.0, 0.0, -0.35)
            )
        }

        // MARK: - Face Tap-to-Place

        /// Handles a tap on the AR view during face tracking mode.
        /// Projects the 2D screen tap point onto the 3D face mesh to find
        /// the closest vertex. Stores the face-LOCAL position of that vertex
        /// so the tattoo follows the face as it moves/rotates.
        @objc func handleFaceTap(_ gesture: UITapGestureRecognizer) {
            guard let arView else { return }

            if currentlyUsingFrontCamera {
                // ── Face tap-to-place (front camera) ──
                guard let faceAnchor = latestFaceAnchor else { return }

                let tapPoint = gesture.location(in: arView)
                let viewSize = arView.bounds.size
                guard viewSize.width > 0, viewSize.height > 0 else { return }

                let faceTransform = faceAnchor.transform
                let geometry = faceAnchor.geometry
                let faceVertCount = geometry.vertices.count

                var bestDist: Float = .greatestFiniteMagnitude
                var bestLocalPos: SIMD3<Float> = .zero

                for i in 0..<faceVertCount {
                    let localPos = geometry.vertices[i]
                    let world4 = faceTransform * SIMD4<Float>(localPos.x, localPos.y, localPos.z, 1)
                    let worldPos = SIMD3<Float>(world4.x, world4.y, world4.z)

                    guard let screenPoint = arView.project(worldPos) else { continue }

                    let dx = Float(screenPoint.x - tapPoint.x)
                    let dy = Float(screenPoint.y - tapPoint.y)
                    let dist = dx * dx + dy * dy

                    if dist < bestDist {
                        bestDist = dist
                        bestLocalPos = SIMD3<Float>(localPos.x, localPos.y, localPos.z)
                    }
                }

                if bestDist < Float.greatestFiniteMagnitude {
                    // ── Sensitive Area Exclusion Check ──
                    // ARKit face mesh is in face-local coordinates.
                    // Eye centers are approximately at:
                    //   Left eye:  x ≈ +0.032, y ≈ +0.018, z ≈ +0.025
                    //   Right eye: x ≈ -0.032, y ≈ +0.018, z ≈ +0.025
                    // Ear regions are approximately at:
                    //   Left ear:  x ≈ +0.072, y ≈ +0.005, z ≈ -0.035
                    //   Right ear: x ≈ -0.072, y ≈ +0.005, z ≈ -0.035
                    let sensitiveZones: [(center: SIMD3<Float>, radius: Float, name: String)] = [
                        // Eyes — 2cm radius exclusion sphere around each eye center
                        (SIMD3<Float>( 0.032,  0.018,  0.025), 0.020, "left eye"),
                        (SIMD3<Float>(-0.032,  0.018,  0.025), 0.020, "right eye"),
                        // Ears — 2.5cm radius exclusion sphere around each ear
                        (SIMD3<Float>( 0.072,  0.005, -0.035), 0.025, "left ear"),
                        (SIMD3<Float>(-0.072,  0.005, -0.035), 0.025, "right ear"),
                    ]

                    var blocked = false
                    for zone in sensitiveZones {
                        if simd_distance(bestLocalPos, zone.center) < zone.radius {
                            blocked = true
                            break
                        }
                    }

                    DispatchQueue.main.async {
                        self.isSensitiveAreaBlocked.wrappedValue = blocked
                    }

                    if blocked {
                        // Don't update the tap offset — reject placement
                        let haptic = UINotificationFeedbackGenerator()
                        haptic.notificationOccurred(.error)
                        return
                    }

                    faceTapLocalOffset = bestLocalPos
                }
            } else if configuration.bodyTrackingEnabled {
                // ── Body tap-to-place (rear camera, body tracking) ──
                // Raycast from the tap point to the LiDAR mesh to find where
                // the user tapped, then compute the nudge offset relative to
                // the default skeleton placement.
                let tapPoint = gesture.location(in: arView)
                let results = arView.raycast(from: tapPoint, allowing: .existingPlaneGeometry, alignment: .any)

                // Also try mesh raycast if plane raycast fails
                var hitWorldPos: SIMD3<Float>?
                if let firstResult = results.first {
                    hitWorldPos = SIMD3<Float>(
                        firstResult.worldTransform.columns.3.x,
                        firstResult.worldTransform.columns.3.y,
                        firstResult.worldTransform.columns.3.z
                    )
                } else {
                    // Try estimated plane raycast
                    let estimatedResults = arView.raycast(from: tapPoint, allowing: .estimatedPlane, alignment: .any)
                    if let est = estimatedResults.first {
                        hitWorldPos = SIMD3<Float>(
                            est.worldTransform.columns.3.x,
                            est.worldTransform.columns.3.y,
                            est.worldTransform.columns.3.z
                        )
                    }
                }

                guard let worldTapPos = hitWorldPos else { return }

                // Compute the default placement world position from the latest body anchor
                if let bodyAnchor = latestBodyAnchor {
                    let mode = configuration.bodyPartMode
                    let jointIndex = bodyAnchor.skeleton.definition.index(for: mode.skeletonJointName)
                    guard jointIndex >= 0 else { return }
                    let jointTransform = bodyAnchor.skeleton.jointModelTransforms[jointIndex]
                    let jointWorldTransform = simd_mul(bodyAnchor.transform, jointTransform)

                    // Default surface position
                    let defaultOffset = mode.skeletonLocalOffset
                    let offsetTransform = Transform(translation: defaultOffset).matrix
                    let defaultSurfaceWorld = simd_mul(jointWorldTransform, offsetTransform)
                    let defaultPos = SIMD3<Float>(
                        defaultSurfaceWorld.columns.3.x,
                        defaultSurfaceWorld.columns.3.y,
                        defaultSurfaceWorld.columns.3.z
                    )

                    // Nudge = difference between tap and default position
                    let nudge = worldTapPos - defaultPos
                    // Clamp nudge to reasonable range (±15cm)
                    bodyTapNudgeOffset = SIMD3<Float>(
                        max(-0.15, min(0.15, nudge.x)),
                        max(-0.15, min(0.15, nudge.y)),
                        max(-0.08, min(0.08, nudge.z))  // Less Z freedom
                    )
                }
            }
        }

        /// Handles pinch-to-scale gesture on the AR view (front camera mode).
        @objc func handlePinch(_ gesture: UIPinchGestureRecognizer) {
            switch gesture.state {
            case .began:
                uikitPinchBaseScale = tattooScale.wrappedValue
            case .changed:
                let maxScale = configuration.bodyPartMode.profile.maxScale
                let newScale = uikitPinchBaseScale * Float(gesture.scale)
                tattooScale.wrappedValue = max(0.05, min(maxScale, newScale))
            case .ended, .cancelled:
                uikitPinchBaseScale = tattooScale.wrappedValue
            default:
                break
            }
        }

        /// Handles two-finger rotation gesture on the AR view (front camera mode).
        @objc func handleRotation(_ gesture: UIRotationGestureRecognizer) {
            switch gesture.state {
            case .began:
                uikitRotationBaseAngle = tattooRotationDegrees.wrappedValue
            case .changed:
                let degrees = Float(gesture.rotation * 180 / .pi)
                let newRotation = uikitRotationBaseAngle + degrees
                tattooRotationDegrees.wrappedValue = max(-180, min(180, newRotation))
            case .ended, .cancelled:
                uikitRotationBaseAngle = tattooRotationDegrees.wrappedValue
            default:
                break
            }
        }

        /// Allow pinch and rotation gestures to fire simultaneously.
        func gestureRecognizer(
            _ gestureRecognizer: UIGestureRecognizer,
            shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer
        ) -> Bool {
            return true
        }

        // MARK: - TrueDepth Face Mesh Projection

        /// Projects the tattoo onto the ARFaceAnchor's face mesh.
        /// The TrueDepth sensor provides a precise 1,220-vertex face mesh
        /// with consistent topology, far superior to LiDAR for face geometry.




        private func applyFaceAnchor(_ faceAnchor: ARFaceAnchor) {
            guard let projectionEntity, let projectionAnchorEntity,
                  let image = configuration.image else { return }

            statusMessage.wrappedValue = nil

            let now = Date()
            if let lastProjectionTime, now.timeIntervalSince(lastProjectionTime) < 0.033 {
                return
            }
            lastProjectionTime = now

            let profile = configuration.bodyPartMode.profile
            let faceTransform = faceAnchor.transform
            let geometry = faceAnchor.geometry

            // ── Compute face center in world space ──
            // Use the user's tap position (face-local) as the projection center.
            // If no tap has been made yet, use the mode's default anatomical offset
            // (e.g., forehead = above brow, jawline = along mandible, etc.)
            let localOffset: SIMD3<Float>
            if faceTapLocalOffset != .zero {
                localOffset = faceTapLocalOffset
            } else {
                localOffset = configuration.bodyPartMode.defaultFaceLocalOffset
            }
            let localCenter = SIMD4<Float>(localOffset.x, localOffset.y, localOffset.z, 1)
            let worldCenter4 = faceTransform * localCenter
            let centerWorld = SIMD3<Float>(worldCenter4.x, worldCenter4.y, worldCenter4.z)

            // ── Image-aware aspect ratio ──
            let sizeMeters = profile.defaultSizeMeters
            let rawSize = SIMD2<Float>(
                max(Float(sizeMeters.width) * configuration.scale, minimumDecalSizeMeters),
                max(Float(sizeMeters.height) * configuration.scale, minimumDecalSizeMeters)
            )
            let imageAspect = Float(image.size.width) / Float(max(image.size.height, 1))
            let maxDim = max(rawSize.x, rawSize.y)
            let safeSize: SIMD2<Float>
            if imageAspect >= 1.0 {
                safeSize = SIMD2<Float>(maxDim, maxDim / imageAspect)
            } else {
                safeSize = SIMD2<Float>(maxDim * imageAspect, maxDim)
            }

            // ── Build tangent frame from face orientation ──
            // Use the face anchor's own orientation for stable projection
            let faceNormalVec = SIMD3<Float>(
                faceTransform.columns.2.x,
                faceTransform.columns.2.y,
                faceTransform.columns.2.z
            )
            let projNormal = simd_normalize(faceNormalVec)
            let up: SIMD3<Float> = abs(projNormal.y) < 0.9
                ? SIMD3<Float>(0, 1, 0) : SIMD3<Float>(1, 0, 0)
            var tangent = simd_normalize(simd_cross(up, projNormal))
            var bitangent = -simd_normalize(simd_cross(projNormal, tangent))

            // ── Apply user rotation ──
            // Rotate the tangent frame around the projection normal by
            // the user's rotation angle (from the rotation gesture or slider).
            let rotRad = configuration.rotationDegrees * .pi / 180.0
            if abs(rotRad) > 0.001 {
                let cosR = cos(rotRad)
                let sinR = sin(rotRad)
                let newTangent = tangent * cosR + bitangent * sinR
                let newBitangent = -tangent * sinR + bitangent * cosR
                tangent = simd_normalize(newTangent)
                bitangent = simd_normalize(newBitangent)
            }

            let anchorMatrix = simd_float4x4(
                SIMD4<Float>(tangent, 0),
                SIMD4<Float>(bitangent, 0),
                SIMD4<Float>(projNormal, 0),
                SIMD4<Float>(centerWorld, 1)
            )
            projectionAnchorEntity.transform = Transform(matrix: anchorMatrix)
            let inverseAnchor = anchorMatrix.inverse

            // ── Build crack-free indexed mesh with per-vertex normals ──
            let faceVertexCount = geometry.vertices.count
            let faceTriangleCount = geometry.triangleCount

            let totalVertexCount = faceVertexCount

            let surfaceOffset = profile.baseSurfaceOffset
            let sphereMult = profile.sphereFilterMultiplier
            let maxSphereRadius = max(safeSize.x, safeSize.y) * sphereMult
            let uvTolerance = profile.uvAcceptanceTolerance

            // Pass 1: Transform vertices to world space and accumulate per-vertex normals
            var worldVertices = [SIMD3<Float>](repeating: .zero, count: totalVertexCount)
            var vertexNormals = [SIMD3<Float>](repeating: .zero, count: totalVertexCount)

            // Face vertices
            for i in 0..<faceVertexCount {
                let lp = geometry.vertices[i]
                let w4 = faceTransform * SIMD4<Float>(lp.x, lp.y, lp.z, 1)
                worldVertices[i] = SIMD3<Float>(w4.x, w4.y, w4.z)
            }


            // Accumulate triangle face normals — face triangles
            for triIdx in 0..<faceTriangleCount {
                let i0 = Int(geometry.triangleIndices[triIdx * 3])
                let i1 = Int(geometry.triangleIndices[triIdx * 3 + 1])
                let i2 = Int(geometry.triangleIndices[triIdx * 3 + 2])
                guard i0 < faceVertexCount, i1 < faceVertexCount, i2 < faceVertexCount else { continue }

                let e1 = worldVertices[i1] - worldVertices[i0]
                let e2 = worldVertices[i2] - worldVertices[i0]
                let fn = simd_cross(e1, e2)
                vertexNormals[i0] += fn
                vertexNormals[i1] += fn
                vertexNormals[i2] += fn
            }


            // Pass 2: Normalize per-vertex normals and offset vertices
            var offsetVertices = [SIMD3<Float>](repeating: .zero, count: totalVertexCount)
            for i in 0..<totalVertexCount {
                let nLen = simd_length(vertexNormals[i])
                if nLen > 1e-8 {
                    vertexNormals[i] = vertexNormals[i] / nLen
                }
                offsetVertices[i] = worldVertices[i] + vertexNormals[i] * surfaceOffset
            }

            // Pass 3: Compute UV per-vertex and determine which vertices are in-bounds
            var vertexUVs = [SIMD2<Float>](repeating: .zero, count: totalVertexCount)
            var vertexInBounds = [Bool](repeating: false, count: totalVertexCount)
            var vertexLocalPositions = [SIMD3<Float>](repeating: .zero, count: totalVertexCount)

            for i in 0..<totalVertexCount {
                let ov = offsetVertices[i]
                let dist = simd_distance(ov, centerWorld)
                guard dist <= maxSphereRadius else { continue }

                let offset = ov - centerWorld
                let dx = simd_dot(offset, tangent)
                let dy = simd_dot(offset, bitangent)

                let u = 0.5 + (dx / safeSize.x)
                let v = 0.5 - (dy / safeSize.y)

                guard u >= -uvTolerance, u <= (1 + uvTolerance),
                      v >= -uvTolerance, v <= (1 + uvTolerance) else { continue }

                vertexUVs[i] = SIMD2<Float>(max(0, min(1, u)), max(0, min(1, v)))
                vertexInBounds[i] = true

                let local4 = inverseAnchor * SIMD4<Float>(ov, 1)
                vertexLocalPositions[i] = SIMD3<Float>(local4.x, local4.y, local4.z)
            }

            // Pass 4: Collect triangles where ALL 3 vertices are in-bounds
            // Use a vertex remap table to output only referenced vertices
            var vertexRemap = [Int](repeating: -1, count: totalVertexCount)
            var positions: [SIMD3<Float>] = []
            var meshNormals: [SIMD3<Float>] = []
            var uvs: [SIMD2<Float>] = []
            var meshIndices: [UInt32] = []

            positions.reserveCapacity(totalVertexCount)
            meshNormals.reserveCapacity(totalVertexCount)
            uvs.reserveCapacity(totalVertexCount)
            meshIndices.reserveCapacity(faceTriangleCount * 3)

            // Camera position for backface check
            let camPos = arView?.cameraTransform.translation ?? .zero

            // Helper closure for processing a triangle (shared by face & neck)
            let processTriangle = { (i0: Int, i1: Int, i2: Int) in
                guard i0 < totalVertexCount, i1 < totalVertexCount, i2 < totalVertexCount else { return }
                guard vertexInBounds[i0], vertexInBounds[i1], vertexInBounds[i2] else { return }

                let centroid = (offsetVertices[i0] + offsetVertices[i1] + offsetVertices[i2]) / 3.0
                let e1 = offsetVertices[i1] - offsetVertices[i0]
                let e2 = offsetVertices[i2] - offsetVertices[i0]
                let fn = simd_cross(e1, e2)
                let fnLen = simd_length(fn)
                guard fnLen > 1e-8 else { return }
                let normalizedFN = fn / fnLen
                let viewDir = simd_normalize(centroid - camPos)
                if simd_dot(normalizedFN, viewDir) > profile.backfaceThreshold { return }

                for idx in [i0, i1, i2] {
                    if vertexRemap[idx] == -1 {
                        vertexRemap[idx] = positions.count
                        positions.append(vertexLocalPositions[idx])
                        meshNormals.append(SIMD3<Float>(0, 0, 1))
                        uvs.append(vertexUVs[idx])
                    }
                }
                meshIndices.append(UInt32(vertexRemap[i0]))
                meshIndices.append(UInt32(vertexRemap[i1]))
                meshIndices.append(UInt32(vertexRemap[i2]))
            }

            // Face triangles
            for triIdx in 0..<faceTriangleCount {
                let i0 = Int(geometry.triangleIndices[triIdx * 3])
                let i1 = Int(geometry.triangleIndices[triIdx * 3 + 1])
                let i2 = Int(geometry.triangleIndices[triIdx * 3 + 2])
                processTriangle(i0, i1, i2)
            }

            // Build and apply the mesh
            guard positions.count >= 3 else {
                projectionEntity.isEnabled = false
                return
            }

            var descriptor = MeshDescriptor()
            descriptor.positions = MeshBuffers.Positions(positions)
            descriptor.normals = MeshBuffers.Normals(meshNormals)
            descriptor.textureCoordinates = MeshBuffers.TextureCoordinates(uvs)
            descriptor.primitives = .triangles(meshIndices)

            guard let mesh = try? MeshResource.generate(from: [descriptor]) else {
                projectionEntity.isEnabled = false
                return
            }
            let material = makeTattooMaterial(image: image)
            projectionEntity.model = ModelComponent(mesh: mesh, materials: [material])
            projectionEntity.isEnabled = true
            tattooEntity?.isEnabled = false
            updateDistanceMeters()
        }

        private func applyBodyAnchor(_ bodyAnchor: ARBodyAnchor) {
            guard let tattooEntity else { return }
            lastBodyAnchorUpdate = Date()
            statusMessage.wrappedValue = nil
            setPreviewModeEnabled(false)
            if tattooEntity.parent !== bodyAnchorEntity {
                tattooEntity.removeFromParent()
                attachTattooEntity()
            }

            // Use the body part mode's skeleton joint for auto-positioning.
            // For bilateral parts (arms, legs), use the side detected by Vision body pose.
            let mode = configuration.bodyPartMode
            let jointName = mode.skeletonJointName(forSide: detectedBodySide)
            let jointIndex = bodyAnchor.skeleton.definition.index(for: jointName)
            guard jointIndex >= 0, jointIndex < bodyAnchor.skeleton.jointModelTransforms.count else {
                return  // Joint not found in this skeleton — skip this update
            }
            let jointTransform = bodyAnchor.skeleton.jointModelTransforms[jointIndex]

            let rotation = mode.skeletonBaseRotation
                * simd_quatf(angle: configuration.rotationDegrees * .pi / 180.0, axis: SIMD3<Float>(0.0, 0.0, 1.0))

            let sideOffset = mode.skeletonLocalOffset(forSide: detectedBodySide)
            let offsetTransform = Transform(
                scale: SIMD3<Float>(repeating: 1.0),
                rotation: rotation,
                translation: sideOffset + configuration.nudge
            )

            let combined = simd_mul(jointTransform, offsetTransform.matrix)
            let targetTransform = Transform(matrix: combined)
            tattooEntity.transform = configuration.lockToSurface
                ? smoothedTransform(target: targetTransform)
                : targetTransform

            let scaleFactor = Float(bodyAnchor.estimatedScaleFactor)
            tattooEntity.scale = SIMD3<Float>(repeating: max(0.85, min(scaleFactor, 1.2)))

            // Compute centerWorld at the SURFACE of the body (not at the spine joint)
            // by applying the skeletonLocalOffset + user tap nudge to the joint position.
            // This ensures mesh search and projection are centered on the chest surface.
            let jointWorldTransform = simd_mul(bodyAnchor.transform, jointTransform)

            // Cache the joint's Y axis in world space (spine direction).
            // Used by mesh projection to orient the UV frame along the body's
            // tilt so the tattoo rotates with the user's lean angle.
            bodyJointUpVector = simd_normalize(SIMD3<Float>(
                jointWorldTransform.columns.1.x,
                jointWorldTransform.columns.1.y,
                jointWorldTransform.columns.1.z
            ))

            // Cache the joint's Z axis in world space (forward/backward direction).
            // For chest mode this points forward (toward camera), for back mode
            // it points backward. Used to derive a body-aligned projection normal
            // that stays stable as the camera orbits.
            bodyJointForwardVector = simd_normalize(SIMD3<Float>(
                jointWorldTransform.columns.2.x,
                jointWorldTransform.columns.2.y,
                jointWorldTransform.columns.2.z
            ))

            let surfaceOffset4 = sideOffset + bodyTapNudgeOffset
            let surfaceTransform = Transform(translation: surfaceOffset4).matrix
            let surfaceWorldTransform = simd_mul(jointWorldTransform, surfaceTransform)
            let centerWorld = SIMD3<Float>(
                surfaceWorldTransform.columns.3.x,
                surfaceWorldTransform.columns.3.y,
                surfaceWorldTransform.columns.3.z
            )
            let sizeMeters = mode.profile.defaultSizeMeters
            let targetSize = SIMD2<Float>(
                Float(sizeMeters.width) * configuration.scale * max(0.85, min(scaleFactor, 1.2)),
                Float(sizeMeters.height) * configuration.scale * max(0.85, min(scaleFactor, 1.2))
            )

            let projectionSucceeded = updateMeshProjection(centerWorld: centerWorld, size: targetSize)

            // DockKit tracking removed — replaced by skin segmentation pipeline

            if projectionSucceeded {
                projectionEntity?.isEnabled = true
                tattooEntity.isEnabled = false
                lastSuccessfulProjectionTime = Date()
                consecutiveProjectionFailures = 0
            } else {
                consecutiveProjectionFailures += 1

                // Anti-flicker: keep last mesh for hold duration
                let withinHoldWindow: Bool
                if let lastSuccess = lastSuccessfulProjectionTime {
                    withinHoldWindow = Date().timeIntervalSince(lastSuccess) < projectionHoldDuration
                } else {
                    withinHoldWindow = false
                }

                let maxFailures = configuration.bodyTrackingEnabled ? 8 : 3
                if withinHoldWindow && consecutiveProjectionFailures < maxFailures {
                    // Keep cached mesh visible — don't toggle
                } else {
                    projectionEntity?.isEnabled = false
                    tattooEntity.isEnabled = true
                }
            }

            updateDistanceMeters()
        }

        private func updateDistanceMeters() {
            guard let arView else { return }
            let cameraPosition = arView.cameraTransform.translation
            if let projectionEntity, projectionEntity.isEnabled {
                let tattooPosition = projectionEntity.position(relativeTo: nil)
                distanceMeters.wrappedValue = simd_distance(cameraPosition, tattooPosition)
                return
            }
            guard let tattooEntity else { return }
            let tattooPosition = tattooEntity.position(relativeTo: nil)
            distanceMeters.wrappedValue = simd_distance(cameraPosition, tattooPosition)
        }

        // MARK: - Vision Body Pose Detection

        /// Optimized body pose detection using Apple's Vision framework.
        /// Performance optimizations vs. the naive approach:
        ///   1. Camera buffer downscaled from 12MP to 720p before Vision (~75% CPU saving)
        ///   2. Detection rate throttled to 4Hz (body doesn't move that fast)
        ///   3. Uses two-joint midpoint for body segment centering
        ///   4. Uses LiDAR depth map for direct 3D unprojection (no plane raycasts)
        ///   5. Auto-disables when distance < 0.3m (default center-screen is better)
        private func detectBodyPose(in frame: ARFrame) {
            let now = Date()
            if let last = lastBodyPoseDetectionTime,
               now.timeIntervalSince(last) < bodyPoseDetectionInterval {
                return
            }
            guard !isProcessingBodyPose else { return }

            // Auto-disable: skip Vision processing when subject is very close
            // (only applies to body tracking — head joint detection always runs)
            if configuration.bodyTrackingEnabled,
               let dist = distanceMeters.wrappedValue, dist < bodyTrackingAutoDisableDistance {
                bodyTracked.wrappedValue = false
                bodyPoseWorldPosition = nil
                return
            }

            lastBodyPoseDetectionTime = now
            isProcessingBodyPose = true

            let pixelBuffer = frame.capturedImage
            let imageHeight = CVPixelBufferGetHeight(pixelBuffer)

            DispatchQueue.global(qos: .userInitiated).async { [weak self] in
                defer { self?.isProcessingBodyPose = false }

                guard let self = self else { return }

                // Determine which Vision joints to look for based on body part mode
                // (may be nil for face-only modes — head joint caching still runs)
                let jointPair = self.configuration.bodyPartMode.visionJointPair

                // ── Downscale buffer to 720p for Vision processing ──
                // VNDetectHumanBodyPoseRequest works accurately at low resolution.
                // Downscaling from 4032×3024 (12MP) to ~1280×720 saves ~75% CPU.
                let ciImage = CIImage(cvPixelBuffer: pixelBuffer)
                let targetHeight: CGFloat = 720.0
                let scaleFactor = targetHeight / CGFloat(imageHeight)
                let scaledImage = ciImage.transformed(by: CGAffineTransform(
                    scaleX: scaleFactor, y: scaleFactor
                ))

                // Run Vision body pose detection on the downscaled image
                let handler = VNImageRequestHandler(
                    ciImage: scaledImage,
                    orientation: .right,
                    options: [:]
                )

                do {
                    try handler.perform([self.bodyPoseRequest])
                } catch {
                    DispatchQueue.main.async {
                        self.bodyTracked.wrappedValue = false
                        self.bodyPoseWorldPosition = nil
                    }
                    return
                }

                guard let observation = self.bodyPoseRequest.results?.first else {
                    DispatchQueue.main.async {
                        self.bodyTracked.wrappedValue = false
                        self.bodyPoseWorldPosition = nil
                        self.cachedHeadJointPositions = []
                    }
                    return
                }

                // ── Cache sensitive head joint positions for proximity detection ──
                // Extract ears and eyes from the Vision observation so we can check
                // if the screen center (crosshair) is near a sensitive area.
                let sensitiveJoints: [(String, VNHumanBodyPoseObservation.JointName)] = [
                    ("left ear", .leftEar),
                    ("right ear", .rightEar),
                    ("left eye", .leftEye),
                    ("right eye", .rightEye)
                ]
                var headPositions: [(name: String, position: CGPoint)] = []
                for (name, jointName) in sensitiveJoints {
                    if let point = try? observation.recognizedPoint(jointName),
                       point.confidence > 0.15 {  // Low threshold — ears at profile angles have reduced confidence
                        headPositions.append((name, point.location))
                    }
                }
                DispatchQueue.main.async {
                    self.cachedHeadJointPositions = headPositions
                }

                // If body tracking is disabled or no joint pair for this mode,
                // we only needed the head joint caching above — exit now.
                guard let jointPair, self.configuration.bodyTrackingEnabled else {
                    if !self.configuration.bodyTrackingEnabled {
                        // Don't clear bodyTracked — it wasn't set by body tracking
                    } else {
                        DispatchQueue.main.async {
                            self.bodyTracked.wrappedValue = false
                            self.bodyPoseWorldPosition = nil
                        }
                    }
                    return
                }

                // ── Extract joint positions: bilateral selection for arms/legs ──
                // For body parts that exist on both sides (arms, legs), check both
                // left and right and pick the side with higher confidence. This ensures
                // we track whichever arm/leg is more visible to the camera.
                let bodyMode = self.configuration.bodyPartMode

                // Helper to compute midpoint and confidence for a joint pair
                func evaluatePair(
                    _ pair: (primary: VNHumanBodyPoseObservation.JointName, secondary: VNHumanBodyPoseObservation.JointName?),
                    in obs: VNHumanBodyPoseObservation
                ) -> (midpoint: CGPoint, confidence: Float)? {
                    guard let primary = try? obs.recognizedPoint(pair.primary),
                          primary.confidence > 0.3 else { return nil }

                    var mid = primary.location
                    var conf = primary.confidence

                    if let secName = pair.secondary,
                       let secondary = try? obs.recognizedPoint(secName),
                       secondary.confidence > 0.2 {
                        // For chest mode, bias the midpoint toward the neck (65/35)
                        // to position the tattoo at the sternum/pectoral area
                        // instead of the belly button region.
                        let primaryWeight: CGFloat
                        let secondaryWeight: CGFloat
                        if bodyMode == .chest {
                            primaryWeight = 0.65  // neck (primary)
                            secondaryWeight = 0.35  // root (secondary)
                        } else {
                            primaryWeight = 0.5
                            secondaryWeight = 0.5
                        }
                        mid = CGPoint(
                            x: primary.location.x * primaryWeight + secondary.location.x * secondaryWeight,
                            y: primary.location.y * primaryWeight + secondary.location.y * secondaryWeight
                        )
                        conf = (primary.confidence + secondary.confidence) / 2.0
                    }
                    return (mid, conf)
                }

                // Evaluate left side (default)
                let leftResult = evaluatePair(jointPair, in: observation)

                // Evaluate right side if available
                let rightResult: (midpoint: CGPoint, confidence: Float)?
                if let rightPair = bodyMode.visionJointPairRight {
                    rightResult = evaluatePair(rightPair, in: observation)
                } else {
                    rightResult = nil
                }

                // Pick the best side: higher confidence wins
                let bestResult: (midpoint: CGPoint, confidence: Float)
                let winningSide: DetectedBodySide
                if let left = leftResult, let right = rightResult {
                    if right.confidence > left.confidence {
                        bestResult = right
                        winningSide = .right
                    } else {
                        bestResult = left
                        winningSide = .left
                    }
                } else if let left = leftResult {
                    bestResult = left
                    winningSide = .left
                } else if let right = rightResult {
                    bestResult = right
                    winningSide = .right
                } else {
                    // Neither side detected
                    DispatchQueue.main.async {
                        self.phaseADetectionCount = 0
                        if !self.isPlacementLocked {
                            self.bodyPoseWorldPosition = nil
                        }
                    }
                    return
                }

                // Store the winning side for applyBodyAnchor to use the correct joint
                DispatchQueue.main.async {
                    self.detectedBodySide = winningSide
                }

                guard bestResult.confidence > 0.3 else {
                    DispatchQueue.main.async {
                        self.phaseADetectionCount = 0
                        if !self.isPlacementLocked {
                            self.bodyPoseWorldPosition = nil
                        }
                    }
                    return
                }

                var midpointNorm = bestResult.midpoint

                // ── Lateral offset for arm modes ──
                // When viewing from the front, the 2D midpoint of shoulder↔elbow
                // overlaps the torso silhouette. The raycast hits the chest instead
                // of the arm. We push the screen point outward (away from body center)
                // by a fraction of the shoulder width so it lands on the arm surface.
                if bodyMode.needsLateralOffset {
                    // Find body center X from the neck joint (most reliably detected)
                    if let neckPoint = try? observation.recognizedPoint(.neck),
                       neckPoint.confidence > 0.3 {
                        let bodyCenterX = neckPoint.location.x

                        // Compute lateral direction: away from body center
                        let lateralDir: CGFloat = midpointNorm.x > bodyCenterX ? 1.0 : -1.0

                        // Estimate shoulder width for scaling the offset
                        var shoulderWidth: CGFloat = 0.12 // Default ~12% of image width
                        if let leftShoulder = try? observation.recognizedPoint(.leftShoulder),
                           let rightShoulder = try? observation.recognizedPoint(.rightShoulder),
                           leftShoulder.confidence > 0.2, rightShoulder.confidence > 0.2 {
                            shoulderWidth = abs(leftShoulder.location.x - rightShoulder.location.x)
                        }

                        // Push outward by 20% of shoulder width
                        midpointNorm.x += lateralDir * shoulderWidth * 0.20
                        // Clamp to valid range
                        midpointNorm.x = max(0.02, min(0.98, midpointNorm.x))
                    }
                }

                // ── Convert Vision normalized coords → screen coords ──
                // Vision returns coords in display-oriented space (because we pass
                // orientation: .right). We need screen coordinates for ARView raycast.
                //
                // Vision coordinate system: bottom-left origin, [0,1] normalized
                // Screen coordinate system: top-left origin, pixel values
                //
                // For a portrait ARView with .right camera orientation:
                //   screenX = visionX * screenWidth  (same horizontal direction)
                //   screenY = (1 - visionY) * screenHeight  (Vision Y is bottom→top, screen Y is top→bottom)
                //
                // IMPORTANT: We do this on the main thread because we need arView.bounds
                // and makeRaycastQuery. At 4Hz detection rate, one raycast per detection
                // is negligible (~0.3ms).

                let capturedMidpoint = midpointNorm  // Capture for main thread

                DispatchQueue.main.async { [weak self] in
                    guard let self = self, let arView = self.arView else {
                        self?.phaseADetectionCount = 0
                        if !(self?.isPlacementLocked ?? false) {
                            self?.bodyPoseWorldPosition = nil
                        }
                        return
                    }

                    // Convert Vision normalized coords to ARView screen coords
                    let screenWidth = arView.bounds.width
                    let screenHeight = arView.bounds.height
                    let screenX = capturedMidpoint.x * screenWidth
                    let screenY = (1.0 - capturedMidpoint.y) * screenHeight
                    let screenPoint = CGPoint(x: screenX, y: screenY)

                    // Clamp to valid screen bounds
                    let clampedPoint = CGPoint(
                        x: max(1, min(screenWidth - 1, screenPoint.x)),
                        y: max(1, min(screenHeight - 1, screenPoint.y))
                    )

                    // ── Primary: Raycast against LiDAR mesh ──
                    // .existingPlaneGeometry uses the actual LiDAR-scanned mesh surfaces,
                    // hitting the real body surface directly. This is the most accurate.
                    if let query = arView.makeRaycastQuery(
                        from: clampedPoint,
                        allowing: .existingPlaneGeometry,
                        alignment: .any
                    ), let result = arView.session.raycast(query).first {
                        let hitPos = SIMD3<Float>(
                            result.worldTransform.columns.3.x,
                            result.worldTransform.columns.3.y,
                            result.worldTransform.columns.3.z
                        )
                        self.applyBodyPosePosition(hitPos)
                        return
                    }

                    // ── Fallback: Raycast against estimated planes ──
                    // If no LiDAR mesh hit (body not yet scanned), try estimated planes.
                    if let query = arView.makeRaycastQuery(
                        from: clampedPoint,
                        allowing: .estimatedPlane,
                        alignment: .any
                    ), let result = arView.session.raycast(query).first {
                        let hitPos = SIMD3<Float>(
                            result.worldTransform.columns.3.x,
                            result.worldTransform.columns.3.y,
                            result.worldTransform.columns.3.z
                        )
                        self.applyBodyPosePosition(hitPos)
                        return
                    }

                    // Both raycasts failed — body detected but no surface hit
                    self.phaseADetectionCount = 0
                    if !self.isPlacementLocked {
                        self.bodyPoseWorldPosition = nil
                    }
                }
            }
        }

        /// Applies a detected body position with smoothing and velocity damping.
        /// Note: Does NOT set bodyTracked — that's managed by the Place-and-Lock system.
        /// Always increments phaseADetectionCount and updates lastBodyDetectionTime
        /// to support confidence-based locking and body presence timeout.
        private func applyBodyPosePosition(_ hitPosition: SIMD3<Float>) {
            // Always track detection success (even if position barely moved)
            phaseADetectionCount += 1
            lastBodyDetectionTime = Date()

            if let existing = bodyPoseWorldPosition {
                // Velocity damping: if position barely changed, skip position update
                let delta = simd_distance(existing, hitPosition)
                if delta < 0.005 { // Less than 5mm movement — don't update position
                    return
                }
                // Heavy smoothing (0.65) for temporally stable tracking
                let smoothing: Float = 0.65
                bodyPoseWorldPosition = existing * (1.0 - smoothing) + hitPosition * smoothing
            } else {
                bodyPoseWorldPosition = hitPosition
            }
        }

        /// Resets all Place-and-Lock state, returning to Phase A (detection mode).
        private func resetPlacementLock() {
            isPlacementLocked = false
            lockedProjectionCenter = nil
            lockedSurfaceNormal = nil
            lockedCameraDirection = nil
            lockedCameraPosition = nil
            meshNeedsReProjection = true
            lastLockedCameraForward = nil
            lastLockedCameraPosition = nil
            lastDriftCheckTime = nil
            bodyPoseWorldPosition = nil
            phaseADetectionCount = 0
            lastBodyDetectionTime = nil
            // Clear proximity warning
            if statusMessage.wrappedValue == "Move back for best tattoo quality" {
                statusMessage.wrappedValue = nil
            }
        }

        /// Handles tap-to-relocate: user taps on the AR view while locked.
        /// Raycasts from the tap point to find a new surface position.
        @objc func handleBodyTapRelocate(_ gesture: UITapGestureRecognizer) {
            guard gesture.state == .ended,
                  configuration.bodyTrackingEnabled,
                  isPlacementLocked,
                  let arView else { return }

            let tapPoint = gesture.location(in: arView)

            // Raycast from tap point to find LiDAR surface
            if let query = arView.makeRaycastQuery(from: tapPoint, allowing: .existingPlaneGeometry, alignment: .any),
               let result = arView.session.raycast(query).first {
                let hitPos = SIMD3<Float>(result.worldTransform.columns.3.x,
                                          result.worldTransform.columns.3.y,
                                          result.worldTransform.columns.3.z)

                // Move the locked center to the tapped position
                lockedProjectionCenter = hitPos
                meshNeedsReProjection = true

                // Haptic feedback
                let haptic = UIImpactFeedbackGenerator(style: .rigid)
                haptic.impactOccurred()
            }
        }

        private func updateWorldPlacement() {
            guard let arView, let worldAnchorEntity, let tattooEntity else { return }

            // ── Sensitive area proximity check (rear camera) ──
            // When Vision detects ears, eyes, or nose, check if the screen center
            // (crosshair) is near any of them. If so, show warning and block projection.
            if !currentlyUsingFrontCamera && !cachedHeadJointPositions.isEmpty {
                // Screen center in normalized Vision coords (bottom-left origin)
                let screenCenter = CGPoint(x: 0.5, y: 0.5)
                // Proximity threshold: ~18% of screen — catches joints at wider angles
                let proximityThreshold: CGFloat = 0.18

                let isNearSensitive = cachedHeadJointPositions.contains { joint in
                    let dx = joint.position.x - screenCenter.x
                    let dy = joint.position.y - screenCenter.y
                    return sqrt(dx * dx + dy * dy) < proximityThreshold
                }

                if isNearSensitive != isSensitiveAreaNearby.wrappedValue {
                    DispatchQueue.main.async {
                        self.isSensitiveAreaNearby.wrappedValue = isNearSensitive
                    }
                }

                if isNearSensitive {
                    // Block projection when pointing at a sensitive area
                    // (regardless of lock state — user was warned at startup)
                    projectionEntity?.isEnabled = false
                    tattooEntity.isEnabled = false
                    return
                }
            } else if isSensitiveAreaNearby.wrappedValue {
                // No head joints detected — clear the flag
                DispatchQueue.main.async {
                    self.isSensitiveAreaNearby.wrappedValue = false
                }
            }
            // ── Place-and-Lock: Body Tracking Placement ──
            if configuration.bodyTrackingEnabled {
                if tattooEntity.parent !== worldAnchorEntity {
                    tattooEntity.removeFromParent()
                    worldAnchorEntity.addChild(tattooEntity)
                }

                let profile = configuration.bodyPartMode.profile
                let sizeMeters = profile.defaultSizeMeters
                let targetSize = SIMD2<Float>(
                    Float(sizeMeters.width) * configuration.scale,
                    Float(sizeMeters.height) * configuration.scale
                )

                if isPlacementLocked, let lockedCenter = lockedProjectionCenter {
                    // ════════════════════════════════════════════════════════
                    // PHASE B: PERMANENT SPATIAL LOCK
                    // The tattoo is locked in world space. Position NEVER changes.
                    // No Vision detection. No drift. No auto-unlock.
                    // Only re-project when LiDAR mesh updates or camera angle shifts.
                    // Unlock only by user action (button tap / double-tap).
                    // ════════════════════════════════════════════════════════

                    // ── Proximity warning ──
                    let camDist = simd_distance(arView.cameraTransform.translation, lockedCenter)
                    if camDist < 0.40 {
                        statusMessage.wrappedValue = "Move back for best tattoo quality"
                    } else {
                        if statusMessage.wrappedValue == "Move back for best tattoo quality" {
                            statusMessage.wrappedValue = nil
                        }
                    }

                    // ── Throttled re-projection ──
                    // Only re-project if mesh geometry changed OR camera angle shifted.
                    // This enables 360° viewing with progressively refined detail.
                    guard meshNeedsReProjection else {
                        // No changes — keep the existing cached mesh projection visible
                        worldAnchorEntity.position = lockedCenter
                        return
                    }

                    let projectionSucceeded = updateMeshProjection(centerWorld: lockedCenter, size: targetSize)

                    if projectionSucceeded {
                        projectionEntity?.isEnabled = true
                        tattooEntity.isEnabled = false
                        worldAnchorEntity.position = lockedCenter
                        lastSuccessfulProjectionTime = Date()
                        consecutiveProjectionFailures = 0
                        meshNeedsReProjection = false

                        // Store camera state for movement detection
                        if let av = self.arView {
                            lastLockedCameraForward = simd_normalize(
                                SIMD3<Float>(av.cameraTransform.matrix.columns.2.x,
                                            av.cameraTransform.matrix.columns.2.y,
                                            av.cameraTransform.matrix.columns.2.z))
                            lastLockedCameraPosition = av.cameraTransform.translation
                        }
                    } else {
                        // ── Infinite hold: NEVER hide the last successful projection ──
                        // When locked, keep the last good mesh visible no matter what.
                        // This ensures the tattoo stays visible even when:
                        //   - Camera is too close for good mesh triangles
                        //   - Viewing from an angle with few triangles
                        //   - LiDAR mesh temporarily gaps
                        worldAnchorEntity.position = lockedCenter
                        // Don't disable projectionEntity — keep last good mesh
                    }
                } else if let bodyPos = bodyPoseWorldPosition {
                    // ════════════════════════════════════════════════════════
                    // PHASE A: DETECTION — Confidence-gated locking
                    // Requires 3+ consecutive detections AND skin validation
                    // before locking to prevent false placement on walls/floors.
                    // ════════════════════════════════════════════════════════

                    // Don't attempt lock until we have enough consecutive detections
                    guard phaseADetectionCount >= minDetectionsForLock else {
                        // Not enough confidence yet — keep detecting
                        // Don't render anything to avoid false flashes
                        projectionEntity?.isEnabled = false
                        tattooEntity.isEnabled = false
                        return
                    }

                    // Surface-snap: raycast from body position to get precise surface point
                    var projectionCenter = bodyPos
                    if let screenPt = arView.project(bodyPos) {
                        if let query = arView.makeRaycastQuery(from: screenPt, allowing: .existingPlaneGeometry, alignment: .any),
                           let result = arView.session.raycast(query).first {
                            let hitPos = SIMD3<Float>(result.worldTransform.columns.3.x,
                                                      result.worldTransform.columns.3.y,
                                                      result.worldTransform.columns.3.z)
                            if simd_distance(hitPos, bodyPos) < 0.15 {
                                projectionCenter = hitPos
                            }
                        }
                    }

                    // ── Skin mask validation ──
                    // Before locking, verify the projection center falls on skin.
                    // This prevents locking on walls, floors, or furniture.
                    if let screenPt = arView.project(projectionCenter),
                       let maskCG = skinSegmentationManager?.latestSkinMaskCGImage,
                       let dataProvider = maskCG.dataProvider,
                       let data = dataProvider.data,
                       let ptr = CFDataGetBytePtr(data) {
                        let screenBounds = arView.bounds
                        let maskW = maskCG.width
                        let maskH = maskCG.height
                        let bpr = maskCG.bytesPerRow
                        // Convert screen coords to mask pixel coords
                        let mx = Int((screenPt.x / screenBounds.width) * CGFloat(maskW))
                        let my = Int((screenPt.y / screenBounds.height) * CGFloat(maskH))
                        let clampedX = max(0, min(maskW - 1, mx))
                        let clampedY = max(0, min(maskH - 1, my))
                        let pixelValue = ptr[clampedY * bpr + clampedX]

                        // If pixel is clearly not skin (< 30/255), reject this position
                        if pixelValue < 30 {
                            // Not skin — don't lock, keep detecting
                            projectionEntity?.isEnabled = false
                            tattooEntity.isEnabled = false
                            // Reset detection counter so we re-check confidence
                            phaseADetectionCount = max(0, phaseADetectionCount - 1)
                            return
                        }
                    }

                    // Try initial projection to verify the position is valid
                    let projectionSucceeded = updateMeshProjection(centerWorld: projectionCenter, size: targetSize)

                    if projectionSucceeded {
                        // ── Lock the placement ──
                        lockedProjectionCenter = projectionCenter
                        isPlacementLocked = true
                        meshNeedsReProjection = false
                        lastDriftCheckTime = Date()

                        // Store camera state for movement detection AND stable filtering
                        let camPos = arView.cameraTransform.translation
                        lastLockedCameraForward = simd_normalize(
                            SIMD3<Float>(arView.cameraTransform.matrix.columns.2.x,
                                        arView.cameraTransform.matrix.columns.2.y,
                                        arView.cameraTransform.matrix.columns.2.z))
                        lastLockedCameraPosition = camPos
                        // Store lock-time camera state for stable filtering
                        lockedCameraDirection = simd_normalize(projectionCenter - camPos)
                        lockedCameraPosition = camPos

                        projectionEntity?.isEnabled = true
                        tattooEntity.isEnabled = false
                        worldAnchorEntity.position = projectionCenter
                        lastSuccessfulProjectionTime = Date()
                        consecutiveProjectionFailures = 0
                        bodyTracked.wrappedValue = true  // Signals UI: "locked"

                        // Haptic feedback to confirm placement
                        let haptic = UIImpactFeedbackGenerator(style: .rigid)
                        haptic.impactOccurred()
                    } else {
                        // Projection failed — don't render, keep detecting
                        projectionEntity?.isEnabled = false
                        tattooEntity.isEnabled = false
                    }
                } else {
                    // No body detected at all — hide everything
                    projectionEntity?.isEnabled = false
                    tattooEntity.isEnabled = false
                }
                return
            }

            // ══════════════════════════════════════════════════════════════
            // REGULAR MODE (Body Tracking OFF)
            // ══════════════════════════════════════════════════════════════

            // ── Regular-mode Spatial Lock ──
            if isPlacementLocked, let lockedCenter = lockedProjectionCenter {
                // Position is frozen in world space. Re-project only when
                // LiDAR mesh updates or camera angle shifts (360° viewing).
                // Never auto-unlock. Never hide.
                if tattooEntity.parent !== worldAnchorEntity {
                    tattooEntity.removeFromParent()
                    worldAnchorEntity.addChild(tattooEntity)
                }

                // Proximity warning
                let camDist = simd_distance(arView.cameraTransform.translation, lockedCenter)
                if camDist < 0.40 {
                    statusMessage.wrappedValue = "Move back for best tattoo quality"
                } else {
                    if statusMessage.wrappedValue == "Move back for best tattoo quality" {
                        statusMessage.wrappedValue = nil
                    }
                }

                // Throttled re-projection: only when mesh/angle changed
                guard meshNeedsReProjection else {
                    worldAnchorEntity.position = lockedCenter
                    return
                }

                let sizeMeters = configuration.bodyPartMode.profile.defaultSizeMeters
                let targetSize = SIMD2<Float>(
                    Float(sizeMeters.width) * configuration.scale,
                    Float(sizeMeters.height) * configuration.scale
                )

                let projectionSucceeded = updateMeshProjection(centerWorld: lockedCenter, size: targetSize)

                if projectionSucceeded {
                    projectionEntity?.isEnabled = true
                    tattooEntity.isEnabled = false
                    worldAnchorEntity.position = lockedCenter
                    lastSuccessfulProjectionTime = Date()
                    consecutiveProjectionFailures = 0
                    meshNeedsReProjection = false

                    // Store camera state for movement detection
                    if let av = self.arView {
                        lastLockedCameraForward = simd_normalize(
                            SIMD3<Float>(av.cameraTransform.matrix.columns.2.x,
                                        av.cameraTransform.matrix.columns.2.y,
                                        av.cameraTransform.matrix.columns.2.z))
                        lastLockedCameraPosition = av.cameraTransform.translation
                    }
                } else {
                    // Infinite hold: keep last good mesh visible
                    worldAnchorEntity.position = lockedCenter
                }
                return
            }

            // ── Unlocked: Follow screen center (original behavior) ──
            let now = Date()
            // Reduced throttle (was 150ms / ~6.7fps) for smoother real-time tracking.
            // 50ms ≈ 20fps keeps placement responsive during camera movement.
            if let lastWorldPlacementTime, now.timeIntervalSince(lastWorldPlacementTime) < 0.050 {
                return
            }
            lastWorldPlacementTime = now

            let center = CGPoint(x: arView.bounds.midX, y: arView.bounds.midY)
            if let query = arView.makeRaycastQuery(from: center, allowing: .existingPlaneGeometry, alignment: .any),
               let result = arView.session.raycast(query).first {
                worldAnchorEntity.transform = Transform(matrix: result.worldTransform)
                if tattooEntity.parent !== worldAnchorEntity {
                    tattooEntity.removeFromParent()
                    worldAnchorEntity.addChild(tattooEntity)
                }
                let sizeMeters = configuration.bodyPartMode.profile.defaultSizeMeters
                let targetSize = SIMD2<Float>(
                    Float(sizeMeters.width) * configuration.scale,
                    Float(sizeMeters.height) * configuration.scale
                )
                let centerWorld = SIMD3<Float>(
                    result.worldTransform.columns.3.x,
                    result.worldTransform.columns.3.y,
                    result.worldTransform.columns.3.z
                )
                if updateMeshProjection(centerWorld: centerWorld, size: targetSize) {
                    projectionEntity?.isEnabled = true
                    tattooEntity.isEnabled = false
                } else {
                    projectionEntity?.isEnabled = false
                    tattooEntity.isEnabled = true
                }
                return
            }

            if let query = arView.makeRaycastQuery(from: center, allowing: .estimatedPlane, alignment: .any),
               let result = arView.session.raycast(query).first {
                worldAnchorEntity.transform = Transform(matrix: result.worldTransform)
                if tattooEntity.parent !== worldAnchorEntity {
                    tattooEntity.removeFromParent()
                    worldAnchorEntity.addChild(tattooEntity)
                }
                let sizeMeters = configuration.bodyPartMode.profile.defaultSizeMeters
                let targetSize = SIMD2<Float>(
                    Float(sizeMeters.width) * configuration.scale,
                    Float(sizeMeters.height) * configuration.scale
                )
                let centerWorld = SIMD3<Float>(
                    result.worldTransform.columns.3.x,
                    result.worldTransform.columns.3.y,
                    result.worldTransform.columns.3.z
                )
                if updateMeshProjection(centerWorld: centerWorld, size: targetSize) {
                    projectionEntity?.isEnabled = true
                    tattooEntity.isEnabled = false
                } else {
                    projectionEntity?.isEnabled = false
                    tattooEntity.isEnabled = true
                }
                return
            }

            let cameraTransform = arView.cameraTransform
            let forward = -SIMD3<Float>(
                cameraTransform.matrix.columns.2.x,
                cameraTransform.matrix.columns.2.y,
                cameraTransform.matrix.columns.2.z
            )
            let fallbackPosition = cameraTransform.translation + forward * 0.5
            worldAnchorEntity.position = fallbackPosition
            if tattooEntity.parent !== worldAnchorEntity {
                tattooEntity.removeFromParent()
                worldAnchorEntity.addChild(tattooEntity)
            }
            let sizeMeters = configuration.bodyPartMode.profile.defaultSizeMeters
            let targetSize = SIMD2<Float>(
                Float(sizeMeters.width) * configuration.scale,
                Float(sizeMeters.height) * configuration.scale
            )
            if updateMeshProjection(centerWorld: fallbackPosition, size: targetSize) {
                projectionEntity?.isEnabled = true
                tattooEntity.isEnabled = false
            } else {
                projectionEntity?.isEnabled = false
                tattooEntity.isEnabled = true
            }
        }

        // MARK: - Improved Mesh Projection Engine
        // Projects the tattoo texture onto LiDAR mesh triangles with proper surface
        // wrapping. Uses per-vertex normal offsets, arc-length UV computation, and
        // curvature-adaptive positioning to prevent clipping on curved body parts.

        private func updateMeshProjection(centerWorld: SIMD3<Float>, size: SIMD2<Float>) -> Bool {
            guard let projectionEntity, let projectionAnchorEntity else { return false }
            let now = Date()
            // Throttle: standard 30fps, reduced during body tracking + recording
            let throttleInterval: TimeInterval
            if configuration.bodyTrackingEnabled && configuration.isRecording {
                throttleInterval = 0.100  // 10fps during recording to save CPU for encoding
            } else if configuration.bodyTrackingEnabled {
                throttleInterval = 0.050  // 20fps when not recording
            } else {
                throttleInterval = 0.033  // 30fps for non-body tracking
            }
            if let lastProjectionTime, now.timeIntervalSince(lastProjectionTime) < throttleInterval {
                return projectionEntity.components[ModelComponent.self] != nil
            }
            lastProjectionTime = now

            guard let image = configuration.image else { return false }

            // Load the active body part's projection profile
            let profile = configuration.bodyPartMode.profile

            // ── Arm-mode surface snapping ──
            // When an arm lies on a table/desk and is viewed from above, the
            // raycast hits the TABLE surface, not the arm. This places centerWorld
            // on the table, causing the tattoo to render hidden under the arm.
            // Fix: offset centerWorld toward the camera by the anatomical radius.
            // This lifts the projection center from the table onto the arm surface.
            // For side views, the offset pulls from the wall onto the arm surface.
            // Uses lock-time camera position when locked for consistency.
            var centerWorld = centerWorld
            if configuration.bodyPartMode.isArmMode,
               let anatomicalRadius = profile.knownAnatomicalRadius {
                let camPos: SIMD3<Float>?
                if isPlacementLocked, let lockPos = lockedCameraPosition {
                    camPos = lockPos
                } else {
                    camPos = arView?.cameraTransform.translation
                }
                if let cp = camPos {
                    let toCamera = simd_normalize(cp - centerWorld)
                    centerWorld = centerWorld + toCamera * anatomicalRadius
                }
            }

            // ── Image-aware aspect ratio ──
            // Compute the decal size to match the tattoo image's actual aspect
            // ratio, preventing stretching. Use the larger requested dimension
            // as the baseline and scale the other to preserve proportions.
            let rawSize = SIMD2<Float>(
                max(size.x, minimumDecalSizeMeters),
                max(size.y, minimumDecalSizeMeters)
            )
            let imageAspect = Float(image.size.width) / Float(max(image.size.height, 1))
            let maxDim = max(rawSize.x, rawSize.y)
            let safeSize: SIMD2<Float>
            if imageAspect >= 1.0 {
                // Landscape or square image
                safeSize = SIMD2<Float>(maxDim, maxDim / imageAspect)
            } else {
                // Portrait image
                safeSize = SIMD2<Float>(maxDim * imageAspect, maxDim)
            }
            // Use profile parameters directly — NO body tracking boosts.
            // The profile values are already calibrated for each body part's geometry.
            // Previous boosts (searchRadius ×1.3, maxTris 35K, relaxed UV/normal)
            // caused wall/floor triangles to contaminate the projection mesh.
            let searchRadiusMult = profile.searchRadiusMultiplier
            var maxTris = profile.maxTriangles
            let backfaceThresh = profile.backfaceThreshold
            let normalConsThresh = profile.normalConsistencyThreshold
            let sphereFilterMult = profile.sphereFilterMultiplier
            let uvTol = profile.uvAcceptanceTolerance

            // During recording, reduce triangle budget to save CPU for encoding
            if configuration.bodyTrackingEnabled && configuration.isRecording {
                maxTris = min(maxTris, 12000)
            }

            let rawSearchRadius = max(safeSize.x, safeSize.y) * searchRadiusMult
            // Body-part-specific maximums prevent wall/floor contamination
            // in ALL modes (body tracking AND regular). Without a cap in regular
            // mode, the unconstrained search radius collects wall/floor triangles.
            let maxSearchRadius: Float
            switch configuration.bodyPartMode {
            case .chest:             maxSearchRadius = 0.35  // 35cm — chest
            case .back:              maxSearchRadius = 0.40  // 40cm — full-back tattoos
            case .upperArms:         maxSearchRadius = 0.25  // 25cm — upper arm wrap-around
            case .forearms:          maxSearchRadius = 0.22  // 22cm — forearm wrap-around
            case .hand:              maxSearchRadius = 0.15  // 15cm — hand + wrist area
            case .neck:              maxSearchRadius = 0.20  // 20cm — neck wrap-around
            case .calves:            maxSearchRadius = 0.28  // 28cm — calf (thicker than forearm)
            case .thighs:            maxSearchRadius = 0.28  // 28cm — thigh (large cylinder)
            case .general:           maxSearchRadius = 0.35  // 35cm — must cover any body area
            default:                 maxSearchRadius = 0.25  // Face/other modes
            }
            let searchRadius = min(rawSearchRadius, maxSearchRadius)

            // ── Phase 1: Collect candidate triangles with face normals ──────────
            let candidateAnchors = meshAnchors.values
                .filter { anchor in
                    let pos = SIMD3<Float>(anchor.transform.columns.3.x, anchor.transform.columns.3.y, anchor.transform.columns.3.z)
                    // Use generous radius: an anchor's triangles can extend ~0.5m+ beyond
                    // the anchor's origin point. Without this buffer, anchors whose origin
                    // is outside the search area but whose triangles ARE inside get excluded,
                    // creating sharp "invisible barrier" cutoff lines at mesh chunk boundaries.
                    return simd_distance(pos, centerWorld) <= max(1.2, searchRadius * 3.5)
                }
                .sorted { lhs, rhs in
                    let lpos = SIMD3<Float>(lhs.transform.columns.3.x, lhs.transform.columns.3.y, lhs.transform.columns.3.z)
                    let rpos = SIMD3<Float>(rhs.transform.columns.3.x, rhs.transform.columns.3.y, rhs.transform.columns.3.z)
                    return simd_distance(lpos, centerWorld) < simd_distance(rpos, centerWorld)
                }

            guard !candidateAnchors.isEmpty else { return false }

            // Store triangles together with their unnormalized face normals
            // (magnitude = 2× triangle area, used for area-weighted averaging)
            struct TriangleData {
                let v0: SIMD3<Float>
                let v1: SIMD3<Float>
                let v2: SIMD3<Float>
                let faceNormal: SIMD3<Float>
            }

            var selectedTriangles: [TriangleData] = []
            var weightedNormalSum = SIMD3<Float>.zero
            var totalNormalWeight: Float = 0
            let maxTriangles = maxTris

            // Cache camera state outside the inner loop for performance.
            // Active for ALL rear-camera modes (enables depth filter + skin mask).
            // In locked mode, use lock-time camera position for stable depth filtering.
            // This prevents the depth vector from rotating as the user orbits, which
            // would cause different triangles to pass/fail on each re-projection.
            let cachedCamPos: SIMD3<Float>? = {
                if isPlacementLocked, let lockPos = lockedCameraPosition {
                    return lockPos  // Stable depth reference from lock time
                }
                return (!configuration.bodyPartMode.requiresFrontCamera) ? arView?.cameraTransform.translation : nil
            }()
            let cachedCamToCenter: SIMD3<Float>? = cachedCamPos.map { simd_normalize(centerWorld - $0) }
            let cachedCenterDepth: Float? = {
                guard let camPos = cachedCamPos, let dir = cachedCamToCenter else { return nil }
                return simd_dot(centerWorld - camPos, dir)
            }()

            // ── Skin mask pre-filter setup ──
            // Cache the skin segmentation mask data pointer and screen dimensions
            // for fast per-triangle skin lookup. This eliminates non-skin triangles
            // (clothing, background) early, reducing the working set significantly.
            let skinMaskData: (ptr: UnsafePointer<UInt8>, width: Int, height: Int, bytesPerRow: Int)?
            let screenBounds: CGRect?
            // Skin mask is used for ALL rear-camera modes to filter
            // non-skin triangles (clothing, background, walls).
            if !configuration.bodyPartMode.requiresFrontCamera,
               let maskCG = skinSegmentationManager?.latestSkinMaskCGImage,
               let dataProvider = maskCG.dataProvider,
               let data = dataProvider.data,
               let ptr = CFDataGetBytePtr(data),
               let av = arView {
                skinMaskData = (ptr: ptr, width: maskCG.width, height: maskCG.height, bytesPerRow: maskCG.bytesPerRow)
                screenBounds = av.bounds
            } else {
                skinMaskData = nil
                screenBounds = nil
            }

            // ── ARKit person segmentation pre-filter ──
            // ARKit provides a FREE person segmentation mask (255=person, 0=background)
            // from personSegmentationWithDepth. This is MORE reliable than our custom
            // skin model for distinguishing person vs walls/floor/furniture.
            // We use it as a fast first-pass filter: if the centroid projects to a
            // "not person" pixel, skip the triangle immediately.
            let personSegData: (ptr: UnsafeMutableRawPointer, width: Int, height: Int, bytesPerRow: Int)?
            if let segBuffer = latestPersonSegBuffer {
                CVPixelBufferLockBaseAddress(segBuffer, .readOnly)
                if let baseAddr = CVPixelBufferGetBaseAddress(segBuffer) {
                    let w = CVPixelBufferGetWidth(segBuffer)
                    let h = CVPixelBufferGetHeight(segBuffer)
                    let bpr = CVPixelBufferGetBytesPerRow(segBuffer)
                    personSegData = (ptr: baseAddr, width: w, height: h, bytesPerRow: bpr)
                } else {
                    personSegData = nil
                }
            } else {
                personSegData = nil
            }

            // Skin confidence threshold: pixels below this are classified as non-skin.
            // 3-tiered: locked mode is most lenient (user validated), body tracking
            // is standard, and regular unlocked is slightly stricter.
            let skinThreshold: UInt8
            if isPlacementLocked {
                skinThreshold = 20   // 0.08 — very lenient (position validated)
            } else if configuration.bodyTrackingEnabled {
                skinThreshold = 35   // 0.14 — standard (person seg handles background)
            } else {
                skinThreshold = 30   // 0.12 — relaxed (person seg handles background)
            }

            // Track how many triangles pass distance/depth but fail skin filter
            // for the safety fallback mechanism.
            var candidatesBeforeSkinFilter: Int = 0

            // Distance-adaptive depth threshold: reject triangles behind the body surface.
            // Body tracking uses tighter thresholds to prevent wall/floor contamination.
            // Body-part-specific depth boost: back and chest have natural curvature
            // (shoulder blades, spinal groove, pectoral dome) that causes edge triangles
            // to sit further from the camera than the center. Without this boost,
            // those triangles get depth-rejected, creating curved cutoff lines.
            let bodyPartDepthBoost: Float
            switch configuration.bodyPartMode {
            case .back:    bodyPartDepthBoost = 0.05  // +5cm for spinal/shoulder blade curvature
            case .chest:   bodyPartDepthBoost = 0.04  // +4cm for pectoral dome curvature
            default:       bodyPartDepthBoost = 0.0
            }

            let depthThreshold: Float = {
                guard let camPos = cachedCamPos else { return 0.08 + bodyPartDepthBoost }
                let camDist = simd_distance(camPos, centerWorld)
                if isPlacementLocked {
                    // Any locked mode (body tracking or regular): relaxed filter (5–10cm)
                    // Position was user-validated, so we can trust nearby geometry.
                    // At 0.5m → 10cm, at 0.75m → 8cm, at 1.0m → 7cm, at 1.5m → 5cm
                    return max(0.05, 0.12 - camDist * 0.04) + bodyPartDepthBoost
                } else if configuration.bodyTrackingEnabled {
                    // Phase A (unlocked body tracking): tight filter (3–6cm)
                    return max(0.03, 0.075 - camDist * 0.02) + bodyPartDepthBoost
                } else {
                    // Non-body tracking, unlocked: original generous threshold
                    // At 0.75m → 12cm, at 1.0m → 10cm, at 1.5m → 7cm, at 2.0m → 6cm
                    return max(0.06, 0.15 - camDist * 0.04) + bodyPartDepthBoost
                }
            }()

            for anchor in candidateAnchors {
                let anchorTransform = anchor.transform
                let geometry = anchor.geometry
                let vertices = geometry.vertices
                let faces = geometry.faces
                let indexCount = faces.indexCountPerPrimitive
                let primitiveCount = faces.count

                for primitiveIndex in 0..<primitiveCount {
                    let faceIndices = readIndices(from: faces, primitiveIndex: primitiveIndex)
                    guard faceIndices.count == indexCount else { continue }
                    let v0 = worldPosition(of: Int(faceIndices[0]), vertices: vertices, transform: anchorTransform)
                    let v1 = worldPosition(of: Int(faceIndices[1]), vertices: vertices, transform: anchorTransform)
                    let v2 = worldPosition(of: Int(faceIndices[2]), vertices: vertices, transform: anchorTransform)

                    let centroid = (v0 + v1 + v2) / 3.0
                    let distance = simd_distance(centroid, centerWorld)

                    if distance <= searchRadius {
                        // During body tracking, reject triangles behind the body surface.
                        // Uses cached camera state (no per-triangle arView access) and
                        // distance-adaptive threshold for close-range resilience.
                        if let camToCenter = cachedCamToCenter,
                           let centerDepth = cachedCenterDepth,
                           let camPos = cachedCamPos {
                            let centroidDepth = simd_dot(centroid - camPos, camToCenter)
                            let depthBehind = centroidDepth - centerDepth
                            if depthBehind > depthThreshold { continue }
                        }

                        let faceNormal = simd_cross(v1 - v0, v2 - v0)
                        let area = simd_length(faceNormal) * 0.5
                        guard area > 1e-8 else { continue }

                        candidatesBeforeSkinFilter += 1

                        // ── Layer 1: ARKit person segmentation pre-filter ──
                        // Fast first-pass: reject triangles on walls/floor/furniture.
                        // Only active for chest/back where ARKit person seg is highly reliable.
                        // For isolated limbs (arms/legs), ARKit person seg often fails to
                        // recognize the limb as a person, causing the projection to disappear.
                        /*
                        if !isPlacementLocked,
                           (configuration.bodyPartMode == .chest || configuration.bodyPartMode == .back),
                           let personSeg = personSegData,
                           let bounds = screenBounds,
                           let av = arView,
                           let frame = av.session.currentFrame {
                            if let screenPt = av.project(centroid) {
                                // Convert viewport pixel coordinate to a normalized viewport coordinate (0...1)
                                let normPt = CGPoint(x: screenPt.x / bounds.width, y: screenPt.y / bounds.height)

                                // The segmentation buffer is in the raw camera image coordinate space (landscape).
                                // displayTransform maps from image coordinates to viewport coordinates.
                                // We invert it to map from viewport coordinates to the raw image coordinates.
                                let displayTransform = frame.displayTransform(for: .portrait, viewportSize: bounds.size)
                                let imagePt = normPt.applying(displayTransform.inverted())

                                let pX = Int(imagePt.x * CGFloat(personSeg.width))
                                let pY = Int(imagePt.y * CGFloat(personSeg.height))

                                if pX >= 0 && pX < personSeg.width && pY >= 0 && pY < personSeg.height {
                                    let personValue = personSeg.ptr.load(fromByteOffset: pY * personSeg.bytesPerRow + pX, as: UInt8.self)
                                    if personValue < 128 {
                                        continue  // Not a person — background/wall/furniture
                                    }
                                }
                            }
                        }
                        */

                        // ── Layer 2: Skin mask pre-filter ──
                        // Project centroid to screen space and sample the skin mask.
                        // Skip triangles on non-skin regions (clothing, background)
                        // to reduce triangle count and improve performance.
                        //
                        // BYPASSED IN LOCKED MODE: position already validated on skin.
                        // BYPASSED FOR LIMBS & NECK: Skin mask causes fragmentation
                        // on narrow/cylindrical body parts. Depth + geometric filters
                        // are sufficient for these modes.
                        let skinMaskApplies = (configuration.bodyPartMode == .chest
                            || configuration.bodyPartMode == .back)
                        if !isPlacementLocked, skinMaskApplies {
                            if let mask = skinMaskData,
                               let bounds = screenBounds,
                               let av = arView {
                                if let screenPt = av.project(centroid) {
                                    let normX = Float(screenPt.x / bounds.width)
                                    let normY = Float(screenPt.y / bounds.height)
                                    let maskX = Int(normX * Float(mask.width))
                                    let maskY = Int(normY * Float(mask.height))
                                    if maskX >= 0 && maskX < mask.width && maskY >= 0 && maskY < mask.height {
                                        let pixelValue = mask.ptr[maskY * mask.bytesPerRow + maskX]
                                        if pixelValue < skinThreshold {
                                            continue  // Not skin — skip this triangle
                                        }
                                    }
                                }
                            }
                        }

                        selectedTriangles.append(TriangleData(
                            v0: v0, v1: v1, v2: v2,
                            faceNormal: faceNormal
                        ))

                        // Accumulate area-weighted and distance-weighted normal
                        // for computing the average projection axis
                        let distWeight = 1.0 / max(distance, 0.001)
                        let weight = area * distWeight
                        weightedNormalSum += simd_normalize(faceNormal) * weight
                        totalNormalWeight += weight
                    }

                    if selectedTriangles.count >= maxTriangles { break }
                }

                if selectedTriangles.count >= maxTriangles { break }
            }

            // ── Safety fallback: if skin/person mask rejected >70% of candidates, ──
            // the mask is likely unreliable for this body part/angle.
            // Re-collect WITHOUT the skin filter to avoid empty/sparse projections.
            /*
            let skinSurvivalRate = candidatesBeforeSkinFilter > 0 ? Float(selectedTriangles.count) / Float(candidatesBeforeSkinFilter) : 1.0
            if skinSurvivalRate < 0.30 && candidatesBeforeSkinFilter > 10 && (skinMaskData != nil || personSegData != nil) {
                // Skin mask was too aggressive — re-collect from scratch without it.
                // Clear existing triangles to avoid duplicates and budget waste.
                selectedTriangles.removeAll(keepingCapacity: true)
                weightedNormalSum = .zero
                totalNormalWeight = 0
                for anchor in candidateAnchors {
                    let anchorTransform = anchor.transform
                    let geometry = anchor.geometry
                    let vertices = geometry.vertices
                    let faces = geometry.faces
                    let indexCount = faces.indexCountPerPrimitive
                    let primitiveCount = faces.count
                    for primitiveIndex in 0..<primitiveCount {
                        let faceIndices = readIndices(from: faces, primitiveIndex: primitiveIndex)
                        guard faceIndices.count == indexCount else { continue }
                        let v0 = worldPosition(of: Int(faceIndices[0]), vertices: vertices, transform: anchorTransform)
                        let v1 = worldPosition(of: Int(faceIndices[1]), vertices: vertices, transform: anchorTransform)
                        let v2 = worldPosition(of: Int(faceIndices[2]), vertices: vertices, transform: anchorTransform)
                        let centroid = (v0 + v1 + v2) / 3.0
                        let distance = simd_distance(centroid, centerWorld)
                        if distance <= searchRadius {
                            if let camToCenter = cachedCamToCenter,
                               let centerDepth = cachedCenterDepth,
                               let camPos = cachedCamPos {
                                let centroidDepth = simd_dot(centroid - camPos, camToCenter)
                                if centroidDepth - centerDepth > depthThreshold { continue }
                            }
                            let faceNormal = simd_cross(v1 - v0, v2 - v0)
                            let area = simd_length(faceNormal) * 0.5
                            guard area > 1e-8 else { continue }
                            selectedTriangles.append(TriangleData(v0: v0, v1: v1, v2: v2, faceNormal: faceNormal))
                            let distWeight = 1.0 / max(distance, 0.001)
                            let weight = area * distWeight
                            weightedNormalSum += simd_normalize(faceNormal) * weight
                            totalNormalWeight += weight
                        }
                        if selectedTriangles.count >= maxTriangles { break }
                    }
                    if selectedTriangles.count >= maxTriangles { break }
                }
            }
            */

            // ── Hand-mode depth proximity clamp ──────────────────────────────
            // The hand is very thin (~2cm) and often viewed with walls/tables
            // behind it. Wall/table triangles pass all spatial filters because
            // they're within searchRadius of centerWorld. This post-filter finds
            // the nearest-to-camera triangle and rejects everything more than
            // 3cm deeper, creating a thin "shell" that captures only the hand.
            // ONLY applied for .hand mode — all other body parts unchanged.
            if configuration.bodyPartMode == .hand,
               !selectedTriangles.isEmpty,
               let camPos = cachedCamPos {
                // Find depth of the triangle closest to the camera
                var minCamDist: Float = .greatestFiniteMagnitude
                for tri in selectedTriangles {
                    let centroid = (tri.v0 + tri.v1 + tri.v2) / 3.0
                    let d = simd_distance(camPos, centroid)
                    if d < minCamDist { minCamDist = d }
                }
                // Keep only triangles within 3cm of the nearest surface
                let handDepthClamp: Float = 0.03
                let filteredTriangles = selectedTriangles.filter { tri in
                    let centroid = (tri.v0 + tri.v1 + tri.v2) / 3.0
                    return simd_distance(camPos, centroid) < minCamDist + handDepthClamp
                }
                if !filteredTriangles.isEmpty {
                    selectedTriangles = filteredTriangles
                    // Recompute weighted normal from filtered set
                    weightedNormalSum = .zero
                    totalNormalWeight = 0
                    for tri in selectedTriangles {
                        let centroid = (tri.v0 + tri.v1 + tri.v2) / 3.0
                        let distance = simd_distance(centroid, centerWorld)
                        let area = simd_length(tri.faceNormal) * 0.5
                        let distWeight = 1.0 / max(distance, 0.001)
                        let weight = area * distWeight
                        weightedNormalSum += simd_normalize(tri.faceNormal) * weight
                        totalNormalWeight += weight
                    }
                }
            }

            guard !selectedTriangles.isEmpty else { return false }

            // ── Phase 2: Weighted average normal for stable projection axis ─────
            var projNormal: SIMD3<Float>
            if simd_length(weightedNormalSum) > 1e-6 {
                projNormal = simd_normalize(weightedNormalSum)
            } else {
                projNormal = SIMD3<Float>(0, 0, 1)
            }

            // ── Camera-facing normal validation ──
            // If the weighted average normal faces away from the camera,
            // it means contaminating triangles (wall, floor) skewed the average.
            // Override with the camera→center direction to ensure the tattoo
            // faces the camera properly. Active for body tracking AND regular lock.
            if isPlacementLocked, let storedNormal = lockedSurfaceNormal {
                // LOCKED: For body-tracked torso modes (chest/back/neck), derive the
                // projection normal from the skeleton's forward direction. This keeps
                // the tattoo aligned to the BODY surface as the camera orbits, instead
                // of locking to the initial camera angle.
                if configuration.bodyTrackingEnabled, let bodyForward = bodyJointForwardVector {
                    let bodyMode = configuration.bodyPartMode
                    if bodyMode == .chest || bodyMode == .back || bodyMode == .neck {
                        // Chest faces forward (+Z from joint), back faces backward (-Z)
                        let sign: Float = (bodyMode == .back) ? -1.0 : 1.0
                        projNormal = simd_normalize(bodyForward * sign)
                    } else {
                        projNormal = storedNormal
                    }
                } else {
                    projNormal = storedNormal
                }
            } else if (configuration.bodyTrackingEnabled || isPlacementLocked), let av = self.arView {
                let camPos = av.cameraTransform.translation
                let camToCenter = simd_normalize(centerWorld - camPos)
                // If projNormal faces away from camera (dot > 0 means same direction
                // as cam→center, i.e. facing away), use camera→center as the normal
                if simd_dot(projNormal, camToCenter) > 0.1 {
                    projNormal = -camToCenter  // Point toward camera
                }
            }

            // Store the projection normal on the FIRST successful locked projection.
            // This becomes the stable reference for all subsequent re-projections,
            // preventing the tangent frame from rotating as the camera orbits.
            if isPlacementLocked && lockedSurfaceNormal == nil {
                lockedSurfaceNormal = projNormal
            }

            // Build the tangent frame from the weighted average normal.
            // During body tracking, use the cached joint Y axis (spine direction)
            // so the tattoo tilts with the user's body lean instead of staying
            // gravity-aligned. Falls back to world-up for non-body tracking.
            let up: SIMD3<Float>
            if configuration.bodyTrackingEnabled, let bodyUp = bodyJointUpVector {
                if abs(simd_dot(simd_normalize(bodyUp), projNormal)) < 0.9 {
                    up = simd_normalize(bodyUp)
                } else {
                    up = SIMD3<Float>(1, 0, 0)
                }
            } else {
                up = abs(projNormal.y) < 0.9
                    ? SIMD3<Float>(0, 1, 0) : SIMD3<Float>(1, 0, 0)
            }
            var tangent = simd_normalize(simd_cross(up, projNormal))
            var bitangent = -simd_normalize(simd_cross(projNormal, tangent))

            // ── Apply user rotation ──
            // Rotate the tangent frame around the projection normal by the user's
            // rotation angle (from the twist gesture or slider).
            let rotRad = configuration.rotationDegrees * .pi / 180.0
            if abs(rotRad) > 0.001 {
                let cosR = cos(rotRad)
                let sinR = sin(rotRad)
                let newTangent = tangent * cosR + bitangent * sinR
                let newBitangent = -tangent * sinR + bitangent * cosR
                tangent = simd_normalize(newTangent)
                bitangent = simd_normalize(newBitangent)
            }

            let anchorMatrix = simd_float4x4(
                SIMD4<Float>(tangent, 0),
                SIMD4<Float>(bitangent, 0),
                SIMD4<Float>(projNormal, 0),
                SIMD4<Float>(centerWorld, 1)
            )
            projectionAnchorEntity.transform = Transform(matrix: anchorMatrix)
            let inverseAnchor = anchorMatrix.inverse

            // ── Phase 3: Per-vertex smooth normals via spatial hashing ──────────
            // Quantize vertex positions to a ~0.25 mm grid so that vertices shared
            // across different triangles (and mesh anchors) map to the same key.
            // Each key accumulates the unnormalized face normals (area-weighted)
            // of every triangle that shares that vertex position.
            struct VertexKey: Hashable {
                let x: Int32; let y: Int32; let z: Int32
                init(_ pos: SIMD3<Float>, scale: Float) {
                    x = Int32((pos.x * scale).rounded())
                    y = Int32((pos.y * scale).rounded())
                    z = Int32((pos.z * scale).rounded())
                }
            }

            let hashScale = profile.spatialHashScale

            var normalAccumulator: [VertexKey: SIMD3<Float>] = [:]
            normalAccumulator.reserveCapacity(selectedTriangles.count * 2)
            for tri in selectedTriangles {
                let fn = tri.faceNormal
                for v in [tri.v0, tri.v1, tri.v2] {
                    let key = VertexKey(v, scale: hashScale)
                    normalAccumulator[key, default: .zero] += fn
                }
            }

            // ── Phase 4: Estimate surface curvature ─────────────────────────────
            // Measure how much the individual face normals deviate from the average
            // projection normal. High variance = high curvature (arms, hands);
            // low variance = flat (thighs, chest).
            var normalDotSum: Float = 0
            var normalDotCount: Float = 0
            for tri in selectedTriangles {
                let triNormLen = simd_length(tri.faceNormal)
                guard triNormLen > 1e-8 else { continue }
                let triNorm = tri.faceNormal / triNormLen
                let dotVal = simd_dot(triNorm, projNormal)
                normalDotSum += (1.0 - max(dotVal, 0))
                normalDotCount += 1
            }
            let curvatureMetric = normalDotCount > 0
                ? normalDotSum / normalDotCount : 0
            // curvatureMetric: ~0 = flat, ~0.05 = slight curve, ~0.2+ = highly curved

            // Adaptive surface offset: flat areas get a small offset,
            // curved areas get more to avoid clipping on curvature.
            // During body tracking, add a distance-adaptive boost because
            // LiDAR mesh accuracy degrades at range (1–3m vs <1m), producing
            // noisier/coarser triangles that need more clearance.
            var surfaceOffset = profile.baseSurfaceOffset
                + min(curvatureMetric * profile.offsetCurvatureScale, profile.maxAdditionalOffset)

            if configuration.bodyTrackingEnabled, let arView = self.arView {
                let camPos = arView.cameraTransform.translation
                let camDist = simd_distance(camPos, centerWorld)
                // Scale offset: starts at 0.75m, 2mm per meter beyond that
                let distanceBoost = max(0, (camDist - 0.75)) * 0.002
                surfaceOffset += min(distanceBoost, 0.008) // Cap at 8mm extra
            }

            // Estimate local radius of curvature for arc-length UV mapping.
            // For cylindrical body parts with a known anatomical radius, use
            // the known value directly — it's far more reliable than estimating
            // from noisy LiDAR normal data. For unknown geometry, fall back to
            // the curvature-based estimation.
            let halfDecalSize = max(safeSize.x, safeSize.y) * 0.5
            let estimatedRadius: Float
            if let knownRadius = profile.knownAnatomicalRadius {
                // Use the anatomically researched radius for this body part.
                // This is the radius of the cylinder that the body part
                // most closely resembles (e.g., forearm ≈ 4.2cm, thigh ≈ 8.5cm).
                estimatedRadius = knownRadius
            } else if curvatureMetric > 0.005 {
                // Fall back to curvature-based estimation for unknown geometry
                let sqrtArg = max(6.0 * curvatureMetric, 0.01)
                estimatedRadius = max(profile.minEstimatedRadius, min(halfDecalSize / sqrt(sqrtArg), 0.5))
            } else {
                estimatedRadius = 10.0 // effectively flat
            }

            // Determine the arc-length UV blend factor.
            // For body parts that are NOT cylindrical (face, hand, back, chest),
            // force pure planar UV. The atan2-based arc-length model assumes
            // cylindrical geometry and produces INCORRECT warping on doubly-curved
            // surfaces (face), convex domes (chest), flat surfaces (back), and
            // complex topologies (hand).
            let arcBlendFactor: Float
            if profile.prefersPlanarUV {
                // Force planar UV — this body part's geometry is not cylindrical
                arcBlendFactor = 0.0
            } else {
                // Cylindrical body part — smoothly blend in arc-length UV
                arcBlendFactor = min(max(
                    (curvatureMetric - profile.arcBlendRampStart) / (profile.arcBlendRampEnd - profile.arcBlendRampStart),
                    0.0), 1.0)
            }

            // ── Phase 5: Build projection mesh ──────────────────────────────────
            var positions: [SIMD3<Float>] = []
            var meshNormals: [SIMD3<Float>] = []
            var uvs: [SIMD2<Float>] = []
            var meshIndices: [UInt32] = []

            positions.reserveCapacity(selectedTriangles.count * 3)
            meshNormals.reserveCapacity(selectedTriangles.count * 3)
            uvs.reserveCapacity(selectedTriangles.count * 3)
            meshIndices.reserveCapacity(selectedTriangles.count * 3)

            // Spherical distance limit for vertex inclusion (replaces flat bbox)
            let maxSphereRadius = max(safeSize.x, safeSize.y) * sphereFilterMult

            for tri in selectedTriangles {
                // ── Normal consistency filter ──
                // Reject noisy/artifact triangles whose face normal is wildly
                // inconsistent with the smooth normals of their vertices. These
                // stray triangles cause the small floating fragments.
                let triNormLen = simd_length(tri.faceNormal)
                guard triNormLen > 1e-8 else { continue }
                let triNormalized = tri.faceNormal / triNormLen

                // Check that the triangle faces roughly toward the camera (not
                // a backface that would produce z-fighting artifacts).
                // In LOCKED mode, use the stored lock-time camera direction so
                // the same set of triangles always passes regardless of where
                // the camera is currently positioned. This prevents fragmentation.
                let triCentroid = (tri.v0 + tri.v1 + tri.v2) / 3.0
                if isPlacementLocked, let lockDir = lockedCameraDirection {
                    // LOCKED: stable backface test using lock-time view direction
                    if simd_dot(triNormalized, lockDir) > backfaceThresh { continue }
                } else if let arView = self.arView {
                    // UNLOCKED: use live camera position (original behavior)
                    let camPos = arView.cameraTransform.translation
                    let viewDir = simd_normalize(triCentroid - camPos)
                    if simd_dot(triNormalized, viewDir) > backfaceThresh { continue }
                }

                // Additional filter for locked projections: reject triangles that face
                // strongly away from the projection normal. Allows side-wrapping
                // (up to ~130° from projection direction) while rejecting truly
                // backfacing triangles from the far side of the body.
                if isPlacementLocked {
                    let projAlignment = simd_dot(triNormalized, projNormal)
                    // Reject triangles facing strongly away from projection normal.
                    // Chest/Back modes use a more relaxed threshold (-0.80 → ~144°) because
                    // they are large surfaces that should wrap further at side views.
                    // Other modes use -0.65 (~130°).
                    let projAlignmentThreshold: Float = (configuration.bodyPartMode == .back || configuration.bodyPartMode == .chest) ? -0.80 : -0.65
                    if projAlignment < projAlignmentThreshold { continue }
                }

                // Check each vertex's smooth normal against the face normal.
                // If the average deviation is too high, the triangle is noisy.
                var avgSmoothDot: Float = 0
                for v in [tri.v0, tri.v1, tri.v2] {
                    let key = VertexKey(v, scale: hashScale)
                    let accN = normalAccumulator[key] ?? projNormal
                    let accLen = simd_length(accN)
                    let sn = accLen > 1e-6 ? accN / accLen : projNormal
                    avgSmoothDot += abs(simd_dot(sn, triNormalized))
                }
                avgSmoothDot /= 3.0
                if avgSmoothDot < normalConsThresh { continue }

                let triVertices = [tri.v0, tri.v1, tri.v2]
                var vertexData: [(position: SIMD3<Float>, uv: SIMD2<Float>)] = []
                vertexData.reserveCapacity(3)
                var includeTriangle = true

                for vertex in triVertices {
                    // Look up the smooth normal for this vertex
                    let key = VertexKey(vertex, scale: hashScale)
                    let accNormal = normalAccumulator[key] ?? projNormal
                    let accLen = simd_length(accNormal)
                    let smoothNormal = accLen > 1e-6
                        ? accNormal / accLen : projNormal

                    // Offset vertex along its own smooth surface normal
                    // (prevents clipping on curved surfaces)
                    let offsetVertex = vertex + smoothNormal * surfaceOffset

                    // Compute world-space offset from projection center
                    let offset = offsetVertex - centerWorld
                    let dx = simd_dot(offset, tangent)
                    let dy = simd_dot(offset, bitangent)

                    // Spherical distance filter (replaces flat bounding box)
                    let dist = simd_distance(offsetVertex, centerWorld)
                    if dist > maxSphereRadius {
                        includeTriangle = false
                        break
                    }

                    // Compute texture coordinates
                    let u: Float
                    let v: Float
                    // Compute planar UV as the baseline
                    let planarU = 0.5 + (dx / safeSize.x)
                    let planarV = 0.5 - (dy / safeSize.y)

                    if arcBlendFactor > 0.001 {
                        // Arc-length UV: correctly wraps around cylindrical surfaces.
                        // On a cylinder of radius R, atan2(dx, dz+R) recovers the
                        // arc angle θ, and θ·R gives the true arc length.
                        // Smoothly blend with planar UV based on surface curvature.
                        let dz = simd_dot(offset, projNormal)
                        let arcAngle = atan2(dx, dz + estimatedRadius)
                        let arcX = arcAngle * estimatedRadius
                        let arcU = 0.5 + (arcX / safeSize.x)
                        u = planarU + (arcU - planarU) * arcBlendFactor
                        v = planarV
                    } else {
                        u = planarU
                        v = planarV
                    }

                    // Discard vertices whose UV is far outside the texture.
                    // Wider tolerance (±15%) prevents rectangular gap artifacts
                    // at mesh anchor boundaries. The UV clamping below handles
                    // the edge pixels, and transparent tattoo images naturally
                    // fade at the edges.
                    let uvTolerance = uvTol
                    if u < -uvTolerance || u > (1 + uvTolerance) || v < -uvTolerance || v > (1 + uvTolerance) {
                        includeTriangle = false
                        break
                    }

                    let clampedU = max(0.0, min(1.0, u))
                    let clampedV = max(0.0, min(1.0, v))

                    // Transform the offset vertex to the projection anchor's
                    // local space for the mesh descriptor
                    let local4 = inverseAnchor * SIMD4<Float>(offsetVertex, 1)
                    let localPos = SIMD3<Float>(local4.x, local4.y, local4.z)

                    vertexData.append((
                        position: localPos,
                        uv: SIMD2<Float>(clampedU, clampedV)
                    ))
                }

                guard includeTriangle, vertexData.count == 3 else { continue }
                let baseIndex = UInt32(positions.count)
                for vd in vertexData {
                    positions.append(vd.position)
                    meshNormals.append(SIMD3<Float>(0, 0, 1))
                    uvs.append(vd.uv)
                }
                meshIndices.append(baseIndex)
                meshIndices.append(baseIndex + 1)
                meshIndices.append(baseIndex + 2)
            }

            // Unlock ARKit person segmentation buffer if it was locked
            if let segBuffer = latestPersonSegBuffer, personSegData != nil {
                CVPixelBufferUnlockBaseAddress(segBuffer, .readOnly)
            }

            guard !positions.isEmpty else {
                if self.isProjectionQualityPoor.wrappedValue != true {
                    DispatchQueue.main.async { self.isProjectionQualityPoor.wrappedValue = true }
                }
                return false
            }

            var descriptor = MeshDescriptor()
            descriptor.positions = MeshBuffers.Positions(positions)
            descriptor.normals = MeshBuffers.Normals(meshNormals)
            descriptor.textureCoordinates = MeshBuffers.TextureCoordinates(uvs)
            descriptor.primitives = .triangles(meshIndices)

            guard let mesh = try? MeshResource.generate(from: [descriptor]) else {
                if self.isProjectionQualityPoor.wrappedValue != true {
                    DispatchQueue.main.async { self.isProjectionQualityPoor.wrappedValue = true }
                }
                return false
            }
            let material = makeTattooMaterial(image: image)
            projectionEntity.model = ModelComponent(mesh: mesh, materials: [material])
            projectionEntity.isEnabled = true

            // Determine projection quality based on triangle count
            // A healthy projection usually has hundreds or thousands of triangles.
            // If it's less than 100, it's highly fragmented/incomplete.
            let triangleCount = meshIndices.count / 3
            let isPoor = triangleCount < 100
            if self.isProjectionQualityPoor.wrappedValue != isPoor {
                DispatchQueue.main.async {
                    self.isProjectionQualityPoor.wrappedValue = isPoor
                }
            }

            return true
        }

        private func nearestMeshAnchor(to point: SIMD3<Float>) -> ARMeshAnchor? {
            var closest: ARMeshAnchor?
            var closestDistance = Float.greatestFiniteMagnitude
            for anchor in meshAnchors.values {
                let position = SIMD3<Float>(anchor.transform.columns.3.x, anchor.transform.columns.3.y, anchor.transform.columns.3.z)
                let distance = simd_distance(position, point)
                if distance < closestDistance {
                    closestDistance = distance
                    closest = anchor
                }
            }
            return closest
        }

        private func worldPosition(of index: Int, vertices: ARGeometrySource, transform: simd_float4x4) -> SIMD3<Float> {
            let vertex = readVertex(from: vertices, index: index)
            let world = transform * SIMD4<Float>(vertex, 1)
            return SIMD3<Float>(world.x, world.y, world.z)
        }

        private func readVertex(from source: ARGeometrySource, index: Int) -> SIMD3<Float> {
            let stride = source.stride
            let offset = source.offset
            let buffer = source.buffer.contents()
            let pointer = buffer.advanced(by: index * stride + offset).assumingMemoryBound(to: Float.self)
            return SIMD3<Float>(pointer[0], pointer[1], pointer[2])
        }

        private func readIndices(from element: ARGeometryElement, primitiveIndex: Int) -> [UInt32] {
            let count = element.indexCountPerPrimitive
            let bytesPerIndex = element.bytesPerIndex
            let buffer = element.buffer.contents()
            let start = primitiveIndex * count * bytesPerIndex
            var indices: [UInt32] = []
            indices.reserveCapacity(count)

            if bytesPerIndex == 2 {
                let pointer = buffer.advanced(by: start).assumingMemoryBound(to: UInt16.self)
                for i in 0..<count {
                    indices.append(UInt32(pointer[i]))
                }
            } else {
                let pointer = buffer.advanced(by: start).assumingMemoryBound(to: UInt32.self)
                for i in 0..<count {
                    indices.append(pointer[i])
                }
            }
            return indices
        }

        private func smoothedTransform(target: Transform) -> Transform {
            let smoothing = max(0.0, min(configuration.smoothing, 0.5))
            guard smoothing > 0 else {
                lastSmoothedTransform = target
                return target
            }

            guard let previous = lastSmoothedTransform else {
                lastSmoothedTransform = target
                return target
            }

            let t = smoothing
            let blendedTranslation = previous.translation + (target.translation - previous.translation) * t
            let blendedRotation = simd_slerp(previous.rotation, target.rotation, t)
            let blendedScale = previous.scale + (target.scale - previous.scale) * t

            let blended = Transform(scale: blendedScale, rotation: blendedRotation, translation: blendedTranslation)
            lastSmoothedTransform = blended
            return blended
        }
    }
}

private extension MeshResource {
    static func generateCurvedPlane(
        width: Float,
        height: Float,
        radius: Float,
        widthSegments: Int,
        heightSegments: Int
    ) -> MeshResource {
        let columns = max(1, widthSegments)
        let rows = max(1, heightSegments)

        var positions: [SIMD3<Float>] = []
        var normals: [SIMD3<Float>] = []
        var uvs: [SIMD2<Float>] = []
        var indices: [UInt32] = []

        positions.reserveCapacity((columns + 1) * (rows + 1))
        normals.reserveCapacity((columns + 1) * (rows + 1))
        uvs.reserveCapacity((columns + 1) * (rows + 1))

        let halfHeight = height / 2.0
        let angleRange = min(width / max(radius, 0.0001), .pi * 0.75)

        for row in 0...rows {
            let v = Float(row) / Float(rows)
            let y = -halfHeight + v * height

            for column in 0...columns {
                let u = Float(column) / Float(columns)
                let t = u - 0.5
                let angle = t * angleRange

                let x = sin(angle) * radius
                let z = radius - cos(angle) * radius

                positions.append(SIMD3<Float>(x, y, z))
                let normal = simd_normalize(SIMD3<Float>(sin(angle), 0.0, -cos(angle)))
                normals.append(normal)
                uvs.append(SIMD2<Float>(u, 1.0 - v))
            }
        }

        for row in 0..<rows {
            for column in 0..<columns {
                let topLeft = UInt32(row * (columns + 1) + column)
                let topRight = UInt32(row * (columns + 1) + column + 1)
                let bottomLeft = UInt32((row + 1) * (columns + 1) + column)
                let bottomRight = UInt32((row + 1) * (columns + 1) + column + 1)

                indices.append(topLeft)
                indices.append(bottomLeft)
                indices.append(topRight)

                indices.append(topRight)
                indices.append(bottomLeft)
                indices.append(bottomRight)
            }
        }

        var descriptor = MeshDescriptor()
        descriptor.positions = MeshBuffers.Positions(positions)
        descriptor.normals = MeshBuffers.Normals(normals)
        descriptor.textureCoordinates = MeshBuffers.TextureCoordinates(uvs)
        descriptor.primitives = .triangles(indices)

        return try! MeshResource.generate(from: [descriptor])
    }
}

#Preview {
    ContentView()
}
