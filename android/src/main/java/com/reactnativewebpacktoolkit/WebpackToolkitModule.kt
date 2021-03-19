package com.reactnativewebpacktoolkit

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class WebpackToolkitModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "WebpackToolkit"
    }

    @ReactMethod
    fun loadChunk(chunkId: String, promise: Promise) {
        reactApplicationContext.catalystInstance.loadScriptFromFile("", "", false)
      promise.resolve(null)
    
    }

    
}
