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
        if (fetch) {
            [self downloadAndCache:chunkId chunkUrl:chunkUrl completionHandler:^(NSError *error) {
                if(error) {
                    reject(RemoteEvalFailure, error.localizedFailureReason, nil); // FIXME: error code
                } else {
                    [self execute:bridge chunkId:chunkId url:chunkUrl withResolver:resolve withRejecter:reject];
                }
            }];
        } else {
            [self execute:bridge chunkId:chunkId url:chunkUrl withResolver:resolve withRejecter:reject];
        }

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
    if (!fetch) {
        // Do nothing, chunk is already preloaded
        resolve(nil);
    } else {
        NSURL *chunkUrl = [NSURL URLWithString:chunkUrlString];
        if ([[chunkUrl scheme] hasPrefix:@"http"]) {
            [self downloadAndCache:chunkId chunkUrl:chunkUrl completionHandler:^(NSError *error) {
                if(error) {
                    reject(RemoteEvalFailure, error.localizedFailureReason, nil); // FIXME: error code
                } else {
                    resolve(nil);
                }
            }];
        } else {
            reject(UnsupportedScheme,
                   [NSString stringWithFormat:@"Scheme in URL '%@' is not supported", chunkUrlString], nil);
        }
    }

}

RCT_EXPORT_METHOD(invalidateChunks:(nonnull NSArray*)chunks
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject) {
    NSFileManager* manager = [NSFileManager defaultManager];
    
    // TODO: handle errors
    NSError *removeChunksError;
    if (chunks.count == 0) {
        [manager removeItemAtPath:[self getChunksDirectoryPath] error:&removeChunksError];
    } else {
        for (int i=0;i<chunks.count;i++) {
            [manager removeItemAtPath:[self getChunkFilePath:chunks[i]] error:&removeChunksError];
        }
    }
    
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
        } @catch (NSException *exception) {
            reject(RemoteEvalFailure, exception.reason, nil);
        }
}

- (NSString *)getChunksDirectoryPath {
    NSString* rootDirectoryPath = NSSearchPathForDirectoriesInDomains(NSLibraryDirectory, NSUserDomainMask, YES).firstObject;
    rootDirectoryPath = [rootDirectoryPath stringByAppendingPathComponent:[[NSBundle mainBundle] bundleIdentifier]];
    return [rootDirectoryPath stringByAppendingPathComponent:@"chunks"];
}

- (NSString *)getChunkFilePath:(NSString*) id {
    NSString* chunkPath = [[self getChunksDirectoryPath] stringByAppendingPathComponent:id];
    return [chunkPath stringByAppendingPathExtension:@"chunk.bundle"];
}

- (void)downloadAndCache:(NSString *)chunkId
                chunkUrl:(NSURL *)chunkUrl
       completionHandler:(void (^)(NSError *error))completion
{
    NSString *chunkPath = [self getChunkFilePath:chunkId];
    NSFileManager* manager = [NSFileManager defaultManager];
    NSString *rootDirectoryPath = NSSearchPathForDirectoriesInDomains(NSLibraryDirectory, NSUserDomainMask, YES).firstObject;
    rootDirectoryPath = [rootDirectoryPath
        stringByAppendingPathComponent:[[NSBundle mainBundle] bundleIdentifier]];
    
    NSString* chunksDirectoryPath = [self getChunksDirectoryPath];
    if ([manager fileExistsAtPath:chunkPath])
    {
        completion(nil);
    } else {
        NSURLSessionDataTask *task = [[NSURLSession sharedSession] dataTaskWithURL:chunkUrl
                                                                 completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
            if (error != nil) {
                completion(error);
            } else {
                @try {
                    NSError *error;
                    createChunksDirectory(chunksDirectoryPath, &error);
                    
                    [[NSFileManager defaultManager] createDirectoryAtPath:chunksDirectoryPath
                                              withIntermediateDirectories:YES
                                                               attributes:nil
                                                                    error:&error];
                    
                    [data writeToFile:chunkPath options:NSDataWritingAtomic error:&error];
                    
                    //FIXME: better error handling
                    
                    if (error) {
                        completion( error);
                    }
                    completion(nil);
                } @catch (NSException *exception) {
                    completion(nil); // FIXME: send some error
                }
                
                
            }
        }];
        [task resume];
    }
    
}

static void createChunksDirectory(NSString *chunksDirectoryPath, NSError **error)
{
    NSFileManager* manager = [NSFileManager defaultManager];
    if (![manager fileExistsAtPath:chunksDirectoryPath])
    {
        [[NSFileManager defaultManager] createDirectoryAtPath:chunksDirectoryPath
                                  withIntermediateDirectories:YES
                                                   attributes:nil
                                                        error:error];
    }
   
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
