/* 
    TurboModuleRegistry.get taps into the old Native Modules API under the hood,
    we need to re-export our module, to avoid registering it multiple times.
*/

export default require('./NativeScriptManager').default;