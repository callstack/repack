package com.callstack.repack

import com.facebook.fbreact.specs.NativeScriptManagerSpec
import com.facebook.react.bridge.ReactApplicationContext

abstract class ScriptManagerSpec internal constructor(context: ReactApplicationContext): NativeScriptManagerSpec(context) {
}
