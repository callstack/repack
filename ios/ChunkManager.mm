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

RCT_EXPORT_METHOD(loadChunk:(nonnull NSString*)chunkId
                 chunkUrl:(nonnull NSString*)chunkUrlString
                 fetch:(BOOL*)fetch
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    // Cast `RCTBridge` to `RCTCxxBridge`.
    __weak RCTCxxBridge *bridge = (RCTCxxBridge *)_bridge;

    NSURL *chunkUrl = [NSURL URLWithString:chunkUrlString];
    
    // Handle http & https
    if ([[chunkUrl scheme] hasPrefix:@"http"]) {
        [self downloadAndCache:chunkId chunkUrl:chunkUrl fetch:fetch completionHandler:^(NSString *chunkPath, NSError *error) {
            if(error) {
                reject(RemoteEvalFailure, error.localizedFailureReason, nil); // FIXME: error code
            } else {
                @try {
                    NSFileManager* manager = [NSFileManager defaultManager];
                    NSData* data = [manager contentsAtPath:chunkPath];
                    [bridge executeApplicationScript:data url:chunkUrl async:YES];
                    resolve(nil);
                } @catch (NSException *exception) {
                    reject(RemoteEvalFailure, exception.reason, nil);
                }
            }
        }];
    } else if ([[chunkUrl scheme] isEqualToString:@"file"]) {
        [self loadChunkFromFilesystem:bridge url:chunkUrl withResolver:resolve withRejecter:reject];
        
    } else {
        reject(UnsupportedScheme,
               [NSString stringWithFormat:@"Scheme in URL '%@' is not supported", chunkUrlString], nil);
    }
}

RCT_EXPORT_METHOD(preloadChunk:(nonnull NSString*)chunkId
                 chunkUrl:(nonnull NSString*)chunkUrlString
                 fetch: (BOOL*)fetch
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject) {
    NSURL *chunkUrl = [NSURL URLWithString:chunkUrlString];
    if ([[chunkUrl scheme] hasPrefix:@"http"]) {
        [self downloadAndCache:chunkId chunkUrl:chunkUrl fetch:fetch completionHandler:^(NSString *chunkPath, NSError *error) {
            if(error) {
                reject(RemoteEvalFailure, error.localizedFailureReason, nil); // FIXME: error code
            } else {
                resolve(nil);
            }
        }];
    }
}

RCT_EXPORT_METHOD(invalidateChunks:(nonnull NSArray*)chunks
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject) {
    
    // TODO: refactor out getting path to util
    NSFileManager* manager = [NSFileManager defaultManager];
    NSString *rootDirectoryPath = NSSearchPathForDirectoriesInDomains(NSLibraryDirectory, NSUserDomainMask, YES).firstObject;
    rootDirectoryPath = [rootDirectoryPath
        stringByAppendingPathComponent:[[NSBundle mainBundle] bundleIdentifier]];
    NSString* chunksDirectoryPath = [rootDirectoryPath stringByAppendingPathComponent:@"chunks"];
    
    // TODO: handle errors
    NSError *removeChunksError;
    if (chunks.count == 0) {
        [manager removeItemAtPath:chunksDirectoryPath error:&removeChunksError];
    } else {
        for (int i=0;i<chunks.count;i++) {
            NSString * chunkFilePath = [chunksDirectoryPath stringByAppendingPathComponent: [NSString stringWithFormat:@"%@.chunk.bundle", chunks[i]]];
            [manager removeItemAtPath:chunkFilePath error:&removeChunksError];
        }
    }
    
}

- (void)downloadAndCache:(NSString *)chunkId
                chunkUrl:(NSURL *)chunkUrl
                   fetch:(BOOL*)fetch
       completionHandler:(void (^)(NSString *chunkPath, NSError *error))completion
{
    NSFileManager* manager = [NSFileManager defaultManager];
    NSString *rootDirectoryPath = NSSearchPathForDirectoriesInDomains(NSLibraryDirectory, NSUserDomainMask, YES).firstObject;
    rootDirectoryPath = [rootDirectoryPath
        stringByAppendingPathComponent:[[NSBundle mainBundle] bundleIdentifier]];
    
    NSString* chunksDirectoryPath = [rootDirectoryPath stringByAppendingPathComponent:@"chunks"];
    NSString* chunkPath = [chunksDirectoryPath stringByAppendingPathComponent:chunkId];
    chunkPath = [chunkPath stringByAppendingPathExtension:@"chunk.bundle"];
    if ([manager fileExistsAtPath:chunkPath])
    {
        completion(chunkPath, nil);
    } else {
        NSURLSessionDataTask *task = [[NSURLSession sharedSession] dataTaskWithURL:chunkUrl
                                                                 completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
            if (error != nil) {
                completion(chunkPath, error);
            } else {
                @try {
                    NSError *error;
                    createChunksDirectory(rootDirectoryPath, &error);
                    
                    [[NSFileManager defaultManager] createDirectoryAtPath:chunksDirectoryPath
                                              withIntermediateDirectories:YES
                                                               attributes:nil
                                                                    error:&error];
                    
                    [data writeToFile:chunkPath options:NSDataWritingAtomic error:&error];
                    
                    //FIXME: better error handling
                    
                    if (error) {
                        completion(chunkPath, error);
                    }
                    completion(chunkPath, nil);
                } @catch (NSException *exception) {
                    completion(chunkPath, nil); // FIXME: send some error
                }
                
                
            }
        }];
        [task resume];
    }
    
}

static void createChunksDirectory(NSString *rootDirectoryPath, NSError **error)
{
    NSFileManager* manager = [NSFileManager defaultManager];
    NSString* chunksDirectoryPath = [rootDirectoryPath stringByAppendingPathComponent:@"chunks"];
    if (![manager fileExistsAtPath:chunksDirectoryPath])
    {
        [[NSFileManager defaultManager] createDirectoryAtPath:chunksDirectoryPath
                                  withIntermediateDirectories:YES
                                                   attributes:nil
                                                        error:error];
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
