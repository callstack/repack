#import "WebpackToolkit.h"
#import <React/RCTBridge.h>
#import <React/RCTBundleURLProvider.h>

// Define interface of `RCTCxxBridge` with single method that we need to use.
// `RTCBridge instance is under the hood `RCTCxxBridge`.
@interface RCTCxxBridge

- (void)executeApplicationScript:(NSData *)script url:(NSURL *)url async:(BOOL)async;

@end

@implementation WebpackToolkit

RCT_EXPORT_MODULE()

@synthesize bridge = _bridge;

RCT_EXPORT_METHOD(loadChunk:(nonnull NSString*)chunkId
                  chunkUrl:(nonnull NSString*)chunkUrl
                  withResolver:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)
{
    // Cast `RCTBridge` to `RCTCxxBridge`.
    __weak RCTCxxBridge *weakSelf = (RCTCxxBridge *)_bridge;
    @try
    {
        if ([chunkUrl hasPrefix:@"http"]) {
            NSURL *url = [NSURL URLWithString:chunkUrl];
            NSURLSessionDataTask *task = [[NSURLSession sharedSession] dataTaskWithURL:url
                                                                     completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
                if (error != nil) {
                    reject(@"error", error.localizedDescription, nil);
                } else {
                    [weakSelf executeApplicationScript:data url:url async:YES];
                    resolve(nil);
                    
                }
            }];
            [task resume];
        } else {
            reject(@"error", @"Non-http chunk URLs are not yet supported", nil);
        }
    } @catch (NSException * exception)
    {
        reject(@"error", exception.reason, nil);
    }
}

@end
