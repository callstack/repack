package com.callstack.repack

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactContext
import com.facebook.react.common.annotations.FrameworkAPI
import com.facebook.react.turbomodule.core.CallInvokerHolderImpl

@OptIn(FrameworkAPI::class)
abstract class NativeScriptLoader(protected val reactContext: ReactContext) {
    private external fun evaluateJavascriptAsync(
        jsRuntime: Long,
        callInvokerHolder: CallInvokerHolderImpl,
        code: ByteArray,
        url: String,
        promise: Any
    )

    protected fun evaluate(script: ByteArray, url: String, promise: Promise) {
        val catalystInstance = try {
            reactContext.catalystInstance
        } catch (e: Exception) {
            throw Exception("Missing CatalystInstance - bridgeless on RN 0.73 is not supported")
        }

        val callInvoker = catalystInstance?.jsCallInvokerHolder as? CallInvokerHolderImpl
            ?: throw Exception("Missing CallInvoker")
        val jsRuntime = catalystInstance.javaScriptContextHolder?.get()
            ?: throw Exception("Missing RN Runtime")

        evaluateJavascriptAsync(jsRuntime, callInvoker, script, url, promise)
    }

    abstract fun load(config: ScriptConfig, promise: Promise)
}
