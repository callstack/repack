// The dynamically imported half of the fixture: only reachable through `import()`, so
// without the Worklets cache group it and the worklet it pulls in land in a split chunk
// that a Worklet Runtime never evaluates.
import workletFactory from 'react-native-worklets/.worklets/10110358253471.js';

export default workletFactory;
