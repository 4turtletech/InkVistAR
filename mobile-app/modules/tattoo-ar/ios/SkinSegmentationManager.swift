//
//  SkinSegmentationManager.swift
//  TattooAR
//
//  Runs a CoreML U-Net skin segmentation model on camera frames to produce
//  a grayscale mask where white = skin, black = non-skin.
//  The mask is used by the AR tattoo pipeline to clip tattoo rendering
//  to exposed skin only.
//

import CoreML
import Vision
import CoreImage
import UIKit
import Accelerate
import Combine

/// Manages skin segmentation inference on a background queue.
/// Produces a `CGImage` mask that can be used as an alpha mask for tattoo rendering.
@MainActor
final class SkinSegmentationManager: ObservableObject {

    // MARK: - Public State

    /// The most recently computed skin mask as a CGImage (grayscale, 256×256).
    /// Updated asynchronously on every processed frame.
    private(set) var latestSkinMaskCGImage: CGImage?

    /// The most recently computed skin mask as a CIImage for compositing.
    private(set) var latestSkinMaskCIImage: CIImage?

    /// Whether the manager has been initialized successfully.
    @Published private(set) var isReady = false

    // MARK: - Private State

    private var vncoremlModel: VNCoreMLModel?
    nonisolated(unsafe) private var vnRequest: VNCoreMLRequest?
    private let processingQueue = DispatchQueue(label: "com.tattooar.skin-segmentation", qos: .userInitiated)
    nonisolated(unsafe) private var isProcessing = false

    // Throttle: configurable frame interval
    nonisolated(unsafe) private var lastProcessTime: Date?
    nonisolated(unsafe) var processInterval: TimeInterval = 0.066  // ~15fps default

    // Temporal smoothing
    private var previousMask: CIImage?
    private let ciContext = CIContext(options: [.useSoftwareRenderer: false])

    /// Smoothing factor: 0.0 = no smoothing (use current frame only), 1.0 = freeze (use only previous).
    /// Default 0.45 = 55% current + 45% previous for strong temporal smoothing.
    /// Higher value reduces flicker during camera movement at the cost of
    /// slightly slower mask response when the user moves quickly.
    var temporalSmoothingFactor: Float = 0.45

    // MARK: - Initialization

    init() {
        setupModel()
    }

    private func setupModel() {
        do {
            let config = MLModelConfiguration()
            config.computeUnits = .all  // Use Neural Engine when available

            // Load from the CocoaPods resource bundle. This avoids relying on
            // Xcode's app-target-only generated model class.
            let mlModel = try Self.loadBundledModel(configuration: config)
            let vnModel = try VNCoreMLModel(for: mlModel)

            let request = VNCoreMLRequest(model: vnModel) { [weak self] request, error in
                self?.handleResultBackground(request: request, error: error)
            }
            request.imageCropAndScaleOption = .scaleFill

            self.vncoremlModel = vnModel
            self.vnRequest = request
            self.isReady = true

            print("[SkinSeg] ✅ Model loaded successfully")
        } catch {
            print("[SkinSeg] ❌ Failed to load model: \(error)")
            isReady = false
        }
    }

    private static func loadBundledModel(configuration: MLModelConfiguration) throws -> MLModel {
        let containingBundle = Bundle(for: SkinSegmentationManager.self)
        var candidateBundles = [containingBundle, Bundle.main]

        for container in [containingBundle, Bundle.main] {
            if let bundleURL = container.url(forResource: "TattooARResources", withExtension: "bundle"),
               let resourceBundle = Bundle(url: bundleURL) {
                candidateBundles.insert(resourceBundle, at: 0)
            }
        }

        for bundle in candidateBundles {
            if let compiledURL = bundle.url(forResource: "SkinSegmentation", withExtension: "mlmodelc") {
                return try MLModel(contentsOf: compiledURL, configuration: configuration)
            }

            if let packageURL = bundle.url(forResource: "SkinSegmentation", withExtension: "mlpackage") {
                let compiledURL = try MLModel.compileModel(at: packageURL)
                return try MLModel(contentsOf: compiledURL, configuration: configuration)
            }
        }

        throw NSError(
            domain: "TattooAR.SkinSegmentation",
            code: 1,
            userInfo: [NSLocalizedDescriptionKey: "SkinSegmentation.mlpackage was not found in the InkVistAR app bundle."]
        )
    }

    func reset() {
        latestSkinMaskCGImage = nil
        latestSkinMaskCIImage = nil
        previousMask = nil
        isProcessing = false
        lastProcessTime = nil
    }

    // MARK: - Public API

    /// Process a camera frame. Call this from the AR session delegate.
    /// Inference runs asynchronously on a background queue.
    nonisolated func processFrame(pixelBuffer: CVPixelBuffer) {
        let now = Date()
        if let last = lastProcessTime, now.timeIntervalSince(last) < processInterval { return }
        guard !isProcessing else { return }

        lastProcessTime = now
        isProcessing = true

        processingQueue.async { [weak self] in
            guard let self else { return }
            defer { self.isProcessing = false }

            let handler = VNImageRequestHandler(
                cvPixelBuffer: pixelBuffer,
                orientation: .right,  // Match ARKit camera orientation
                options: [:]
            )

            guard let request = self.vnRequest else {
                return
            }

            do {
                try handler.perform([request])
            } catch {
                print("[SkinSeg] ❌ Inference failed: \(error)")
            }
        }
    }

