#ifdef RCT_NEW_ARCH_ENABLED
#import "RNScriptManagerSpec.h"

@interface ScriptManager : NSObject <NativeScriptManagerSpec>
#else
#import <React/RCTBridgeModule.h>

@interface ScriptManager : NSObject <RCTBridgeModule>
#endif

/**
 * Factory used to create the `NSURLSession` for downloading remote scripts.
 *
 * Set this before any remote script is loaded (e.g. in your AppDelegate) to
 * provide a custom session - for SSL pinning, custom headers, proxies, timeouts,
 * etc. Defaults to `[NSURLSession sharedSession]`. Assign `nil` to restore the
 * default. This is the iOS counterpart of `RemoteScriptLoader.okHttpClientFactory`
 * on Android.
 */
@property (class, nonatomic, copy, null_resettable) NSURLSession * (^urlSessionFactory)(void);

@end
