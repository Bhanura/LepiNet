module.exports = function (api) {
    api.cache(true);
    return {
        presets: [
            ["babel-preset-expo", { jsxImportSource: "nativewind" }],
            "nativewind/babel",
        ],
        plugins: [
      // This "plugins" array is the important part
            [
                'module-resolver',
                {
                    alias: {
                        '@': './',
                    },
                },
            ],
            'react-native-reanimated/plugin', // You should also have this
        ],
    };
};