/**
 * Loaders for transforming React Native
 *
 * It might be a good idea to include a preset where we transform all
 * node_modules by default and only when passed a flag do we not transform
 * them. Then used could potentially define a custom loader for his dependencies
 *
 */

export function getDefaultLoaders() {
  return [
    {
      test: /\.jsx?$/,
      include: [
        /node_modules(.*[/\\])+react-native/,
        /node_modules(.*[/\\])+@react-native/,
      ],
      exclude: [
        /node_modules(.*[/\\])+react-native[/\\]Libraries[/\\]Renderer[/\\]shims[/\\]ReactNativeViewConfigRegistry/,
      ],
      use: [
        {
          loader: 'builtin:swc-loader',
          options: {
            jsc: {
              target: 'es5',
              parser: {
                syntax: 'ecmascript',
                jsx: true,
              },
              externalHelpers: true,
            },
            module: {
              type: 'commonjs',
              strict: false,
              strictMode: true,
              noInterop: false,
              lazy: [
                'AccessibilityInfo',
                'ActivityIndicator',
                'Button',
                'DatePickerIOS',
                'DrawerLayoutAndroid',
                'FlatList',
                'Image',
                'ImageBackground',
                'InputAccessoryView',
                'KeyboardAvoidingView',
                'Modal',
                'Pressable',
                'ProgressBarAndroid',
                'ProgressViewIOS',
                'SafeAreaView',
                'ScrollView',
                'SectionList',
                'Slider',
                'Switch',
                'RefreshControl',
                'StatusBar',
                'Text',
                'TextInput',
                'Touchable',
                'TouchableHighlight',
                'TouchableNativeFeedback',
                'TouchableOpacity',
                'TouchableWithoutFeedback',
                'View',
                'VirtualizedList',
                'VirtualizedSectionList',
                'ActionSheetIOS',
                'Alert',
                'Animated',
                'Appearance',
                'AppRegistry',
                'AppState',
                'AsyncStorage',
                'BackHandler',
                'Clipboard',
                'DeviceInfo',
                'Dimensions',
                'Easing',
                'ReactNative',
                'I18nManager',
                'InteractionManager',
                'Keyboard',
                'LayoutAnimation',
                'Linking',
                'LogBox',
                'NativeEventEmitter',
                'PanResponder',
                'PermissionsAndroid',
                'PixelRatio',
                'PushNotificationIOS',
                'Settings',
                'Share',
                'StyleSheet',
                'Systrace',
                'ToastAndroid',
                'TVEventHandler',
                'UIManager',
                'ReactNative',
                'UTFSequence',
                'Vibration',
                'RCTDeviceEventEmitter',
                'RCTNativeAppEventEmitter',
                'NativeModules',
                'Platform',
                'processColor',
                'requireNativeComponent',
              ],
            },
          },
        },
        { loader: '@callstack/repack/flow-loader' },
      ],
    },
    {
      test: /\.js$/,
      include: [
        /node_modules(.*[/\\])+react\//,
        /node_modules(.*[/\\])+react-native[/\\]Libraries[/\\]Renderer[/\\]shims[/\\]ReactNativeViewConfigRegistry/,
      ],
      use: [
        {
          loader: 'builtin:swc-loader',
          options: {
            isModule: true,
            jsc: {
              target: 'es5',
              parser: {
                syntax: 'ecmascript',
              },
              externalHelpers: false,
            },
            module: {
              type: 'commonjs',
              strict: false,
              strictMode: true,
              noInterop: false,
            },
          },
        },
        { loader: '@callstack/repack/flow-loader' },
      ],
    },
    {
      test: /\.[jt]sx?$/,
      include: [/node_modules/],
      exclude: [
        /node_modules(.*[/\\])+react\//,
        /node_modules(.*[/\\])+react-native/,
        /node_modules(.*[/\\])+@react-native/,
      ],
      use: [
        {
          loader: 'builtin:swc-loader',
          options: {
            jsc: {
              target: 'es5',
              externalHelpers: true,
            },
            module: {
              type: 'commonjs',
              strict: false,
              strictMode: true,
              noInterop: false,
            },
          },
        },
      ],
    },
  ];
}
