const fs = require('fs');
const path = require('path');
const {
  withDangerousMod,
  withXcodeProject,
} = require('expo/config-plugins');

const MINIMUM_IOS_VERSION = '15.0';
const PODFILE_MARKER = '# InkVistAR: enforce the minimum iOS version supported by Xcode';

function withAppDeploymentTarget(config) {
  return withXcodeProject(config, (xcodeConfig) => {
    const configurations = xcodeConfig.modResults.pbxXCBuildConfigurationSection();

    for (const [key, value] of Object.entries(configurations)) {
      if (key.endsWith('_comment') || !value?.buildSettings) {
        continue;
      }

      value.buildSettings.IPHONEOS_DEPLOYMENT_TARGET = MINIMUM_IOS_VERSION;
    }

    return xcodeConfig;
  });
}

function withPodDeploymentTargets(config) {
  return withDangerousMod(config, [
    'ios',
    async (podConfig) => {
      const podfilePath = path.join(
        podConfig.modRequest.platformProjectRoot,
        'Podfile'
      );
      let podfile = await fs.promises.readFile(podfilePath, 'utf8');

      if (podfile.includes(PODFILE_MARKER)) {
        return podConfig;
      }

      const postInstallStart = 'post_install do |installer|';
      if (!podfile.includes(postInstallStart)) {
        throw new Error('Could not find the CocoaPods post_install block.');
      }

      const deploymentTargetOverride = `${postInstallStart}\n  ${PODFILE_MARKER}\n  installer.pods_project.targets.each do |target|\n    target.build_configurations.each do |build_config|\n      current_target = build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']\n      if current_target.nil? || current_target.to_f < ${MINIMUM_IOS_VERSION}\n        build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${MINIMUM_IOS_VERSION}'\n      end\n    end\n  end`;

      podfile = podfile.replace(postInstallStart, deploymentTargetOverride);
      await fs.promises.writeFile(podfilePath, podfile);

      return podConfig;
    },
  ]);
}

module.exports = function withIosDeploymentTarget(config) {
  config = withAppDeploymentTarget(config);
  return withPodDeploymentTargets(config);
};
