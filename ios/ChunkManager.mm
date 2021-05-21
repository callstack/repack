#import "ChunkManager.h"
#import <React/RCTBridge.h>
#import <React/RCTBundleURLProvider.h>

// Define interface of `RCTCxxBridge` with single method that we need to use.
// `RTCBridge instance is under the hood `RCTCxxBridge`.
@interface RCTCxxBridge

- (void)executeApplicationScript:(NSData *)script url:(NSURL *)url async:(BOOL)async;

@end

typedef NSString *WebpackToolkitError NS_TYPED_ENUM;
extern WebpackToolkitError const UnsupportedScheme = @"UnsupportedScheme";
extern WebpackToolkitError const RequestFailure = @"RequestFailure";
extern WebpackToolkitError const RemoteEvalFailure = @"RemoteEvalFailure";
extern WebpackToolkitError const FileSystemEvalFailure = @"FileSystemEvalFailure";

@implementation ChunkManager

RCT_EXPORT_MODULE()

@synthesize bridge = _bridge;

RCT_EXPORT_METHOD(loadChunk:(nonnull NSString*)chunkHash
                 chunkId:(nonnull NSString*)chunkId
                 chunkUrl:(nonnull NSString*)chunkUrlString
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    // Cast `RCTBridge` to `RCTCxxBridge`.
    __weak RCTCxxBridge *bridge = (RCTCxxBridge *)_bridge;

    NSURL *chunkUrl = [NSURL URLWithString:chunkUrlString];
    
    // Handle http & https
    if ([[chunkUrl scheme] hasPrefix:@"http"]) {
        //        downloadAndCache
        [self loadChunkFromRemote:bridge url:chunkUrl withResolver:resolve withRejecter:reject];
    } else if ([[chunkUrl scheme] isEqualToString:@"file"]) {
        [self loadChunkFromFilesystem:bridge url:chunkUrl withResolver:resolve withRejecter:reject];
        
    } else {
        reject(UnsupportedScheme,
               [NSString stringWithFormat:@"Scheme in URL '%@' is not supported", chunkUrlString], nil);
    }
}

RCT_EXPORT_METHOD(preloadChunk:(nonnull NSString*)chunkHash
                 chunkId:(nonnull NSString*)chunkId
                 chunkUrl:(nonnull NSString*)chunkUrlString
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject) {
    NSURL *chunkUrl = [NSURL URLWithString:chunkUrlString];
    if ([[chunkUrl scheme] hasPrefix:@"http"]) {
//        downloadAndCache
    }
}

RCT_EXPORT_METHOD(invalidateChunks:(nonnull NSArray*)chunks
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject) {
    // TODO: implement
}

- (void)downloadAndCache:(NSString *)hash
                  chunkId:(NSString *)chunkId
                     url:(NSURL *)url
{
    NSFileManager* manager = [NSFileManager defaultManager];
    NSString *rootDirectoryPath = NSSearchPathForDirectoriesInDomains(NSLibraryDirectory, NSUserDomainMask, YES).firstObject;
    rootDirectoryPath = [rootDirectoryPath
        stringByAppendingPathComponent:[[NSBundle mainBundle] bundleIdentifier]];
    
    NSString* chunksDirectoryPath = [rootDirectoryPath stringByAppendingPathComponent:@"chunks"];
    NSString* chunkPath = [chunksDirectoryPath stringByAppendingPathComponent:hash];
    chunkPath = [chunksDirectoryPath stringByAppendingPathComponent:chunkId];
    chunkPath = [chunksDirectoryPath stringByAppendingPathExtension:@"chunk.bundle"];
    if ([manager fileExistsAtPath:chunksDirectoryPath])
    {
       // on Success
    } else {
        NSURLSessionDataTask *task = [[NSURLSession sharedSession] dataTaskWithURL:url
                                                                 completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
            if (error != nil) {
    //            reject(RequestFailure, error.localizedDescription, nil);
            } else {
                @try {
                    // TODO save to the cache
                
                    
                    NSFileManager* manager = [NSFileManager defaultManager];
                    
                    [data writeToFile:chunkPath atomically:YES];
                    // on Success
                } @catch (NSException *exception) {
    //                reject(RemoteEvalFailure, exception.reason, nil);
                    // on Error
                }
                
                
            }
        }];
        [task resume];
    }
    
    
}

- (void)loadChunkFromRemote:(RCTCxxBridge *)bridge
                        url:(NSURL *)url
               withResolver:(RCTPromiseResolveBlock)resolve
               withRejecter:(RCTPromiseRejectBlock)reject
{
    NSURLSessionDataTask *task = [[NSURLSession sharedSession] dataTaskWithURL:url
                                                             completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
        if (error != nil) {
            reject(RequestFailure, error.localizedDescription, nil);
        } else {
            @try {
                [bridge executeApplicationScript:data url:url async:YES];
                resolve(nil);
            } @catch (NSException *exception) {
                reject(RemoteEvalFailure, exception.reason, nil);
            }
            
            
        }
    }];
    [task resume];
}

- (void)loadChunkFromFilesystem:(RCTCxxBridge *)bridge
                            url:(NSURL *)url
                   withResolver:(RCTPromiseResolveBlock)resolve
                   withRejecter:(RCTPromiseRejectBlock)reject
{
    @try {
        NSString *chunkName = [[url lastPathComponent] stringByDeletingPathExtension];
        NSString *chunkExtension = [url pathExtension];
        NSURL *filesystemChunkUrl = [[NSBundle mainBundle] URLForResource:chunkName withExtension:chunkExtension];
        NSData *data = [[NSData alloc] initWithContentsOfFile:[filesystemChunkUrl path]];
        [bridge executeApplicationScript:data url:url async:YES];
        resolve(nil);
    } @catch (NSException *exception) {
        reject(FileSystemEvalFailure, exception.reason, nil);
    }
    
}

@end
