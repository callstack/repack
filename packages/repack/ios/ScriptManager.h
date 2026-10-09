#import <React/RCTBridgeModule.h>

// Conformance to the C++ codegen spec is declared in ScriptManager.mm so this
// header stays importable from Swift and Objective-C.
@interface ScriptManager : NSObject <RCTBridgeModule>

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
