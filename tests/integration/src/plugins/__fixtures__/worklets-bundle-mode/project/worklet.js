// Stands in for what the Worklets Babel plugin produces: every worklet is hoisted to
// `react-native-worklets/.worklets/<hash>.js` and the authoring site imports it back.
// The request goes through the `.worklets` alias `WorkletsBundleModePlugin` installs.
import workletFactory from 'react-native-worklets/.worklets/10110358253470.js';

export default workletFactory;
