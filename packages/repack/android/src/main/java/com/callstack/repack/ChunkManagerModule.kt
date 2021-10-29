package com.callstack.repack

import android.os.Handler
import com.facebook.react.bridge.*

class ChunkManagerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private val remoteLoader: RemoteChunkLoader = RemoteChunkLoader(reactApplicationContext)
    private val fileSystemLoader: FileSystemChunkLoader = FileSystemChunkLoader(reactApplicationContext)

    override fun getName(): String {
        return "ChunkManager"
    }

    private fun runInBackground(fn: () -> Unit) {
        val handler = Handler()
        val runnable = Runnable {
            fn()
        }
        handler.postDelayed(runnable, 0)

    }

    @ReactMethod
    fun loadChunk(chunkId: String, configMap: ReadableMap, promise: Promise) {
        runInBackground {
            val config = ChunkConfig.fromReadableMap(chunkId, configMap)

            // Currently, `loadChunk` supports either `RemoteChunkLoader` or `FileSystemChunkLoader`
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
                    fileSystemLoader.load(config.url, promise)
                }
                else -> {
                    promise.reject(
                            ChunkLoadingError.UnsupportedScheme.code,
                            "Scheme in URL: '${config.url}' is not supported"
                    )
                }
        }
    }
}

@ReactMethod
fun preloadChunk(chunkId: String, configMap: ReadableMap, promise: Promise) {
    val config = ChunkConfig.fromReadableMap(chunkId, configMap)
    if (!config.fetch) {
        // Do nothing, chunk is already preloaded
        promise.resolve(null);
    } else {
        runInBackground {
            when {
                config.url.protocol.startsWith("http") -> {
                    remoteLoader.preload(config, promise)
                }
                else -> {
                    promise.reject(
                            ChunkLoadingError.UnsupportedScheme.code,
                            "Scheme in URL: '${config.url}' is not supported"
                    )
                }
            }
        }
    }
}

@ReactMethod
fun invalidateChunks(chunkIds: ReadableArray, promise: Promise) {
    runInBackground {
        if (chunkIds.size() == 0) {
            remoteLoader.invalidateAll()
            promise.resolve(null)
        } else {
            try {
                for (i in 0 until chunkIds.size()) {
                    val chunkId = chunkIds.getString(i)
                    remoteLoader.invalidate(chunkId)
                }
                promise.resolve(null)
            } catch (error: Exception) {
                promise.reject(
                        ChunkLoadingError.ChunkInvalidationFailure.code,
                        "Cannot invalidate some of the chunks"
                )
            }
        }
    }
}
}
