package com.callstack.repack

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactContext
import java.io.File
import java.io.FileInputStream

class FileSystemScriptLoader(private val reactContext: ReactContext, private val nativeLoader: NativeScriptLoader) {
    fun load(config: ScriptConfig, promise: Promise) {
        try {
            if (config.absolute) {
                val path = config.url.path
                val file = File(path)
                val code: ByteArray = FileInputStream(file).use { it.readBytes() }
                nativeLoader.evaluate(code, config.sourceUrl, promise)
            } else {
                val assetName = config.url.file.split("/").last()
                val inputStream = reactContext.assets.open(assetName)
                val code: ByteArray = inputStream.use { it.readBytes() }
                nativeLoader.evaluate(code, config.sourceUrl, promise)
            }
        } catch (error: Exception) {
            promise.reject(
                    ScriptLoadingError.ScriptEvalFailure.code,
                    error.message ?: error.toString()
            )
        }
    }
}
