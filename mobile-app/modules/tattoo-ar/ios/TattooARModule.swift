import ARKit
import ExpoModulesCore
import SwiftUI
import UIKit

enum TattooAROrientationLock {
    nonisolated(unsafe) static var current: UIInterfaceOrientationMask = .allButUpsideDown
}

public final class TattooARModule: Module {
    private weak var presentedController: UIViewController?

    public func definition() -> ModuleDefinition {
        Name("TattooAR")

        Function("getCapabilities") {
            let osSupported: Bool
            if #available(iOS 26.0, *) {
                osSupported = true
            } else {
                osSupported = false
            }

            return [
                "osSupported": osSupported,
                "lidar": ARWorldTrackingConfiguration.supportsSceneReconstruction(.mesh),
                "faceTracking": ARFaceTrackingConfiguration.isSupported,
                "bodyTracking": ARBodyTrackingConfiguration.isSupported
            ]
        }

        AsyncFunction("present") { (mode: String, promise: Promise) in
            guard #available(iOS 26.0, *) else {
                promise.reject(
                    "ERR_TATTOO_AR_IOS_VERSION",
                    "The AR tattoo preview currently requires iOS 26 or newer."
                )
                return
            }

            guard self.presentedController == nil else {
                promise.resolve(nil)
                return
            }

            guard let currentViewController = self.appContext?.utilities?.currentViewController() else {
                promise.reject(
                    "ERR_TATTOO_AR_NO_VIEW_CONTROLLER",
                    "InkVistAR could not find an iOS view controller for the AR preview."
                )
                return
            }

            let contentView = ContentView(initialMode: mode) { [weak self] in
                self?.dismissPresentedController()
            }
            let hostingController = UIHostingController(rootView: contentView)
            hostingController.modalPresentationStyle = .fullScreen
            hostingController.view.backgroundColor = .black
            self.presentedController = hostingController

            currentViewController.present(hostingController, animated: true) {
                promise.resolve(nil)
            }
        }
        .runOnQueue(.main)

        AsyncFunction("dismiss") { (promise: Promise) in
            self.dismissPresentedController {
                promise.resolve(nil)
            }
        }
        .runOnQueue(.main)
    }

    private func dismissPresentedController(completion: (() -> Void)? = nil) {
        guard let controller = presentedController else {
            completion?()
            return
        }

        TattooAROrientationLock.current = .allButUpsideDown
        controller.dismiss(animated: true) { [weak self] in
            self?.presentedController = nil
            completion?()
        }
    }
}
