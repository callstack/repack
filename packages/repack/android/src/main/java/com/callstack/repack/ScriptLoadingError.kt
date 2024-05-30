package com.callstack.repack

enum class ScriptLoadingError(val code: String) {
    UnsupportedScheme("UnsupportedScheme"),
    FileSystemEvalFailure("FileSystemEvalFailure"),
    NetworkFailure("NetworkFailure"),
    RequestFailure("RequestFailure"),
    RemoteEvalFailure("RemoteEvalFailure"),
    ScriptInvalidationFailure("ScriptInvalidationFailure"),
    ScriptCachingFailure("ScriptCachingFailure"),
}
