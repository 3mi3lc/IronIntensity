const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Add 'sql' extension so Metro can bundle SQL files
config.resolver.sourceExts.push('sql');

module.exports = withNativeWind(config, { input: './app/globals.css' });
