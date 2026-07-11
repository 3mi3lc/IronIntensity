// Dynamic Expo config layered on top of app.json.
//
// Gives non-production builds a separate app id + name so the development app
// installs ALONGSIDE the production app instead of overwriting it — two icons,
// two separate local databases. Log into the dev app with a test account to keep
// test data out of your real account.
//
// The ".dev" variant is the default: only APP_VARIANT=production (set in
// eas.json's production profile) yields the real app id. So a plain
// `npx expo run:android` can never clobber your real install.
module.exports = ({ config }) => {
    const isProduction = process.env.APP_VARIANT === 'production';
    if (isProduction) return config;

    return {
        ...config,
        name: 'IronIntensity Dev',
        android: {
            ...config.android,
            package: `${config.android.package}.dev`,
        },
        ios: {
            ...config.ios,
            bundleIdentifier: `${config.ios.bundleIdentifier}.dev`,
        },
    };
};
