/**
 * @type {import('@react-native-community/cli-types').UserDependencyConfig}
 */
module.exports = {
  dependency: {
    platforms: {
      android: {
        cmake: {
          enableCodegen: false,
        },
      },
    },
  },
};
