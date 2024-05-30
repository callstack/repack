#import "ScriptManager.h"
#import "ScriptConfig.h"
#import "ErrorCodes.h"

// make it work with use_frameworks!
#if __has_include(<callstack_repack/callstack_repack-Swift.h>)
#import <callstack_repack/callstack_repack-Swift.h>
#else
#import "callstack_repack-Swift.h"
#endif

#import <React/RCTBridge.h>
#import <jsi/jsi.h>

@interface RCTBridge (JSIRuntime)
- (void *)runtime;
@end

@implementation ScriptManager

RCT_EXPORT_MODULE()

@synthesize bridge = _bridge;

RCT_EXPORT_METHOD(loadScript:(nonnull NSString*)scriptId
                  config:(nonnull NSDictionary*)configDictionary
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    [self runInBackground:^(){
        
        facebook::jsi::Runtime *jsRuntime = [self getJavaScriptRuntimePointer];
        if (!jsRuntime) {
            reject(RuntimeUnavailableError, @"Can't access JS runtime", nil);
            return;
        }
        
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
                        [self execute:jsRuntime
                             scriptId:config.scriptId
                                  url:config.url
                              resolve:resolve
                               reject:reject];
                    }
                }];
            } else {
                [self execute:jsRuntime scriptId:scriptId url:config.url resolve:resolve reject:reject];
            }
            
        } else if ([[config.url scheme] isEqualToString:@"file"]) {
            [self executeFromFilesystem:jsRuntime
                                 config:config
                                resolve:resolve
                                 reject:reject];
        } else {
            reject(UnsupportedScheme,
                   [NSString stringWithFormat:@"Scheme in URL '%@' is not supported", config.url.absoluteString], nil);
        }
    }];
}

RCT_EXPORT_METHOD(prefetchScript:(nonnull NSString*)scriptId
                  config:(nonnull NSDictionary*)configDictionary
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
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
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
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

- (void)execute:(facebook::jsi::Runtime *)jsRuntime
       scriptId:(NSString *)scriptId
            url:(NSURL *)url
        resolve:(RCTPromiseResolveBlock)resolve
         reject:(RCTPromiseRejectBlock)reject
{
    NSString *scriptPath = [self getScriptFilePath:scriptId];
    @try {
        NSFileManager* manager = [NSFileManager defaultManager];
        NSData* data = [manager contentsAtPath:scriptPath];
        
        facebook::jsi::Runtime &rt = *jsRuntime;
        std::string source(static_cast<const char*>([data bytes]), [data length]);
        std::string sourceUrl([[url absoluteString] UTF8String]);
        rt.evaluateJavaScript(std::make_unique<facebook::jsi::StringBuffer>(std::move(source)), sourceUrl);
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
                NSDictionary<NSString *, id> *result = [CodeSigningUtils extractBundleAndTokenWithFileContent:data];
                NSData *bundle = (result[@"bundle"] != [NSNull null]) ? result[@"bundle"] : nil;
                NSString *token = (result[@"token"] != [NSNull null]) ? result[@"token"] : nil;
                
                if ([config.verifyScriptSignature isEqualToString:@"strict"] || ([config.verifyScriptSignature isEqualToString:@"lax"] && token != nil)) {
                    NSError *codeSigningError = nil;
                    [CodeSigningUtils verifyBundleWithToken:token fileContent:bundle error:&codeSigningError];
                    if (codeSigningError != nil) {
                        callback(codeSigningError);
                        return;
                    }
                }
                [self createScriptsDirectory:scriptsDirectoryPath];
                [bundle writeToFile:scriptFilePath options:NSDataWritingAtomic error:&error];
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

- (void)executeFromFilesystem:(facebook::jsi::Runtime *)jsRuntime
                       config:(ScriptConfig *)config
                      resolve:(RCTPromiseResolveBlock)resolve
                       reject:(RCTPromiseRejectBlock)reject
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
        
        facebook::jsi::Runtime &rt = *jsRuntime;
        std::string source(static_cast<const char*>([data bytes]), [data length]);
        std::string sourceUrl([[filesystemScriptUrl absoluteString] UTF8String]);
        rt.evaluateJavaScript(std::make_unique<facebook::jsi::StringBuffer>(std::move(source)), sourceUrl);
        resolve(nil);
    } @catch (NSError *error) {
        reject(CodeExecutionFromFileSystemFailure, error.localizedDescription, nil);
    }
    
}

- (facebook::jsi::Runtime *)getJavaScriptRuntimePointer
{
    if (!self.bridge.runtime) {
        return nil;
    }
    
    facebook::jsi::Runtime *jsRuntime = (facebook::jsi::Runtime *)self.bridge.runtime;
    return jsRuntime;
}

- (void)runInBackground:(void(^)())callback
{
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), callback);
}

// Don't compile this code when we build for the old architecture.
#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
(const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeScriptManagerSpecJSI>(params);
}
#endif

@end
