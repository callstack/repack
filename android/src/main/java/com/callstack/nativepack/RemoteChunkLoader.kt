package com.callstack.nativepack

import android.content.Context.MODE_PRIVATE
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

    private fun getChunkFilePath(hash: String, id: String): String {
        return "${chunksDirName}/$hash/$id.chunk.bundle"
    }

    private fun downloadAndCache(hash: String, id: String, url: URL, onSuccess: () -> Unit, onError: (code: String, message: String) -> Unit) {
        val path = getChunkFilePath(hash, id)
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

                        File(reactContext.filesDir, "${chunksDirName}/${hash}").mkdir()
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

        if (file.exists()) {
            onSuccess()
        } else {
            val request = Request.Builder().url(url).build();
            client.newCall(request).enqueue(callback)
        }
    }


    fun preload(hash: String, id: String, url: URL, promise: Promise) {
        downloadAndCache(hash, id, url, { promise.resolve(null) }, { code, message -> promise.reject(code, message) })
    }

    fun load(hash: String, id: String, url: URL, promise: Promise) {
        val path = getChunkFilePath(hash, id)
        downloadAndCache(hash, id, url, {
            try {
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
        }, { code, message -> promise.reject(code, message) })
    }

    fun invalidate(hash: String) {
        val file = File(reactContext.filesDir, "${chunksDirName}/${hash}")

        if(file.exists()) {
            file.deleteRecursively()
        }
    }

    fun invalidateAll() {
        val file = File(reactContext.filesDir, chunksDirName)
        if(file.exists()) {
            file.deleteRecursively()
        }
    }
}