    // MARK: - Result Handling

    /// Called from the VNCoreMLRequest completion handler (background thread).
    /// Processes the result and dispatches to main actor.
    nonisolated private func handleResultBackground(request: VNRequest, error: Error?) {
        if let error {
            print("[SkinSeg] ❌ Request error: \(error)")
            return
        }

        // Support TWO model output formats:
        // 1. VNPixelBufferObservation — Create ML Image Segmentation models output an image directly.
        // 2. VNCoreMLFeatureValueObservation — Custom U-Net models output a MultiArray [1,1,H,W].
        let maskImage: CGImage?
        let ciCtx = CIContext(options: [.useSoftwareRenderer: false])

        if let pixelObs = request.results?.first as? VNPixelBufferObservation {
            // Create ML model → output is a CVPixelBuffer image mask
            let maskBuffer = pixelObs.pixelBuffer
            let ciImg = CIImage(cvPixelBuffer: maskBuffer)
            maskImage = ciCtx.createCGImage(ciImg, from: ciImg.extent)
        } else if let featureObs = request.results?.first as? VNCoreMLFeatureValueObservation,
                  let multiArray = featureObs.featureValue.multiArrayValue {
            // Custom U-Net → output is a MultiArray of shape [1, 1, 256, 256]
            maskImage = Self.multiArrayToGrayscaleCGImage(multiArray)
        } else {
            return
        }

        guard let maskImage else { return }

        let currentCIImage = CIImage(cgImage: maskImage)

        DispatchQueue.main.async { [weak self] in
            self?.applyTemporalSmoothing(currentCIImage: currentCIImage)
        }
    }

    /// Apply temporal smoothing and update published properties (must be called on main actor).
    private func applyTemporalSmoothing(currentCIImage: CIImage) {
        let smoothedImage: CIImage
        if let previous = previousMask, temporalSmoothingFactor > 0 {
            // Blend: result = current * (1-α) + previous * α
            let alpha = CGFloat(temporalSmoothingFactor)
            let dissolve = CIFilter(name: "CIDissolveTransition",
                                    parameters: [
                                        kCIInputImageKey: currentCIImage,
                                        kCIInputTargetImageKey: previous,
                                        kCIInputTimeKey: alpha
                                    ])
            smoothedImage = dissolve?.outputImage ?? currentCIImage
        } else {
            smoothedImage = currentCIImage
        }

        previousMask = smoothedImage

        // Convert smoothed CIImage back to CGImage for the material
        let smoothedCG = ciContext.createCGImage(smoothedImage, from: smoothedImage.extent)

        self.latestSkinMaskCGImage = smoothedCG
        self.latestSkinMaskCIImage = smoothedImage
    }

    // MARK: - MultiArray → CGImage Conversion

    /// Converts a CoreML MultiArray (shape [1, 1, H, W], Float16/Float32) to a grayscale CGImage.
    nonisolated private static func multiArrayToGrayscaleCGImage(_ multiArray: MLMultiArray) -> CGImage? {
        let shape = multiArray.shape
        guard shape.count >= 3 else { return nil }

        // Get dimensions (could be [1, 1, H, W] or [1, H, W])
        let height: Int
        let width: Int
        if shape.count == 4 {
            height = shape[2].intValue
            width = shape[3].intValue
        } else {
            height = shape[1].intValue
            width = shape[2].intValue
        }

        let totalPixels = height * width

        // Convert MultiArray values to UInt8 grayscale buffer
        var pixelData = [UInt8](repeating: 0, count: totalPixels)

        // Handle both Float16 and Float32 output depending on compute unit
        switch multiArray.dataType {
        case .float16:
            let ptr = multiArray.dataPointer.bindMemory(to: Float16.self, capacity: totalPixels)
            for i in 0..<totalPixels {
                let value = Float(ptr[i])
                pixelData[i] = UInt8(min(max(value, 0.0), 1.0) * 255.0)
            }
        case .float32:
            let ptr = multiArray.dataPointer.bindMemory(to: Float32.self, capacity: totalPixels)
            for i in 0..<totalPixels {
                let value = ptr[i]
                pixelData[i] = UInt8(min(max(value, 0.0), 1.0) * 255.0)
            }
        case .float64:
            let ptr = multiArray.dataPointer.bindMemory(to: Float64.self, capacity: totalPixels)
            for i in 0..<totalPixels {
                let value = Float(ptr[i])
                pixelData[i] = UInt8(min(max(value, 0.0), 1.0) * 255.0)
            }
        default:
            // Fallback: use subscript (slower but type-safe)
            for i in 0..<totalPixels {
                let value = multiArray[i].floatValue
                pixelData[i] = UInt8(min(max(value, 0.0), 1.0) * 255.0)
            }
        }

        // Create CGImage from pixel data
        let colorSpace = CGColorSpaceCreateDeviceGray()
        guard let context = CGContext(
            data: &pixelData,
            width: width,
            height: height,
            bitsPerComponent: 8,
            bytesPerRow: width,
            space: colorSpace,
            bitmapInfo: CGImageAlphaInfo.none.rawValue
        ) else { return nil }

        return context.makeImage()
    }
}
