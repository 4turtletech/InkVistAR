const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

const LEGACY_START_GUARD = '#if os(iOS) || os(tvOS)';
const SCENE_MARKER = '// InkVistAR: UIScene lifecycle for iOS 27 SDK compatibility';

const SCENE_DELEGATE = `

${SCENE_MARKER}
@available(iOS 13.0, *)
final class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate,
          let factory = appDelegate.reactNativeFactory else {
      return
    }

    let sceneWindow = UIWindow(windowScene: windowScene)
    window = sceneWindow
    appDelegate.window = sceneWindow
    factory.startReactNative(
      withModuleName: "main",
      in: sceneWindow,
      launchOptions: nil
    )
  }
}
`;

function migrateAppDelegate(contents) {
  if (contents.includes(SCENE_MARKER)) {
    return contents;
  }

  const startupGuardIndex = contents.indexOf(LEGACY_START_GUARD);
  if (startupGuardIndex === -1) {
    throw new Error(
      'Could not find Expo\'s legacy iOS/tvOS React Native startup block in AppDelegate.swift.'
    );
  }

  // A UISceneDelegate owns iOS windows. Preserve Expo's existing tvOS startup.
  const migratedContents =
    contents.slice(0, startupGuardIndex) +
    '#if os(tvOS)' +
    contents.slice(startupGuardIndex + LEGACY_START_GUARD.length);

  return `${migratedContents.trimEnd()}${SCENE_DELEGATE}`;
}

function withSceneManifest(config) {
  return withInfoPlist(config, (infoPlistConfig) => {
    infoPlistConfig.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
          },
        ],
      },
    };

    return infoPlistConfig;
  });
}

function withSceneDelegate(config) {
  return withAppDelegate(config, (appDelegateConfig) => {
    if (appDelegateConfig.modResults.language !== 'swift') {
      throw new Error('InkVistAR requires a Swift AppDelegate for UIScene migration.');
    }

    appDelegateConfig.modResults.contents = migrateAppDelegate(
      appDelegateConfig.modResults.contents
    );
    return appDelegateConfig;
  });
}

module.exports = function withIosSceneLifecycle(config) {
  config = withSceneManifest(config);
  return withSceneDelegate(config);
};

module.exports.migrateAppDelegate = migrateAppDelegate;
