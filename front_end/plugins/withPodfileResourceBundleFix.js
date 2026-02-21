const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Xcode 14+ resource bundle signing fix.
 * Adds CODE_SIGNING_ALLOWED = 'NO' for all CocoaPods resource bundle targets
 * so that EAS build doesn't fail with "resource bundles are signed by default" error.
 */
function withPodfileResourceBundleFix(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile"
      );
      let podfile = fs.readFileSync(podfilePath, "utf8");

      const fixSnippet = `
    # Xcode 14+ resource bundle signing fix
    installer.pods_project.targets.each do |target|
      if target.respond_to?(:product_type) && target.product_type == "com.apple.product-type.bundle"
        target.build_configurations.each do |build_config|
          build_config.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'
        end
      end
    end`;

      // Only add if not already present
      if (!podfile.includes("CODE_SIGNING_ALLOWED")) {
        // Insert before the last `end` of post_install block
        podfile = podfile.replace(
          /(\s*react_native_post_install\([\s\S]*?\))\s*\n(\s*end)/,
          `$1\n${fixSnippet}\n$2`
        );
        fs.writeFileSync(podfilePath, podfile, "utf8");
      }

      return config;
    },
  ]);
}

module.exports = withPodfileResourceBundleFix;
