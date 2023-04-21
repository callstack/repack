#import "ScriptManager.h"
#import "ScriptConfig.h"
#import "ErrorCodes.h"

#import "callstack_repack-Swift.h"

#import <React/RCTBridge.h>
#import <React/RCTBundleURLProvider.h>

// Define interface of `RCTCxxBridge` with single method that we need to use.
// `RTCBridge instance is under the hood `RCTCxxBridge`.
@interface RCTCxxBridge

- (void)executeApplicationScript:(NSData *)script url:(NSURL *)url async:(BOOL)async;

@end


@implementation ScriptManager

RCT_EXPORT_MODULE()

@synthesize bridge = _bridge;

RCT_EXPORT_METHOD(loadScript:(nonnull NSString*)scriptId
                  config:(nonnull NSDictionary*)configDictionary
                  withResolver:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self runInBackground:^(){
        // Cast `RCTBridge` to `RCTCxxBridge`.
        __weak RCTCxxBridge *bridge = (RCTCxxBridge *)_bridge;
        
        ScriptConfig *config;
        @try {
            config = [ScriptConfig fromConfigDictionary:configDictionary withScriptId:scriptId];
        } @catch (NSError *error) {
            reject(ScriptConfigError, error.localizedDescription, nil);
            return;
        }
        
        // Handle http & https
        if ([[config.url scheme] hasPrefix:@"http"]) {
            if (config.fetch) {
                [self downloadAndCache:config completionHandler:^(NSError *error) {
                    if (error) {
                        reject(ScriptDownloadFailure, error.localizedFailureReason, nil);
                    } else {
                        [self execute:bridge
                              scriptId:config.scriptId
                                  url:config.url
                         withResolver:resolve
                         withRejecter:reject];
                    }
                }];
            } else {
                [self execute:bridge scriptId:scriptId url:config.url withResolver:resolve withRejecter:reject];
            }
            
        } else if ([[config.url scheme] isEqualToString:@"file"]) {
            [self executeFromFilesystem:bridge
                                 config:config
                           withResolver:resolve
                           withRejecter:reject];
        } else {
            reject(UnsupportedScheme,
                   [NSString stringWithFormat:@"Scheme in URL '%@' is not supported", config.url.absoluteString], nil);
        }
    }];
}

