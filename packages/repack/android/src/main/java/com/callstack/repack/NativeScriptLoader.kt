package com.callstack.repack

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.RuntimeExecutor


abstract class NativeScriptLoader(protected val reactContext: ReactContext) {
    private external fun evaluateJavascript(
            runtimeExecutorHolder: RuntimeExecutor,
            code: ByteArray,
            url: String)

    protected fun evaluate(script: ByteArray, url: String) {
        // this works in both bridgeful and bridgeless modes except for 0.73
        val catalystInstance = reactContext.catalystInstance
        val runtimeExecutorHolder = catalystInstance.runtimeExecutor
                ?: throw Exception("Failed to load JavaScript Bundle - can't access RuntimeExecutor - this can happen if you are trying to run the app with new arch + bridgeless on React Native 0.73")

        evaluateJavascript(runtimeExecutorHolder, script, url)
    }

    abstract fun load(config: ScriptConfig, promise: Promise)
}
