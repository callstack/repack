package com.callstack.nativepack

import com.facebook.react.bridge.Promise
import java.net.URL

interface ChunkLoader {
    fun load(hash: String, id: String, url: URL, promise: Promise)
    fun preload(hash: String, id: String, url: URL, promise: Promise)
}