package com.callstack.repack

import com.facebook.react.bridge.ReadableMap
import okhttp3.Headers
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.net.URL

data class ScriptConfig(
    val scriptId: String,
    val url: URL,
    val query: String?,
    val fetch: Boolean,
    val absolute: Boolean,
    val method: String,
    val body: RequestBody?,
    val timeout: Int,
    val headers: Headers,
    val verifyScriptSignature: String,
    val uniqueId: String,
    val sourceUrl: String
) {
    companion object {
        fun fromReadableMap(scriptId: String, value: ReadableMap): ScriptConfig {
            val urlString = requireNotNull(value.getString("url"))
            val method = requireNotNull(value.getString("method"))
            val fetch = value.getBoolean("fetch")
            val absolute = value.getBoolean("absolute")
            val query = value.getString("query")
            val bodyString = value.getString("body")
            val headersMap = value.getMap("headers")
            val timeout = value.getInt("timeout")
            val verifyScriptSignature = requireNotNull(value.getString("verifyScriptSignature"))
            val uniqueId = requireNotNull(value.getString("uniqueId"))

            val url = URL(
                    if (query != null) {
                        "$urlString?$query"
                    } else {
                        urlString
                    }
            )

            val sourceUrl = URL(urlString).toString()

            val headers = Headers.Builder()
            val keyIterator = headersMap?.keySetIterator()
            while (keyIterator?.hasNextKey() == true) {
                val key = keyIterator.nextKey()
                val header = headersMap.getString(key)
                if (header != null) {
                    headers[key] = header
                }
            }

            val contentType = (headers["content-type"] ?: "text/plain").toMediaType()
            val body = bodyString?.toRequestBody(contentType)

            return ScriptConfig(
                    scriptId,
                    url,
                    query,
                    fetch,
                    absolute,
                    method,
                    body,
                    timeout,
                    headers.build(),
                    verifyScriptSignature,
                    uniqueId,
                    sourceUrl
            )
        }
    }
}
