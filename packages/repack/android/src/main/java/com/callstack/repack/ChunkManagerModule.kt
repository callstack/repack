package com.callstack.repack

import android.os.Handler
import com.facebook.react.bridge.*

class ScriptManagerModule(reactContext: ReactApplicationContext) : ScriptManagerSpec(reactContext) {
    private external fun evaluateJavascript(jsiPtr: Long, code: ByteArray, url: String)

    private fun evaluate(script: ByteArray, url: String) {
        val contextHolder = reactApplicationContext.javaScriptContextHolder!!
        val jsiPtr: Long = contextHolder.get()
        evaluateJavascript(jsiPtr, script, url)
    }

    // pass as callback for now, refactor later
    private val remoteLoader: RemoteScriptLoader = RemoteScriptLoader(reactApplicationContext) { code, path ->
        evaluate(code, path)
    }

    // pass as callback for now, refactor later
    private val fileSystemLoader: FileSystemScriptLoader =
            FileSystemScriptLoader(reactApplicationContext) { code, path ->
                evaluate(code, path)
            }

    override fun getName(): String {
        return NAME
    }

    private fun runInBackground(fn: () -> Unit) {
        val handler = Handler()
        val runnable = Runnable {
            fn()
        }
        handler.postDelayed(runnable, 0)

    }

    @ReactMethod
    override fun loadScript(scriptId: String, configMap: ReadableMap, promise: Promise) {
        runInBackground {
            val config = ScriptConfig.fromReadableMap(scriptId, configMap)

            // Currently, `loadScript` supports either `RemoteScriptLoader` or `FileSystemScriptLoader`
            // but not both at the same time - it will likely change in the future.
            when {
                config.url.protocol.startsWith("http") -> {
                    if (config.fetch) {
                        remoteLoader.load(config, promise)
                    } else {
                        remoteLoader.execute(config, promise)
                    }
                }

                config.url.protocol == "file" -> {
                    fileSystemLoader.load(config, promise)
                }

                else -> {
                    promise.reject(
                            ScriptLoadingError.UnsupportedScheme.code,
                            "Scheme in URL: '${config.url}' is not supported"
                    )
                }
            }
        }
    }

    @ReactMethod
    override fun prefetchScript(scriptId: String, configMap: ReadableMap, promise: Promise) {
        val config = ScriptConfig.fromReadableMap(scriptId, configMap)
        if (!config.fetch) {
            // Do nothing, script is already prefetched
            promise.resolve(null);
            return
        }
        runInBackground {
            when {
                config.url.protocol.startsWith("http") -> {
                    remoteLoader.prefetch(config, promise)
                }

                else -> {
                    promise.reject(
                            ScriptLoadingError.UnsupportedScheme.code,
                            "Scheme in URL: '${config.url}' is not supported"
                    )
                }
            }
        }

    }

    @ReactMethod
    override fun invalidateScripts(scriptIds: ReadableArray, promise: Promise) {
        runInBackground {
            if (scriptIds.size() == 0) {
                remoteLoader.invalidateAll()
                promise.resolve(null)
            } else {
                try {
                    for (i in 0 until scriptIds.size()) {
                        val scriptId = scriptIds.getString(i)
                        remoteLoader.invalidate(scriptId)
                    }
                    promise.resolve(null)
                } catch (error: Exception) {
                    promise.reject(
                            ScriptLoadingError.ScriptInvalidationFailure.code,
                            "Cannot invalidate some of the scripts"
                    )
                }
            }
        }
    }

    companion object {
        // is this safe to initialize this way?
        init {
            System.loadLibrary("callstack-repack")
        }

        const val NAME = "ScriptManager"
    }
}
