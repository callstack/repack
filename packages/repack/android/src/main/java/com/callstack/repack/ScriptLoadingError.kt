package com.callstack.repack

enum class ScriptLoadingError(val code: String) {
    UnsupportedScheme("UnsupportedScheme"),
    NetworkFailure("NetworkFailure"),
    RequestFailure("RequestFailure"),
    ScriptEvalFailure("ScriptEvalFailure"),
    ScriptInvalidationFailure("ScriptInvalidationFailure"),
    ScriptCachingFailure("ScriptCachingFailure"),
}
