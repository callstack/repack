package com.callstack.nativepack

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import java.lang.Error
import java.net.URL

class ChunkManagerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private var loader: ChunkLoader? = null

    override fun getName(): String {
        return "ChunkManager"
    }

    @ReactMethod
    fun loadChunk(chunkHash: String, chunkId: String, chunkUrl: String, promise: Promise) {
        val url = URL(chunkUrl)

        // Currently, `loadChunk` supports either `RemoteChunkLoader` or `FileSystemChunkLoader`
        // but not both at the same time - it will likely change in the future.
        when {
            url.protocol.startsWith("http") -> {
                if (loader == null) {
                    loader = RemoteChunkLoader(reactApplicationContext)
                }

                loader?.load(chunkHash, chunkId, url, promise)
            }
            url.protocol == "file" -> {
                if (loader == null) {
                    loader = FileSystemChunkLoader(reactApplicationContext)
                }

                loader?.load(chunkHash, chunkId, url, promise)
            }
            else -> {
                promise.reject(
                        ChunkLoadingError.UnsupportedScheme.code,
                        "Scheme in URL: '$chunkUrl' is not supported"
                )
            }
        }
    }

    fun preloadChunk(chunkHash: String, chunkId: String, chunkUrl: String, promise: Promise) {
        val url = URL(chunkUrl)
        when {
            url.protocol.startsWith("http") -> {
                if (loader == null) {
                    loader = RemoteChunkLoader(reactApplicationContext)
                }

                loader?.preload(chunkHash, chunkId, url, promise)
            }
            else -> {
                promise.reject(
                        ChunkLoadingError.UnsupportedScheme.code,
                        "Scheme in URL: '$chunkUrl' is not supported"
                )
            }
        }
    }

    fun invalidateChunk(chunkHash: String, chunkId: String, chunkUrl: String, promise: Promise) {
        // TODO: implement me
    }
}
