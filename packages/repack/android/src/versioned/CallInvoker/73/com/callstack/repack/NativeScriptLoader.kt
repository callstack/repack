package com.callstack.repack

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactContext
import com.facebook.react.turbomodule.core.CallInvokerHolderImpl

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
        val catalystInstance = try {
            reactContext.catalystInstance
        } catch (e: Exception) {
            throw Exception("Missing CatalystInstance - bridgeless on RN 0.73 is not supported")
        }

        val callInvoker = catalystInstance?.jsCallInvokerHolder as? CallInvokerHolderImpl
            ?: throw Exception("Missing CallInvoker")
        val jsRuntime = catalystInstance.javaScriptContextHolder?.get()
            ?: throw Exception("Missing RN Runtime")

        if (promise != null) {
            evaluateJavascriptAsync(jsRuntime, callInvoker, script, url, promise)
        } else {
            // do we need the callinvoker when the call is sync?
            evaluateJavascriptSync(jsRuntime, script, url)
        }
    }
}
