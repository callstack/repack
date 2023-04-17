// Use Native Module Spec when we run new architecure
#ifdef RCT_NEW_ARCH_ENABLED
#import <repack/repack.h>

NS_ASSUME_NONNULL_BEGIN

@interface ScriptManager : NSObject <NativeScriptManagerSpec>

@end

NS_ASSUME_NONNULL_END

#else
#ifndef ScriptManager_h
#define ScriptManager_h

#import <React/RCTBridgeModule.h>

@interface ScriptManager : NSObject <RCTBridgeModule>

@end

#endif /* ScriptManager_h */
#endif