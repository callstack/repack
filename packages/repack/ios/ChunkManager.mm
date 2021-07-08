#import "ChunkManager.h"
#import <React/RCTBridge.h>
#import <React/RCTBundleURLProvider.h>

// Define interface of `RCTCxxBridge` with single method that we need to use.
// `RTCBridge instance is under the hood `RCTCxxBridge`.
@interface RCTCxxBridge

- (void)executeApplicationScript:(NSData *)script url:(NSURL *)url async:(BOOL)async;

@end

typedef NSString *ChunkManagerError NS_TYPED_ENUM;
extern ChunkManagerError const CodeExecutionFailure = @"CodeExecutionFailure";
extern ChunkManagerError const CodeExecutionFromFileSystemFailure = @"CodeExecutionFromFileSystemFailure";
extern ChunkManagerError const InvalidationFailure = @"InvalidationFailure";
extern ChunkManagerError const ChunkDownloadFailure = @"ChunkDownloadFailure";
extern ChunkManagerError const UnsupportedScheme = @"UnsupportedScheme";

@implementation ChunkManager

RCT_EXPORT_MODULE()

@synthesize bridge = _bridge;

RCT_EXPORT_METHOD(loadChunk:(nonnull NSString*)chunkId
                  chunkUrl:(nonnull NSString*)chunkUrlString
                  fetch:(BOOL)fetch
                  withResolver:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self runInBackground:^(){
        // Cast `RCTBridge` to `RCTCxxBridge`.
        __weak RCTCxxBridge *bridge = (RCTCxxBridge *)_bridge;
        
        NSURL *chunkUrl = [NSURL URLWithString:chunkUrlString];
        
        // Handle http & https
        if ([[chunkUrl scheme] hasPrefix:@"http"]) {
            if (fetch) {
                [self downloadAndCache:chunkId chunkUrl:chunkUrl completionHandler:^(NSError *error) {
                    if (error) {
                        reject(ChunkDownloadFailure, error.localizedFailureReason, nil);
                    } else {
                        [self execute:bridge chunkId:chunkId url:chunkUrl withResolver:resolve withRejecter:reject];
                    }
                }];
            } else {
                [self execute:bridge chunkId:chunkId url:chunkUrl withResolver:resolve withRejecter:reject];
            }
            
        } else if ([[chunkUrl scheme] isEqualToString:@"file"]) {
            [self executeFromFilesystem:bridge url:chunkUrl withResolver:resolve withRejecter:reject];
            
        } else {
            reject(UnsupportedScheme,
                   [NSString stringWithFormat:@"Scheme in URL '%@' is not supported", chunkUrlString], nil);
        }
    }];
}

RCT_EXPORT_METHOD(preloadChunk:(nonnull NSString*)chunkId
                  chunkUrl:(nonnull NSString*)chunkUrlString
                  fetch:(BOOL)fetch
                  withResolver:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)
{
    if (!fetch) {
        // Do nothing, chunk is already preloaded
        resolve(nil);
    } else {
        [self runInBackground:^(){
            NSURL *chunkUrl = [NSURL URLWithString:chunkUrlString];
            if ([[chunkUrl scheme] hasPrefix:@"http"]) {
                [self downloadAndCache:chunkId chunkUrl:chunkUrl completionHandler:^(NSError *error) {
                    if (error) {
                        reject(ChunkDownloadFailure, error.localizedFailureReason, nil);
                    } else {
                        resolve(nil);
                    }
                }];
            } else {
                reject(UnsupportedScheme,
                       [NSString stringWithFormat:@"Scheme in URL '%@' is not supported", chunkUrlString], nil);
            }
        }];
    }
}

RCT_EXPORT_METHOD(invalidateChunks:(nonnull NSArray*)chunks
                  withResolver:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self runInBackground:^(){
        NSFileManager* manager = [NSFileManager defaultManager];
        NSString* chunksDirecotryPath = [self getChunksDirectoryPath];
        
        NSError *error;
        if (chunks.count == 0 && [manager fileExistsAtPath:chunksDirecotryPath]) {
            [manager removeItemAtPath:chunksDirecotryPath error:&error];
        } else {
            for (int i = 0; i < chunks.count; i++) {
                NSString* chunkFilePath = [self getChunkFilePath:chunks[i]];
                if ([manager fileExistsAtPath:chunkFilePath]) {
                    [manager removeItemAtPath:[self getChunkFilePath:chunks[i]] error:&error];
                }
                if (error != nil) {
                    break;
                }
            }
        }
        
        if (error != nil) {
            reject(InvalidationFailure, error.localizedDescription, nil);
        } else {
            resolve(nil);
        }
    }];
}

- (void)execute:(RCTCxxBridge *)bridge
        chunkId:(NSString *)chunkId
            url:(NSURL *)url
   withResolver:(RCTPromiseResolveBlock)resolve
   withRejecter:(RCTPromiseRejectBlock)reject
{
    NSString *chunkPath = [self getChunkFilePath:chunkId];
    @try {
        NSFileManager* manager = [NSFileManager defaultManager];
        NSData* data = [manager contentsAtPath:chunkPath];
        [bridge executeApplicationScript:data url:url async:YES];
        resolve(nil);
    } @catch (NSError *error) {
        reject(CodeExecutionFailure, error.localizedDescription, nil);
    }
}

- (NSString *)getChunksDirectoryPath {
    NSString* rootDirectoryPath = NSSearchPathForDirectoriesInDomains(NSLibraryDirectory, NSUserDomainMask, YES).firstObject;
    rootDirectoryPath = [rootDirectoryPath stringByAppendingPathComponent:[[NSBundle mainBundle] bundleIdentifier]];
    return [rootDirectoryPath stringByAppendingPathComponent:@"chunks"];
}

- (NSString *)getChunkFilePath:(NSString*)chunkId {
    NSString* chunkPath = [[self getChunksDirectoryPath] stringByAppendingPathComponent:chunkId];
    return [chunkPath stringByAppendingPathExtension:@"chunk.bundle"];
}

- (void)downloadAndCache:(NSString *)chunkId
                chunkUrl:(NSURL *)chunkUrl
       completionHandler:(void (^)(NSError *error))callback
{
    NSString *chunkFilePath = [self getChunkFilePath:chunkId];
    NSString* chunksDirectoryPath = [self getChunksDirectoryPath];
    
    NSURLSessionDataTask *task = [[NSURLSession sharedSession] dataTaskWithURL:chunkUrl
                                                                completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
        if (error != nil) {
            callback(error);
        } else {
            @try {
                [self createChunksDirectory:chunksDirectoryPath];
                [data writeToFile:chunkFilePath options:NSDataWritingAtomic error:&error];
                callback(nil);
            } @catch (NSError *error) {
                callback(error);
            }
            
            
        }
    }];
    [task resume];    
}

- (void)createChunksDirectory:(NSString *)chunksDirectoryPath
{
    NSError *error;
    NSFileManager* manager = [NSFileManager defaultManager];
    
    if (![manager fileExistsAtPath:chunksDirectoryPath]) {
        [manager createDirectoryAtPath:chunksDirectoryPath
           withIntermediateDirectories:YES
                            attributes:nil
                                 error:&error];
    }
    
    if (error != nil) {
        throw error;
    }
    
}

- (void)executeFromFilesystem:(RCTCxxBridge *)bridge
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
    } @catch (NSError *error) {
        reject(CodeExecutionFromFileSystemFailure, error.localizedDescription, nil);
    }
    
}

- (void)runInBackground:(void(^)())callback
{
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), callback);
}

@end
