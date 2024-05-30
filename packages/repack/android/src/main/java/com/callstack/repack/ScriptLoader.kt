package com.callstack.repack

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactContext

abstract class ScriptLoader(protected val reactContext: ReactContext) {
    private external fun evaluateJavascript(jsiPtr: Long, code: ByteArray, url: String)

    protected fun evaluate(script: ByteArray, url: String) {
        val contextHolder = reactContext.javaScriptContextHolder!!
        val jsiPtr: Long = contextHolder.get()

        evaluateJavascript(jsiPtr, script, url)
    }

    abstract fun load(config: ScriptConfig, promise: Promise)
}
