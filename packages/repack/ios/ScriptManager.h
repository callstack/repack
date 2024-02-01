#ifdef RCT_NEW_ARCH_ENABLED
#import "RNScriptManagerSpec.h"

@interface ScriptManager : NSObject <NativeScriptManagerSpec>
#else
#import <React/RCTBridgeModule.h>

@interface ScriptManager : NSObject <RCTBridgeModule>
#endif

@end
