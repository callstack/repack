const { withInfoPlist, withStringsXml } = require('@expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

const withIosRepackKey = (config, options = {}) => {
  const { publicKeyPath = './code-signing.pem.pub' } = options;

  return withInfoPlist(config, (config) => {
    try {
      const projectRoot = config.modRequest.projectRoot;
      const absolutePath = path.isAbsolute(publicKeyPath)
        ? publicKeyPath
        : path.join(projectRoot, publicKeyPath);
      const publicKey = fs.readFileSync(absolutePath, 'utf8').trim();
      config.modResults.RepackPublicKey = publicKey;
    } catch (error) {
      console.warn(
        '[withIosRepackKey] Failed to set RepackPublicKey:',
        error?.message || error
      );
    }
    return config;
  });
};

const withAndroidRepackKey = (config, options = {}) => {
  const { publicKeyPath = './code-signing.pem.pub' } = options;

  return withStringsXml(config, (config) => {
    try {
      const projectRoot = config.modRequest.projectRoot;
      const absolutePath = path.isAbsolute(publicKeyPath)
        ? publicKeyPath
        : path.join(projectRoot, publicKeyPath);
      const publicKey = fs.readFileSync(absolutePath, 'utf8').trim();

      const stringsXml = config.modResults;
      if (!stringsXml.resources) stringsXml.resources = {};
      if (!Array.isArray(stringsXml.resources.string))
        stringsXml.resources.string = [];

      const node = {
        $: { name: 'RepackPublicKey', translatable: 'false' },
        _: publicKey,
      };
      const index = stringsXml.resources.string.findIndex(
        (item) => item?.$?.name === 'RepackPublicKey'
      );
      if (index >= 0) {
        stringsXml.resources.string[index] = node;
      } else {
        stringsXml.resources.string.push(node);
      }
    } catch (error) {
      console.warn(
        '[withAndroidRepackKey] Failed to set RepackPublicKey:',
        error?.message || error
      );
    }

    return config;
  });
};

const withRepackCodeSigning = (config, options = {}) => {
  const withAndroid = withAndroidRepackKey(config, options);
  const withIos = withIosRepackKey(withAndroid, options);
  return withIos;
};

module.exports = withRepackCodeSigning;
