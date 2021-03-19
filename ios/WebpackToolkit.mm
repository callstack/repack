#import "WebpackToolkit.h"
#import <React/RCTBridge.h>
#import <React/RCTBundleURLProvider.h>

@interface RCTCxxBridge

- (void)executeApplicationScript:(NSData *)script url:(NSURL *)url async:(BOOL)async;

@end

@implementation WebpackToolkit

RCT_EXPORT_MODULE()

@synthesize bridge = _bridge;

RCT_REMAP_METHOD(loadChunk,
                 chunkId:(nonnull NSString*)chunkId
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    __weak RCTCxxBridge *weakSelf = (RCTCxxBridge *)_bridge;
    @try
    {
        [weakSelf executeApplicationScript:[@"console.log('fuck yeah');" dataUsingEncoding:NSUTF8StringEncoding] url:nil async:YES];
        
        resolve(nil);
        
    } @catch (NSException * exception)
    {
        reject(@"error", @"error", nil);
    }
}

@end
