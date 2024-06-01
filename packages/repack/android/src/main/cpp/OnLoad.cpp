#include <fbjni/fbjni.h>
#include "NativeScriptLoader.h"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM *vm, void *) {
    return facebook::jni::initialize(vm, [] {
        NativeScriptLoader::registerNatives();
    });
}
