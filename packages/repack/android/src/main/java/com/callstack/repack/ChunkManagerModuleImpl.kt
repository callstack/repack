package com.callstack.repack

import android.os.Handler
import com.facebook.react.bridge.*

object ScriptManagerModuleImpl {

    const val NAME = "ScriptManager"

    private fun runInBackground(fn: () -> Unit) {
        val handler = Handler()
        val runnable = Runnable {
            fn()
        }
        handler.postDelayed(runnable, 0)

    }

    fun loadScript(scriptId: String, configMap: ReadableMap, promise: Promise, remoteLoader: RemoteScriptLoader, fileSystemLoader: FileSystemScriptLoader) {
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


    fun prefetchScript(scriptId: String, configMap: ReadableMap, promise: Promise, remoteLoader: RemoteScriptLoader) {
        val config = ScriptConfig.fromReadableMap(scriptId, configMap)
        if (!config.fetch) {
            // Do nothing, script is already prefetched
            promise.resolve(null)
        } else {
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
    }

    fun invalidateScripts(scriptIds: ReadableArray, promise: Promise, remoteLoader: RemoteScriptLoader) {
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
}