RCT_EXPORT_METHOD(prefetchScript:(nonnull NSString*)scriptId
                  config:(nonnull NSDictionary*)configDictionary
                  withResolver:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)
{
    ScriptConfig *config;
    @try {
        config = [ScriptConfig fromConfigDictionary:configDictionary withScriptId:scriptId];
    } @catch (NSError *error) {
        reject(ScriptConfigError, error.localizedDescription, nil);
        return;
    }
    
    if (!config.fetch) {
        // Do nothing, script is already prefetched
        resolve(nil);
    } else {
        [self runInBackground:^(){
            if ([[config.url scheme] hasPrefix:@"http"]) {
                [self downloadAndCache:config completionHandler:^(NSError *error) {
                    if (error) {
                        reject(ScriptDownloadFailure, error.localizedFailureReason, nil);
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

RCT_EXPORT_METHOD(invalidateScripts:(nonnull NSArray*)scripts
                  withResolver:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self runInBackground:^(){
        NSFileManager* manager = [NSFileManager defaultManager];
        NSString* scriptsDirecotryPath = [self getScriptsDirectoryPath];
        
        NSError *error;
        if (scripts.count == 0 && [manager fileExistsAtPath:scriptsDirecotryPath]) {
            [manager removeItemAtPath:scriptsDirecotryPath error:&error];
        } else {
            for (int i = 0; i < scripts.count; i++) {
                NSString* scriptFilePath = [self getScriptFilePath:scripts[i]];
                if ([manager fileExistsAtPath:scriptFilePath]) {
                    [manager removeItemAtPath:[self getScriptFilePath:scripts[i]] error:&error];
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
        scriptId:(NSString *)scriptId
            url:(NSURL *)url
   withResolver:(RCTPromiseResolveBlock)resolve
   withRejecter:(RCTPromiseRejectBlock)reject
{
    NSString *scriptPath = [self getScriptFilePath:scriptId];
    @try {
        NSFileManager* manager = [NSFileManager defaultManager];
        NSData* data = [manager contentsAtPath:scriptPath];
        [bridge executeApplicationScript:data url:url async:YES];
        resolve(nil);
    } @catch (NSError *error) {
        reject(CodeExecutionFailure, error.localizedDescription, nil);
    }
}

- (NSString *)getScriptsDirectoryPath {
    NSString* rootDirectoryPath = NSSearchPathForDirectoriesInDomains(NSLibraryDirectory, NSUserDomainMask, YES).firstObject;
    rootDirectoryPath = [rootDirectoryPath stringByAppendingPathComponent:[[NSBundle mainBundle] bundleIdentifier]];
    return [rootDirectoryPath stringByAppendingPathComponent:@"scripts"];
}

- (NSString *)getScriptFilePath:(NSString*)scriptId {
    NSString* scriptPath = [[self getScriptsDirectoryPath] stringByAppendingPathComponent:scriptId];
    return [scriptPath stringByAppendingPathExtension:@"script.bundle"];
}

- (void)downloadAndCache:(ScriptConfig *)config
       completionHandler:(void (^)(NSError *error))callback
{
    NSString *scriptFilePath = [self getScriptFilePath:config.scriptId];
    NSString* scriptsDirectoryPath = [self getScriptsDirectoryPath];
    
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
                if (config.verifyScriptSignature) {
                    NSError *codeSigningError = nil;
                    [CodeSigningUtils verifyBundleWithToken:config.token fileContent:data error:&codeSigningError];
                    if (codeSigningError != nil) {
                        callback(codeSigningError);
                        return;
                    }
                }
                [self createScriptsDirectory:scriptsDirectoryPath];
                [data writeToFile:scriptFilePath options:NSDataWritingAtomic error:&error];
                callback(nil);
            } @catch (NSError *error) {
                callback(error);
            }
            
            
        }
    }];
    [task resume];
}

- (void)createScriptsDirectory:(NSString *)scriptsDirectoryPath
{
    NSError *error;
    NSFileManager* manager = [NSFileManager defaultManager];
    
    if (![manager fileExistsAtPath:scriptsDirectoryPath]) {
        [manager createDirectoryAtPath:scriptsDirectoryPath
           withIntermediateDirectories:YES
                            attributes:nil
                                 error:&error];
    }
    
    if (error != nil) {
        throw error;
    }
    
}

- (void)executeFromFilesystem:(RCTCxxBridge *)bridge
                       config:(ScriptConfig *)config
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject
{
    NSURL *url = config.url;
    @try {
        NSString *scriptName = [[url lastPathComponent] stringByDeletingPathExtension];
        NSString *scriptExtension = [url pathExtension];
        NSURL *filesystemScriptUrl = nil;
        if (config.absolute) {
            if ([[NSFileManager defaultManager] fileExistsAtPath:[url path]]) {
                filesystemScriptUrl = url;
            }
        } else {
            filesystemScriptUrl = [[NSBundle mainBundle] URLForResource:scriptName withExtension:scriptExtension];
        }
        NSData *data = [[NSData alloc] initWithContentsOfFile:[filesystemScriptUrl path]];
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

#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeScriptManagerSpecJSI>(params);
}
#endif

- (void)invalidateScripts:(NSArray *)scripts resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self runInBackground:^(){
        NSFileManager* manager = [NSFileManager defaultManager];
        NSString* scriptsDirecotryPath = [self getScriptsDirectoryPath];
        
        NSError *error;
        if (scripts.count == 0 && [manager fileExistsAtPath:scriptsDirecotryPath]) {
            [manager removeItemAtPath:scriptsDirecotryPath error:&error];
        } else {
            for (int i = 0; i < scripts.count; i++) {
                NSString* scriptFilePath = [self getScriptFilePath:scripts[i]];
                if ([manager fileExistsAtPath:scriptFilePath]) {
                    [manager removeItemAtPath:[self getScriptFilePath:scripts[i]] error:&error];
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

- (void)loadScript:(NSString *)scriptId config:(NSDictionary *)configDictionary resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self runInBackground:^(){
        // Cast `RCTBridge` to `RCTCxxBridge`.
        __weak RCTCxxBridge *bridge = (RCTCxxBridge *)self->_bridge;
        
        ScriptConfig *config;
        @try {
            config = [ScriptConfig fromConfigDictionary:configDictionary withScriptId:scriptId];
        } @catch (NSError *error) {
            reject(ScriptConfigError, error.localizedDescription, nil);
            return;
        }
        
        // Handle http & https
        if ([[config.url scheme] hasPrefix:@"http"]) {
            if (config.fetch) {
                [self downloadAndCache:config completionHandler:^(NSError *error) {
                    if (error) {
                        reject(ScriptDownloadFailure, error.localizedFailureReason, nil);
                    } else {
                        [self execute:bridge
                              scriptId:config.scriptId
                                  url:config.url
                         withResolver:resolve
                         withRejecter:reject];
                    }
                }];
            } else {
                [self execute:bridge scriptId:scriptId url:config.url withResolver:resolve withRejecter:reject];
            }
            
        } else if ([[config.url scheme] isEqualToString:@"file"]) {
            [self executeFromFilesystem:bridge
                                 config:config
                           withResolver:resolve
                           withRejecter:reject];
        } else {
            reject(UnsupportedScheme,
                   [NSString stringWithFormat:@"Scheme in URL '%@' is not supported", config.url.absoluteString], nil);
        }
    }];
}

- (void)prefetchScript:(NSString *)scriptId config:(NSDictionary *)configDictionary resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    ScriptConfig *config;
    @try {
        config = [ScriptConfig fromConfigDictionary:configDictionary withScriptId:scriptId];
    } @catch (NSError *error) {
        reject(ScriptConfigError, error.localizedDescription, nil);
        return;
    }
    
    if (!config.fetch) {
        // Do nothing, script is already prefetched
        resolve(nil);
    } else {
        [self runInBackground:^(){
            if ([[config.url scheme] hasPrefix:@"http"]) {
                [self downloadAndCache:config completionHandler:^(NSError *error) {
                    if (error) {
                        reject(ScriptDownloadFailure, error.localizedFailureReason, nil);
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

@end
