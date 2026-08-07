const {
  withAndroidManifest,
  withDangerousMod,
} = require('expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

const NETWORK_SECURITY_CONFIG = 'repack_expo_localhost_network_security_config';
const NETWORK_SECURITY_CONFIG_XML = `<?xml version="1.0" encoding="utf-8"?>
<!--
  Fixture-only policy for EXPO-020's local artifact server.
  Production federation remotes must use HTTPS; do not add public remote hosts here.
-->
<network-security-config>
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="false">localhost</domain>
    <domain includeSubdomains="false">10.0.2.2</domain>
  </domain-config>
</network-security-config>
`;

function withLocalhostCleartext(config) {
  const withManifest = withAndroidManifest(config, (modConfig) => {
    const application = modConfig.modResults.manifest.application?.[0];
    if (!application) {
      throw new Error('Expected an Android application element');
    }

    application.$ ??= {};
    application.$['android:usesCleartextTraffic'] = 'false';
    application.$['android:networkSecurityConfig'] =
      `@xml/${NETWORK_SECURITY_CONFIG}`;
    return modConfig;
  });

  return withDangerousMod(withManifest, [
    'android',
    (modConfig) => {
      const resourceDirectory = path.join(
        modConfig.modRequest.platformProjectRoot,
        'app/src/main/res/xml'
      );
      fs.mkdirSync(resourceDirectory, { recursive: true });
      fs.writeFileSync(
        path.join(resourceDirectory, `${NETWORK_SECURITY_CONFIG}.xml`),
        NETWORK_SECURITY_CONFIG_XML
      );
      return modConfig;
    },
  ]);
}

module.exports = withLocalhostCleartext;
