package com.callstack.repack

import com.facebook.react.bridge.*
import com.facebook.react.TurboReactPackage
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class ScriptManagerPackage : TurboReactPackage() {
 override fun getModule(name: String?, reactContext: ReactApplicationContext): NativeModule? =
   if (name == ScriptManagerModuleImpl.NAME) {
     ScriptManagerModule(reactContext)
   } else {
     null
   }

 override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
    val isTurboModule: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
   mapOf(
    ScriptManagerModuleImpl.NAME to ReactModuleInfo(
        ScriptManagerModuleImpl.NAME, // name
        ScriptManagerModuleImpl.NAME, // className
       false, // canOverrideExistingModule
       false, // needsEagerInit
       true, // hasConstants
       false, // isCxxModule
       isTurboModule // isTurboModule
     )
   )
 }
}
