package com.callstack.repack

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactContext
import java.io.File
import java.io.FileInputStream

class FileSystemScriptLoader(private val reactContext: ReactContext, private val nativeLoader: NativeScriptLoader) {
    fun evaluateBundle(code: ByteArray, config: ScriptConfig, promise: Promise) {
        val (bundle, token) = code?.let {
            CodeSigningUtils.extractBundleAndToken(code)
        } ?: Pair(null, null)

        if (config.verifyScriptSignature == "strict" || (config.verifyScriptSignature == "lax" && token != null)) {
            CodeSigningUtils.verifyBundle(reactContext, token, bundle)
        }

        nativeLoader.evaluate(code, config.sourceUrl, promise)
    }

    fun load(config: ScriptConfig, promise: Promise) {
        try {
            val code: ByteArray;

            if (config.absolute) {
                val path = config.url.path
                val file = File(path)
                code = FileInputStream(file).use { it.readBytes() }
            } else {
                val assetName = config.url.file.split("/").last()
                val inputStream = reactContext.assets.open(assetName)
                code = inputStream.use { it.readBytes() }
            }
            evaluateBundle(code, config, promise)
        } catch (error: Exception) {
            promise.reject(
                    ScriptLoadingError.ScriptEvalFailure.code,
                    error.message ?: error.toString()
            )
        }
    }
}
