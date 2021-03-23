package com.reactnativewebpacktoolkit

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactContext
import java.lang.Exception
import java.net.URL

class FileSystemChunkLoader(private  val reactContext: ReactContext) : ChunkLoader {
    override fun load(url: URL, promise: Promise) {
        try {
            val filename = url.file.split("/").last()
            val assetName = "assets://$filename"
            reactContext.catalystInstance.loadScriptFromAssets(reactContext.assets, assetName, false)
        } catch (error: Exception) {
            promise.reject(error)
        }
    }
}