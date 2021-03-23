package com.reactnativewebpacktoolkit

import android.content.Context.MODE_PRIVATE
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactContext
import okhttp3.*
import java.io.IOException
import java.io.OutputStreamWriter
import java.net.URL

class RemoteChunkLoader(private val reactContext: ReactContext) : ChunkLoader {
    private val client = OkHttpClient()

    override fun load(url: URL, promise: Promise) {
        val request = Request.Builder().url(url).build();
        val callback = object : Callback {
            override fun onFailure(call: Call, error: IOException) {
                promise.reject(error)
            }

            override fun onResponse(call: Call, response: Response) {
                if (response.isSuccessful) {
                    try {
                        // Make sure there's no trailing /
                        val filename = url.file.replace("/", "")
                        val body = response.body?.string()

                        val outputStream = reactContext.openFileOutput(filename, MODE_PRIVATE)
                        val writer = OutputStreamWriter(outputStream)
                        writer.write(body)
                        writer.close()

                        reactContext.catalystInstance.loadScriptFromFile(
                                "${reactContext.filesDir}/${filename}",
                                url.toString(),
                                false
                        )
                        promise.resolve(null)
                    } catch (error: Exception) {
                        promise.reject(error)
                    }
                } else {
                    promise.reject("error", "Request failed with non-2xx status code")
                }
            }
        }

        client.newCall(request).enqueue(callback)
    }
}