import type { FederationRuntimePlugin } from '@module-federation/enhanced/runtime';

const runtimeDebug: () => FederationRuntimePlugin = () => ({
  name: 'runtime-debug-plugin',
  //   beforeInit(args) {
  //     console.log('beforeInit: ', args);
  //     return args;
  //   },
  //   beforeRequest(args) {
  //     console.log('beforeRequest: ', args);
  //     return args;
  //   },
  //   afterResolve(args) {
  //     console.log('afterResolve', args);
  //     return args;
  //   },
  //   onLoad(args) {
  //     console.log('onLoad: ', args);
  //     return args;
  //   },
  //   async loadShare(args) {
  //     console.log('loadShare:', args);
  //   },
  //   async beforeLoadShare(args) {
  //     console.log('beforeloadShare:', args);
  //     return args;
  //   },
  // createScript(args) {
  //   console.log('createScript:', args);
  //   return args;
  // },
});

export default runtimeDebug;
