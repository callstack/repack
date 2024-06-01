#include <jsi/jsi.h>
#include <fbjni/fbjni.h>
#include <react/jni/JRuntimeExecutor.h>
#include <ReactCommon/RuntimeExecutor.h>

using namespace facebook;
using namespace facebook::jni;

struct NativeScriptLoader : public jni::HybridClass<NativeScriptLoader> {
    static constexpr auto kJavaDescriptor = "Lcom/callstack/repack/NativeScriptLoader;";

    static void registerNatives();

    static void evaluateJavascript(
            jni::alias_ref<jhybridobject> jThis,
            jni::alias_ref<react::JRuntimeExecutor::javaobject> runtimeExecutorHolder,
            jni::alias_ref<JArrayByte> code,
            jni::alias_ref<JString> url
    );
};
