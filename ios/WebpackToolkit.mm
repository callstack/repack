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

RCT_REMAP_METHOD(loadChunk,
                 chunkId:(nonnull NSString*)chunkId
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
            NSString *chunkName = [[chunkUrl lastPathComponent] stringByDeletingPathExtension];
            NSString *chunkExtension = [chunkUrl pathExtension];
            NSURL *url = [[NSBundle mainBundle] URLForResource:chunkName withExtension:chunkExtension];
            NSData *data = [[NSData alloc] initWithContentsOfFile:[url path]];
            [weakSelf executeApplicationScript:data url:url async:YES];
            resolve(nil);
        }
    } @catch (NSException * exception)
    {
        reject(@"error", exception.reason, nil);
    }
}

@end
