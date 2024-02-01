package com.callstack.repack

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap

abstract class ScriptManagerSpec internal constructor(context: ReactApplicationContext) :
    ReactContextBaseJavaModule(context) {
    abstract fun loadScript(scriptId: String, configMap: ReadableMap, promise: Promise)
    abstract fun prefetchScript(scriptId: String, configMap: ReadableMap, promise: Promise)
    abstract fun invalidateScripts(scriptIds: ReadableArray, promise: Promise)
}
