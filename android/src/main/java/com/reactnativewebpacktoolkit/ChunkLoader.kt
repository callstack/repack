package com.reactnativewebpacktoolkit

import com.facebook.react.bridge.Promise
import java.net.URL

interface ChunkLoader {
    fun load(url: URL, promise: Promise)
}