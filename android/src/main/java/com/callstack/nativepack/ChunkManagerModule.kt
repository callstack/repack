package com.callstack.nativepack

import android.os.Handler
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.Promise
import java.net.URL

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
    fun loadChunk(chunkHash: String, chunkId: String, chunkUrl: String, promise: Promise) {
        runInBackground {
            val url = URL(chunkUrl)

            // Currently, `loadChunk` supports either `RemoteChunkLoader` or `FileSystemChunkLoader`
            // but not both at the same time - it will likely change in the future.
            when {
                url.protocol.startsWith("http") -> {
                    remoteLoader.load(chunkHash, chunkId, url, promise)
                }
                url.protocol == "file" -> {
                    fileSystemLoader.load(chunkHash, chunkId, url, promise)
                }
                else -> {
                    promise.reject(
                            ChunkLoadingError.UnsupportedScheme.code,
                            "Scheme in URL: '$chunkUrl' is not supported"
                    )
                }
            }
        }
    }

    @ReactMethod
    fun preloadChunk(chunkHash: String, chunkId: String, chunkUrl: String, promise: Promise) {
        runInBackground {
            val url = URL(chunkUrl)
            when {
                url.protocol.startsWith("http") -> {
                    remoteLoader.preload(chunkHash, chunkId, url, promise)
                }
                else -> {
                    promise.reject(
                            ChunkLoadingError.UnsupportedScheme.code,
                            "Scheme in URL: '$chunkUrl' is not supported"
                    )
                }
            }
        }
    }

    @ReactMethod
    fun invalidateChunks(chunks: ReadableArray, promise: Promise) {
        runInBackground {
            if (chunks.size() == 0) {
                remoteLoader.invalidateAll()
                promise.resolve(null)
            } else {
                try {
                    for (i in 0 until chunks.size()) {
                        val chunk = chunks.getMap(i)
                        val hash = chunk.getString("hash") ?: ""

                        remoteLoader.invalidate(hash)
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
