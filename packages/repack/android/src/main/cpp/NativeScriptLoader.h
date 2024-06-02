#include <jsi/jsi.h>
#include <fbjni/fbjni.h>
#include <ReactCommon/CallInvokerHolder.h>

using namespace facebook;
using namespace facebook::jni;

struct NativeScriptLoader : public jni::HybridClass<NativeScriptLoader> {
    static constexpr auto kJavaDescriptor = "Lcom/callstack/repack/NativeScriptLoader;";

    static void registerNatives();

    static void evaluateJavascriptAsync(
            jni::alias_ref<jhybridobject> jThis,
            jlong jsRuntime,
            jni::alias_ref<facebook::react::CallInvokerHolder::javaobject> jsCallInvokerHolder,
            jni::alias_ref<JArrayByte> code,
            jni::alias_ref<JString> url,
            jni::alias_ref<JObject::javaobject> promise
    );
};
