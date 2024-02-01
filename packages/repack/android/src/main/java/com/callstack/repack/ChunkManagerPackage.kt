package com.callstack.repack

import com.facebook.react.TurboReactPackage
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.NativeModule
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.facebook.react.module.model.ReactModuleInfo
import java.util.HashMap

class ScriptManagerPackage : TurboReactPackage() {
    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
        return if (name == ScriptManagerModule.NAME) {
            ScriptManagerModule(reactContext)
        } else {
            null
        }
    }

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
        return ReactModuleInfoProvider {
            val moduleInfos: MutableMap<String, ReactModuleInfo> = HashMap()
            val isTurboModule: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
            moduleInfos[ScriptManagerModule.NAME] = ReactModuleInfo(
                ScriptManagerModule.NAME,
                ScriptManagerModule.NAME,
                false,  // canOverrideExistingModule
                /** default value is true, but we should initialize it as quick as possible*/
                true,  // needsEagerInit
                false,  // isCxxModule
                isTurboModule // isTurboModule
            )
            moduleInfos
        }
    }
}
