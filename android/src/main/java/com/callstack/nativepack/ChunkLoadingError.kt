package com.reactnativewebpacktoolkit

enum class ChunkLoadingError(val code: String) {
    UnsupportedScheme("UnsupportedScheme"),
    FileSystemEvalFailure("FileSystemEvalFailure"),
    NetworkFailure("NetworkFailure"),
    RequestFailure("RequestFailure"),
    RemoteEvalFailure("FileSystemEvalFailure"),
}