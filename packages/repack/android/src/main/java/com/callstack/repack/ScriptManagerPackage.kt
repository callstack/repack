package com.callstack.repack

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class ScriptManagerPackage : BaseReactPackage() {
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
                    false, // canOverrideExistingModule
                    true, // needsEagerInit
                    false, // isCxxModule
                    isTurboModule
            )
            moduleInfos
        }
    }
}
