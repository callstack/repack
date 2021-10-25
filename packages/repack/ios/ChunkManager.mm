#import "ChunkManager.h"
#import "ChunkConfig.h"
#import "ErrorCodes.h"
#import <React/RCTBridge.h>
#import <React/RCTBundleURLProvider.h>

// Define interface of `RCTCxxBridge` with single method that we need to use.
// `RTCBridge instance is under the hood `RCTCxxBridge`.
@interface RCTCxxBridge

- (void)executeApplicationScript:(NSData *)script url:(NSURL *)url async:(BOOL)async;

@end


@implementation ChunkManager

RCT_EXPORT_MODULE()

@synthesize bridge = _bridge;

RCT_EXPORT_METHOD(loadChunk:(nonnull NSString*)chunkId
                  config:(nonnull NSDictionary*)configDictionary
                  withResolver:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self runInBackground:^(){
        // Cast `RCTBridge` to `RCTCxxBridge`.
        __weak RCTCxxBridge *bridge = (RCTCxxBridge *)_bridge;
        
        ChunkConfig *config;
        @try {
            config = [ChunkConfig fromConfigDictionary:configDictionary withChunkId:chunkId];
        } @catch (NSError *error) {
            reject(ChunkConfigError, error.localizedDescription, nil);
            return;
        }
        
        // Handle http & https
        if ([[config.url scheme] hasPrefix:@"http"]) {
            if (config.fetch) {
                [self downloadAndCache:config completionHandler:^(NSError *error) {
                    if (error) {
                        reject(ChunkDownloadFailure, error.localizedFailureReason, nil);
                    } else {
                        [self execute:bridge
                              chunkId:config.chunkId
                                  url:config.url
                         withResolver:resolve
                         withRejecter:reject];
                    }
                }];
            } else {
                [self execute:bridge chunkId:chunkId url:config.url withResolver:resolve withRejecter:reject];
            }
            
        } else if ([[config.url scheme] isEqualToString:@"file"]) {
            [self executeFromFilesystem:bridge
                                    url:config.url
                           withResolver:resolve
                           withRejecter:reject];
        } else {
            reject(UnsupportedScheme,
                   [NSString stringWithFormat:@"Scheme in URL '%@' is not supported", config.url.absoluteString], nil);
        }
    }];
}

RCT_EXPORT_METHOD(preloadChunk:(nonnull NSString*)chunkId
                  config:(nonnull NSDictionary*)configDictionary
                  withResolver:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)
{
    ChunkConfig *config;
    @try {
        config = [ChunkConfig fromConfigDictionary:configDictionary withChunkId:chunkId];
    } @catch (NSError *error) {
        reject(ChunkConfigError, error.localizedDescription, nil);
        return;
    }
    
    if (!config.fetch) {
        // Do nothing, chunk is already preloaded
        resolve(nil);
    } else {
        [self runInBackground:^(){
            if ([[config.url scheme] hasPrefix:@"http"]) {
                [self downloadAndCache:config completionHandler:^(NSError *error) {
                    if (error) {
                        reject(ChunkDownloadFailure, error.localizedFailureReason, nil);
                    } else {
                        resolve(nil);
                    }
                }];
            } else {
                reject(UnsupportedScheme,
                       [NSString stringWithFormat:@"Scheme in URL '%@' is not supported", config.url.absoluteString], nil);
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

- (void)downloadAndCache:(ChunkConfig *)config
       completionHandler:(void (^)(NSError *error))callback
{
    NSString *chunkFilePath = [self getChunkFilePath:config.chunkId];
    NSString* chunksDirectoryPath = [self getChunksDirectoryPath];
    
    NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:config.url];
    request.HTTPMethod = [config.method uppercaseString];
    request.timeoutInterval = [config.timeout doubleValue];
    
    for (NSString *key in config.headers) {
        NSString *value = config.headers[key];
        if (value) {
            [request setValue:value forHTTPHeaderField:key];
        }
    }
    
    if ([request.HTTPMethod isEqualToString:@"POST"]) {
        request.HTTPBody = config.body;
    }
    if (request.HTTPBody && ![request valueForHTTPHeaderField:@"content-type"]) {
        [request setValue:@"text/plain" forHTTPHeaderField:@"content-type"];
    }
    
    NSURLSessionDataTask *task = [[NSURLSession sharedSession] dataTaskWithRequest:request
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
