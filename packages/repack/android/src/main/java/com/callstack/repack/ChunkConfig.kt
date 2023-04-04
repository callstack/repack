package com.callstack.repack

import com.facebook.react.bridge.ReadableMap
import okhttp3.Headers
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.net.URL

data class ScriptConfig(
    val id: String,
    val url: URL,
    val query: String?,
    val fetch: Boolean,
    val absolute: Boolean,
    val method: String,
    val body: RequestBody?,
    val timeout: Int,
    val headers: Headers,
    val token: String?,
    val verifyScriptSignature: Boolean
) {
    companion object {
        fun fromReadableMap(id: String, value: ReadableMap): ScriptConfig {
            val urlString = value.getString("url")
                ?: throw Error("ScriptManagerModule.load ScriptMissing url")
            val method = value.getString("method")
                ?: throw Error("ScriptManagerModule.load ScriptMissing method")
            val fetch = value.getBoolean("fetch")
            val absolute = value.getBoolean("absolute")
            val query = value.getString("query")
            val bodyString = value.getString("body")
            val headersMap = value.getMap("headers")
            val timeout = value.getInt("timeout")
            val token = value.getString("token")
            val verifyScriptSignature = value.getBoolean("verifyScriptSignature")

            val url = URL(
                if (query != null) {
                    "$urlString?$query"
                } else {
                    urlString
                }
            )

            val headers = Headers.Builder()
            val keyIterator = headersMap?.keySetIterator()
            while (keyIterator?.hasNextKey() == true) {
                val key = keyIterator.nextKey()
                val value = headersMap.getString(key);
                if (value != null) {
                    headers[key] = value
                }
            }

            val contentType = (headers["content-type"] ?: "text/plain").toMediaType()
            val body = bodyString?.toRequestBody(contentType)

            return ScriptConfig(
                id,
                url,
                query,
                fetch,
                absolute,
                method,
                body,
                timeout,
                headers.build(),
                token,
                verifyScriptSignature
            )
        }
    }
}
