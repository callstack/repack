package com.callstack.repack

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.RuntimeExecutor


open class NativeScriptLoader(protected val reactContext: ReactContext) {
    private external fun evaluateJavascript(
            jsContext: Long,
            runtimeExecutorHolder: RuntimeExecutor,
            code: ByteArray,
            url: String)

    protected fun evaluate(script: ByteArray, url: String) {
        val contextHolder = reactContext.javaScriptContextHolder!!
        val jsContext: Long = contextHolder.get()

        val catalystInstance = reactContext.catalystInstance
        val runtimeExecutorHolder = catalystInstance.runtimeExecutor

        if (runtimeExecutorHolder == null) {
            // throw an error
            // this might happen on bridgeless 0.73
            // bridgelessCatalystInstance was only added in 0.74
            throw Error()
        }

        evaluateJavascript(jsContext, runtimeExecutorHolder, script, url)
    }

    open fun load(config: ScriptConfig, promise: Promise) {
        // not implemented
    }
}
