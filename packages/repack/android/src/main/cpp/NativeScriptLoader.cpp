#include "NativeScriptLoader.h"
#include <fbjni/fbjni.h>

void NativeScriptLoader::registerNatives() {
  registerHybrid({makeNativeMethod(
      "evaluateJavascriptAsync", NativeScriptLoader::evaluateJavascriptAsync)});
}

void NativeScriptLoader::evaluateJavascriptAsync(
    jni::alias_ref<jhybridobject> jThis,
    jlong jsRuntime,
    jni::alias_ref<facebook::react::CallInvokerHolder::javaobject>
        jsCallInvokerHolder,
    jni::alias_ref<JArrayByte> code,
    jni::alias_ref<JString> url,
    jni::alias_ref<JObject::javaobject> promise) {
  // promise gets passed into callback for invokeAsync,
  // we need to retain the reference longer than the scope of this function
  auto promiseRef = make_global(promise);
  // no type for Promise, extract the methods manually
  static const auto resolve =
      promiseRef->getClass()->getMethod<void(jobject)>("resolve");
  static const auto reject =
      promiseRef->getClass()->getMethod<void(jstring, jstring)>("reject");

  std::shared_ptr<react::CallInvoker> callInvoker =
      jsCallInvokerHolder->cthis()->getCallInvoker();

  auto pinnedCode = code->pin();
  jbyte *sourcePtr = pinnedCode.get();
  size_t sourceSize = pinnedCode.size();

  std::string source(reinterpret_cast<const char *>(sourcePtr), sourceSize);
  std::string sourceUrl = url->toString();

  callInvoker->invokeAsync([source = std::move(source),
                            sourceUrl = std::move(sourceUrl),
                            rt = (jsi::Runtime *)jsRuntime,
                            promiseRef]() {
    try {
      rt->evaluateJavaScript(
          std::make_unique<jsi::StringBuffer>(std::move(source)),
          std::move(sourceUrl));
      resolve(promiseRef.get(), nullptr);
    } catch (std::exception &e) {
      reject(
          promiseRef.get(),
          jni::make_jstring("ScriptEvalFailure").get(),
          jni::make_jstring("Failed to evaluate Javascript").get());
    }
  });
};
