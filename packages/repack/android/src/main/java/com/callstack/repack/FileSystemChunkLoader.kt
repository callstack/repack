package com.callstack.repack

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactContext
import java.lang.Exception
import java.net.URL

class FileSystemChunkLoader(private val reactContext: ReactContext) {
    fun load(config: ChunkConfig, promise: Promise) {
        try {
            if (config.absolute) {
                val path = config.url.path
                reactContext.catalystInstance.loadScriptFromFile(path, path, false);
            } else {
                val filename = config.url.file.split("/").last()
                val assetName = "assets://$filename"
                reactContext.catalystInstance.loadScriptFromAssets(reactContext.assets, assetName, false)
            }

        } catch (error: Exception) {
            promise.reject(
                    ChunkLoadingError.FileSystemEvalFailure.code,
                    error.message ?: error.toString()
            )
        }
    }
}
