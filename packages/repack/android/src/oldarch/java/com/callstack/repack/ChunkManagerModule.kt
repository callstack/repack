package com.callstack.repack

import android.os.Handler
import com.facebook.react.bridge.*

class ScriptManagerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private val remoteLoader: RemoteScriptLoader = RemoteScriptLoader(reactApplicationContext)
    private val fileSystemLoader: FileSystemScriptLoader = FileSystemScriptLoader(reactApplicationContext)

    override fun getName(): String = ScriptManagerModuleImpl.NAME

    @ReactMethod
    fun loadScript(scriptId: String, configMap: ReadableMap, promise: Promise) {
        ScriptManagerModuleImpl.loadScript(scriptId, configMap, promise, remoteLoader, fileSystemLoader)
    }

    @ReactMethod
    fun prefetchScript(scriptId: String, configMap: ReadableMap, promise: Promise) {
        ScriptManagerModuleImpl.prefetchScript(scriptId, configMap, promise, remoteLoader)
    }

    @ReactMethod
    fun invalidateScripts(scriptIds: ReadableArray, promise: Promise) {
        ScriptManagerModuleImpl.invalidateScripts(scriptIds, promise, remoteLoader)
    }
}
