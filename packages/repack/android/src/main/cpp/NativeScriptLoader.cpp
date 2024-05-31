#include <fbjni/fbjni.h>
#include "NativeScriptLoader.h"

void NativeScriptLoader::registerNatives() {
    registerHybrid({
                           makeNativeMethod("evaluateJavascript",
                                            NativeScriptLoader::evaluateJavascript)});
}

void NativeScriptLoader::evaluateJavascript(
        jni::alias_ref<jhybridobject> jThis,
        jlong jsContext,
        jni::alias_ref<react::JRuntimeExecutor::javaobject> runtimeExecutorHolder,
        jni::alias_ref<JArrayByte> code,
        jni::alias_ref<JString> url
) {
    auto pinned = code->pin();
    auto codeptr = pinned.get();
    std::string source(reinterpret_cast<const char *>(codeptr), pinned.size());
    std::string sourceUrl = url->toString();

    react::RuntimeExecutor runtimeExecutor = runtimeExecutorHolder->cthis()->get();
    runtimeExecutor(
            [source = std::move(source), sourceUrl = std::move(sourceUrl)](jsi::Runtime &rt) {
                rt.evaluateJavaScript(std::make_unique<jsi::StringBuffer>(std::move(source)),
                                      sourceUrl);
            });
};
