const { withXcodeProject } = require('@expo/config-plugins');

const DEFAULT_DEPLOYMENT_TARGET = '15.1';

function withIosDeploymentTarget(config, props = {}) {
  const deploymentTarget = props.deploymentTarget || DEFAULT_DEPLOYMENT_TARGET;

  return withXcodeProject(config, (config) => {
    const buildConfigurations =
      config.modResults.pbxXCBuildConfigurationSection();

    for (const [key, buildConfiguration] of Object.entries(
      buildConfigurations
    )) {
      if (key.endsWith('_comment') || !buildConfiguration.buildSettings) {
        continue;
      }

      buildConfiguration.buildSettings.IPHONEOS_DEPLOYMENT_TARGET =
        deploymentTarget;
    }

    return config;
  });
}

module.exports = withIosDeploymentTarget;
