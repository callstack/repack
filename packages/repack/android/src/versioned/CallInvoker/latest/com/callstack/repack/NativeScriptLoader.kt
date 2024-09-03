package com.callstack.repack

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactContext
import com.facebook.react.common.annotations.FrameworkAPI
import com.facebook.react.turbomodule.core.CallInvokerHolderImpl

@OptIn(FrameworkAPI::class)
class NativeScriptLoader(private val reactContext: ReactContext) {
    private external fun evaluateJavascriptAsync(
        jsRuntime: Long,
        callInvokerHolder: CallInvokerHolderImpl,
        code: ByteArray,
        url: String,
        promise: Any
    )

    private external fun evaluateJavascriptSync(
        jsRuntime: Long,
        code: ByteArray,
        url: String
    )

    fun evaluate(script: ByteArray, url: String, promise: Promise? = null) {
        // RN 0.74: CatalystInstance or BridgelessCatalystInstance
        val catalystInstance = reactContext.catalystInstance
        val callInvoker = catalystInstance?.jsCallInvokerHolder as? CallInvokerHolderImpl
            ?: throw Exception("Missing CallInvoker")
        val jsRuntime = reactContext.javaScriptContextHolder?.get()
            ?: throw Exception("Missing RN Runtime")

        if (promise != null) {
            evaluateJavascriptAsync(jsRuntime, callInvoker, script, url, promise)
        } else {
            // do we need the callinvoker when the call is sync?
            evaluateJavascriptSync(jsRuntime, script, url)
        }
    }
}
