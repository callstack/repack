package com.callstack.repack

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactContext
import okhttp3.*
import java.io.File
import java.io.IOException
import java.io.OutputStreamWriter
import java.net.URL

class RemoteChunkLoader(private val reactContext: ReactContext) {
    private val chunksDirName = "chunks"
    private val client = OkHttpClient()

    private fun getChunkFilePath(id: String): String {
        return "${chunksDirName}/$id.chunk.bundle"
    }

    private fun downloadAndCache(id: String, url: URL, onSuccess: () -> Unit, onError: (code: String, message: String) -> Unit) {
        val path = getChunkFilePath(id)
        val file = File(reactContext.filesDir, path)

        val callback = object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                onError(
                        ChunkLoadingError.NetworkFailure.code,
                        e.message ?: e.toString()
                )
            }

            override fun onResponse(call: Call, response: Response) {
                if (response.isSuccessful) {
                    try {
                        val chunksDir = File(reactContext.filesDir, chunksDirName)
                        if (!chunksDir.exists()) {
                            File(reactContext.filesDir, chunksDirName).mkdir()
                        }

                        file.createNewFile()

                        val body = response.body?.string()
                        val outputStream = file.outputStream()
                        val writer = OutputStreamWriter(outputStream)
                        writer.write(body)
                        writer.close()
                        onSuccess()
                    } catch (error: Exception) {
                        onError(
                                ChunkLoadingError.ChunkCachingFailure.code,
                                error.message ?: error.toString()
                        )
                    }
                } else {
                    onError(
                            ChunkLoadingError.RequestFailure.code,
                            "Request should have returned with 200 HTTP status, but instead it received ${response.code}"
                    )
                }
            }
        }

        val request = Request.Builder().url(url).build();
        client.newCall(request).enqueue(callback)
    }

    fun execute(chunkId: String, url: URL, promise: Promise) {
        try {
            val path = getChunkFilePath(chunkId)
            reactContext.catalystInstance.loadScriptFromFile(
                    "${reactContext.filesDir}/${path}",
                    url.toString(),
                    false
            )
            promise.resolve(null)
        } catch (error: Exception) {
            promise.reject(
                    ChunkLoadingError.RemoteEvalFailure.code,
                    error.message ?: error.toString()
            )
        }
    }


    fun preload(id: String, url: URL, promise: Promise) {
        downloadAndCache(id, url, { promise.resolve(null) }, { code, message -> promise.reject(code, message) })
    }

    fun load(id: String, url: URL, promise: Promise) {
        downloadAndCache(id, url, {
            execute(id, url, promise)
        }, { code, message -> promise.reject(code, message) })
    }

    fun invalidate(chunkId: String) {
        val file = File(reactContext.filesDir, getChunkFilePath(chunkId))

        if(file.exists()) {
            file.delete()
        }
    }

    fun invalidateAll() {
        val file = File(reactContext.filesDir, chunksDirName)
        if(file.exists()) {
            file.deleteRecursively()
        }
    }
}
