#include <fbjni/fbjni.h>
#include "NativeScriptLoader.h"

void NativeScriptLoader::registerNatives() {
    registerHybrid({
                           makeNativeMethod("evaluateJavascript",
                                            NativeScriptLoader::evaluateJavascript)});
}

void NativeScriptLoader::evaluateJavascript(
        jni::alias_ref<jhybridobject> jThis,
        jni::alias_ref<react::JRuntimeExecutor::javaobject> runtimeExecutorHolder,
        jni::alias_ref<JArrayByte> code,
        jni::alias_ref<JString> url
) {
    auto pinnedCode = code->pin();
    jbyte *sourcePtr = pinnedCode.get();
    size_t sourceSize = pinnedCode.size();

    std::string source(reinterpret_cast<const char *>(sourcePtr), sourceSize);
    std::string sourceUrl = url->toString();

    react::RuntimeExecutor runtimeExecutor = runtimeExecutorHolder->cthis()->get();
    runtimeExecutor(
            [source = std::move(source), sourceUrl = std::move(sourceUrl)](jsi::Runtime &rt) {
                rt.evaluateJavaScript(std::make_unique<jsi::StringBuffer>(std::move(source)),
                                      std::move(sourceUrl));
            });
};
