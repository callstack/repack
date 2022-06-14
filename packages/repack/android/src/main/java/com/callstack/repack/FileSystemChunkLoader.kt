package com.callstack.repack

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactContext
import java.lang.Exception
import java.net.URL

class FileSystemScriptLoader(private val reactContext: ReactContext) {
    fun load(config: ScriptConfig, promise: Promise) {
        try {
            if (config.absolute) {
                val path = config.url.path
                reactContext.catalystInstance.loadScriptFromFile(path, path, false);
            } else {
                val filename = config.url.file.split("/").last()
                val assetName = "assets://$filename"
                reactContext.catalystInstance.loadScriptFromAssets(reactContext.assets, assetName, false)
            }
            promise.resolve(null);
        } catch (error: Exception) {
            promise.reject(
                    ScriptLoadingError.FileSystemEvalFailure.code,
                    error.message ?: error.toString()
            )
        }
    }
}
