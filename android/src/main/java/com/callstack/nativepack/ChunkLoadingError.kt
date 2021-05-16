package com.callstack.nativepack

enum class ChunkLoadingError(val code: String) {
    UnsupportedScheme("UnsupportedScheme"),
    FileSystemEvalFailure("FileSystemEvalFailure"),
    NetworkFailure("NetworkFailure"),
    RequestFailure("RequestFailure"),
    RemoteEvalFailure("FileSystemEvalFailure"),
}