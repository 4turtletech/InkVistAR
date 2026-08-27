import Foundation
import Combine
import UIKit

#if canImport(SensitiveContentAnalysis)
import SensitiveContentAnalysis
#endif

/// Manages on-device sensitive content detection using Apple's SensitiveContentAnalysis framework.
/// Periodically samples AR camera frames and checks for nudity. When detected,
/// signals the UI to block tattoo placement with a warning.
///
/// This runs entirely on-device — no data leaves the phone.
/// Requires iOS 17+ and the `com.apple.developer.sensitivecontentanalysis.client` entitlement.
/// Only functions if the user has "Sensitive Content Warning" enabled in Settings → Privacy & Security.
@available(iOS 26.0, *)
@MainActor
final class SensitiveContentManager: ObservableObject {
    /// Whether the current camera view contains sensitive content
    @Published var isSensitiveContentDetected: Bool = false
    /// Whether the framework is available and enabled on this device
    @Published var isAvailable: Bool = false

    /// Minimum interval between analyses (seconds) — avoids GPU thrashing
    private let analysisInterval: TimeInterval = 1.0
    /// Last time we ran an analysis
    nonisolated(unsafe) private var lastAnalysisTime: Date?
    /// Whether an analysis is currently in progress
    nonisolated(unsafe) private var isAnalyzing: Bool = false

    #if canImport(SensitiveContentAnalysis)
    private var analyzer: SCSensitivityAnalyzer?
    #endif
    /// Shared CIContext for efficient CVPixelBuffer → CGImage conversion (reused across frames)
    private let ciContext = CIContext(options: [.useSoftwareRenderer: false])

    init() {
        setupAnalyzer()
    }

    private func setupAnalyzer() {
        #if canImport(SensitiveContentAnalysis)
        if #available(iOS 17.0, *) {
            let sca = SCSensitivityAnalyzer()
            // Check if the user has enabled Sensitive Content Warning in Settings
            let policy = sca.analysisPolicy
            if policy != .disabled {
                analyzer = sca
                isAvailable = true
                print("🛡️ SensitiveContentAnalysis: Available (policy: \(policy == .simpleInterventions ? "simple" : "descriptive"))")
            } else {
                isAvailable = false
                print("🛡️ SensitiveContentAnalysis: Disabled in user settings — skeleton fallback active")
            }
        } else {
            isAvailable = false
            print("🛡️ SensitiveContentAnalysis: Requires iOS 17+ — skeleton fallback active")
        }
        #else
        isAvailable = false
        print("🛡️ SensitiveContentAnalysis: Framework not available on this platform")
        #endif
    }

    /// Analyze a camera frame for sensitive content.
    /// Call this from the AR session's `didUpdate frame:` delegate.
    /// The method is throttled internally to avoid excessive GPU usage.
    /// Marked nonisolated so it can be called from ARSessionDelegate (non-main thread).
    ///
    /// - Parameter pixelBuffer: The camera's captured image (`frame.capturedImage`)
    nonisolated func processFrame(pixelBuffer: CVPixelBuffer) {
        #if canImport(SensitiveContentAnalysis)
        guard !isAnalyzing else { return }

        // Throttle: only analyze every `analysisInterval` seconds
        let now = Date()
        if let last = lastAnalysisTime, now.timeIntervalSince(last) < analysisInterval {
            return
        }
        lastAnalysisTime = now
        isAnalyzing = true

        // Convert CVPixelBuffer → CGImage for the analyzer
        let ciCtx = CIContext(options: [.useSoftwareRenderer: false])
        let ciImage = CIImage(cvPixelBuffer: pixelBuffer)
        guard let cgImage = ciCtx.createCGImage(ciImage, from: ciImage.extent) else {
            isAnalyzing = false
            return
        }

        // Run analysis asynchronously on the main actor
        if #available(iOS 17.0, *) {
            Task { @MainActor [weak self] in
                guard let self else { return }
                defer { self.isAnalyzing = false }
                guard self.isAvailable else { return }

                #if canImport(SensitiveContentAnalysis)
                guard let analyzer = self.analyzer else { return }

                do {
                    let response = try await analyzer.analyzeImage(cgImage)
                    let wasSensitive = self.isSensitiveContentDetected
                    self.isSensitiveContentDetected = response.isSensitive

                    // Log state changes only
                    if response.isSensitive && !wasSensitive {
                        print("🛡️ Sensitive content DETECTED — blocking tattoo placement")
                    } else if !response.isSensitive && wasSensitive {
                        print("🛡️ Sensitive content CLEARED — resuming normal operation")
                    }
                } catch {
                    // Framework error — don't block the user, just log
                    print("🛡️ SensitiveContentAnalysis error: \(error.localizedDescription)")
                    self.isSensitiveContentDetected = false
                }
                #endif
            }
        }
        #endif
    }

    /// Reset the detection state (e.g., when switching cameras or modes)
    func reset() {
        isSensitiveContentDetected = false
        lastAnalysisTime = nil
        isAnalyzing = false
    }
}
