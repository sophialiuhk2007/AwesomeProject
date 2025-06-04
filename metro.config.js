const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    // make sure this includes `cjs` (and other extensions you need)
    sourceExts: ['js', 'json', 'ts', 'tsx', 'cjs'],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
