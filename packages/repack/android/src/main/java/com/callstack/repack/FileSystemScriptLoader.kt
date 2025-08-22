package com.callstack.repack

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactContext
import java.io.File
import java.io.FileInputStream

class FileSystemScriptLoader(private val reactContext: ReactContext, private val nativeLoader: NativeScriptLoader) {
    fun verifyBundle(code: ByteArray, config: ScriptConfig): ByteArray {
        val (bundle, token) = code.let {
            CodeSigningUtils.extractBundleAndToken(code)
        }

        if (config.verifyScriptSignature == "strict" || (config.verifyScriptSignature == "lax" && token != null)) {
            CodeSigningUtils.verifyBundle(reactContext, token, bundle)
        }

        return bundle
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
            val bundle = verifyBundle(code, config)
            nativeLoader.evaluate(bundle, config.sourceUrl, promise)
        } catch (error: Exception) {
            promise.reject(
                    ScriptLoadingError.ScriptEvalFailure.code,
                    error.message ?: error.toString()
            )
        }
    }

    fun prefetch(config: ScriptConfig, promise: Promise) {
        // noop since there is no need to prefetch local scripts
        promise.resolve(null)
    }
}
