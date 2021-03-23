package com.reactnativewebpacktoolkit

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import java.lang.Error
import java.net.URL

class WebpackToolkitModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private var loader: ChunkLoader? = null

    override fun getName(): String {
        return "WebpackToolkit"
    }

    @ReactMethod
    fun loadChunk(chunkId: String, chunkUrl: String, promise: Promise) {
        val url = URL(chunkUrl)
        if (chunkUrl.startsWith("http")) {
            if (loader == null) {
                loader = RemoteChunkLoader(reactApplicationContext)
            }

            loader?.load(url, promise)
        } else {
            promise.reject(Error("todo"))
        }
    }
}
