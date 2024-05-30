#include <string>

#include <jsi/jsi.h>
#include <jni.h>

using namespace facebook;

std::string jByteArrayToString(JNIEnv* env, jbyteArray byteArray) {
    const auto arrayLength = env->GetArrayLength(byteArray);
    const auto byteArrayElements = env->GetByteArrayElements(byteArray, nullptr);

    std::string result(reinterpret_cast<char*>(byteArrayElements), arrayLength);

    env->ReleaseByteArrayElements(byteArray, byteArrayElements, JNI_ABORT);

    return result;
}

std::string jStringToStdString(JNIEnv* env, jstring jStr) {
  if (!jStr) return "";

  const auto stringClass = env->GetObjectClass(jStr);
  const auto getBytes = env->GetMethodID(stringClass, "getBytes", "(Ljava/lang/String;)[B");
  const auto stringJbytes = (jbyteArray)env->CallObjectMethod(jStr, getBytes, env->NewStringUTF("UTF-8"));

  std::string result(jByteArrayToString(env, stringJbytes));

  env->DeleteLocalRef(stringJbytes);
  env->DeleteLocalRef(stringClass);
  
  return result;
}

extern "C" JNIEXPORT void JNICALL
Java_com_callstack_repack_ScriptLoader_evaluateJavascript(JNIEnv *env, jobject clazz, jlong jsiPtr, jbyteArray code, jstring url)
{
  auto &rt = *reinterpret_cast<jsi::Runtime *>(jsiPtr);
  
  std::string source(jByteArrayToString(env, code));
  std::string sourceUrl(jStringToStdString(env, url));
  
  rt.evaluateJavaScript(std::make_unique<jsi::StringBuffer>(std::move(source)), sourceUrl);
}
