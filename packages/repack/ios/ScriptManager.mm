#import "ScriptManager.h"
#import "ErrorCodes.h"
#import "ScriptConfig.h"

// make it work with use_frameworks!
#if __has_include(<callstack_repack/callstack_repack-Swift.h>)
#import <callstack_repack/callstack_repack-Swift.h>
#else
#import "callstack_repack-Swift.h"
#endif

#import <React/RCTBridge.h>
#import <ReactCommon/CallInvoker.h>
#import <jsi/jsi.h>

@interface RCTBridge (JSIRuntime)
- (void *)runtime;
@end

#ifndef RCT_NEW_ARCH_ENABLED
@interface RCTBridge (RCTTurboModule)
- (std::shared_ptr<facebook::react::CallInvoker>)jsCallInvoker;
@end
#endif

@implementation ScriptManager

RCT_EXPORT_MODULE()

@synthesize bridge = _bridge;

#ifdef RCT_NEW_ARCH_ENABLED
RCT_EXPORT_METHOD(loadScript
                  : (nonnull NSString *)scriptId scriptConfig
                  : (JS::NativeScriptManager::NormalizedScriptLocator &)scriptConfig resolve
                  : (RCTPromiseResolveBlock)resolve reject
                  : (RCTPromiseRejectBlock)reject)
#else
RCT_EXPORT_METHOD(loadScript
                  : (nonnull NSString *)scriptId scriptConfig
                  : (nonnull NSDictionary *)scriptConfig resolve
                  : (RCTPromiseResolveBlock)resolve reject
                  : (RCTPromiseRejectBlock)reject)
#endif
{
  ScriptConfig *config;
  @try {
    config = [ScriptConfig fromConfig:scriptConfig withScriptId:scriptId];
  } @catch (NSError *error) {
    reject(ScriptConfigError, error.localizedDescription, nil);
    return;
  }

  [self runInBackground:^() {
    // Handle http & https
    if ([[config.url scheme] hasPrefix:@"http"]) {
      if (config.fetch) {
        [self downloadAndCache:config
             completionHandler:^(NSError *error) {
               if (error) {
                 reject(ScriptDownloadFailure, error.localizedFailureReason, nil);
               } else {
                 [self execute:config resolve:resolve reject:reject];
               }
             }];
      } else {
        [self execute:config resolve:resolve reject:reject];
      }

    } else if ([[config.url scheme] isEqualToString:@"file"]) {
      [self executeFromFilesystem:config resolve:resolve reject:reject];
    } else {
      reject(
          UnsupportedScheme,
          [NSString stringWithFormat:@"Scheme in URL '%@' is not supported", config.url.absoluteString],
          nil);
    }
  }];
}

#ifdef RCT_NEW_ARCH_ENABLED
RCT_EXPORT_METHOD(prefetchScript
                  : (nonnull NSString *)scriptId scriptConfig
                  : (JS::NativeScriptManager::NormalizedScriptLocator &)scriptConfig resolve
                  : (RCTPromiseResolveBlock)resolve reject
                  : (RCTPromiseRejectBlock)reject)
#else
RCT_EXPORT_METHOD(prefetchScript
                  : (nonnull NSString *)scriptId scriptConfig
                  : (nonnull NSDictionary *)scriptConfig resolve
                  : (RCTPromiseResolveBlock)resolve reject
                  : (RCTPromiseRejectBlock)reject)
#endif
{
  ScriptConfig *config;
  @try {
    config = [ScriptConfig fromConfig:scriptConfig withScriptId:scriptId];
  } @catch (NSError *error) {
    reject(ScriptConfigError, error.localizedDescription, nil);
    return;
  }

  if (!config.fetch) {
    // Do nothing, script is already prefetched
    resolve(nil);
  } else {
    [self runInBackground:^() {
      if ([[config.url scheme] hasPrefix:@"http"]) {
        [self downloadAndCache:config
             completionHandler:^(NSError *error) {
               if (error) {
                 reject(ScriptDownloadFailure, error.localizedFailureReason, nil);
               } else {
                 resolve(nil);
               }
             }];
      } else {
        reject(
            UnsupportedScheme,
            [NSString stringWithFormat:@"Scheme in URL '%@' is not supported", config.url.absoluteString],
            nil);
      }
    }];
  }
}

RCT_EXPORT_METHOD(invalidateScripts
                  : (nonnull NSArray *)scripts resolve
                  : (RCTPromiseResolveBlock)resolve reject
                  : (RCTPromiseRejectBlock)reject)
{
  [self runInBackground:^() {
    NSFileManager *manager = [NSFileManager defaultManager];
    NSString *scriptsDirecotryPath = [self getScriptsDirectoryPath];

    NSError *error;
    if (scripts.count == 0 && [manager fileExistsAtPath:scriptsDirecotryPath]) {
      [manager removeItemAtPath:scriptsDirecotryPath error:&error];
    } else {
      for (int i = 0; i < scripts.count; i++) {
        NSString *scriptFilePath = [self getScriptFilePath:scripts[i]];
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

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(unstable_evaluateScript
                                       : (NSString *)scriptSource scriptSourceUrl
                                       : (NSString *)scriptSourceUrl)
{
  facebook::jsi::Runtime *runtime = [self getJavaScriptRuntimePointer];

  if (!runtime) {
    @throw [NSError errorWithDomain:@"Can't access React Native runtime" code:0 userInfo:nil];
  }

  std::string source{[scriptSource UTF8String]};
  std::string sourceUrl{[scriptSourceUrl UTF8String]};

  runtime->evaluateJavaScript(std::make_unique<facebook::jsi::StringBuffer>(std::move(source)), sourceUrl);
  return @YES;
}

- (void)execute:(ScriptConfig *)config resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  NSString *scriptPath = [self getScriptFilePath:config.uniqueId];
  @try {
    NSFileManager *manager = [NSFileManager defaultManager];
    if (![[NSFileManager defaultManager] fileExistsAtPath:scriptPath]) {
      NSString *errorMessage = [NSString stringWithFormat:@"Script file does not exist at path: %@", scriptPath];
      @throw [NSError errorWithDomain:errorMessage code:0 userInfo:nil];
    }

    NSData *data = [manager contentsAtPath:scriptPath];
    if (!data) {
      NSString *errorMessage = [NSString stringWithFormat:@"Script file exists but could not be read: %@", scriptPath];
      @throw [NSError errorWithDomain:errorMessage code:0 userInfo:nil];
    }

    [self evaluateJavascript:data url:config.sourceUrl resolve:resolve reject:reject];
  } @catch (NSError *error) {
    reject(CodeExecutionFailure, error.domain, nil);
  }
}

- (NSString *)getScriptsDirectoryPath
{
  NSString *rootDirectoryPath =
      NSSearchPathForDirectoriesInDomains(NSLibraryDirectory, NSUserDomainMask, YES).firstObject;
  rootDirectoryPath = [rootDirectoryPath stringByAppendingPathComponent:[[NSBundle mainBundle] bundleIdentifier]];
  return [rootDirectoryPath stringByAppendingPathComponent:@"scripts"];
}

- (NSString *)getScriptFilePath:(NSString *)scriptUniqueId
{
  NSString *scriptPath = [[self getScriptsDirectoryPath] stringByAppendingPathComponent:scriptUniqueId];
  return [scriptPath stringByAppendingPathExtension:@"script.bundle"];
}

- (void)downloadAndCache:(ScriptConfig *)config completionHandler:(void (^)(NSError *error))callback
{
  NSString *scriptFilePath = [self getScriptFilePath:config.uniqueId];
  NSString *scriptsDirectoryPath = [self getScriptsDirectoryPath];

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

  NSURLSessionDataTask *task = [[NSURLSession sharedSession]
      dataTaskWithRequest:request
        completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
          NSHTTPURLResponse *httpResponse = (NSHTTPURLResponse *)response;
          NSInteger statusCode = [httpResponse statusCode];
          if (error != nil) {
            callback(error);
          } else if (statusCode < 200 || statusCode >= 300) {
            NSDictionary *userInfo = @{
              NSLocalizedFailureReasonErrorKey : [NSString
                  stringWithFormat:@"Request should have returned with 200 HTTP status, but instead it received %ld",
                                   (long)statusCode]
            };
            NSError *httpError = [NSError errorWithDomain:NSURLErrorDomain code:statusCode userInfo:userInfo];
            callback(httpError);
          } else {
            @try {
              NSDictionary<NSString *, id> *result = [CodeSigningUtils extractBundleAndTokenWithFileContent:data];
              NSData *bundle = (result[@"bundle"] != [NSNull null]) ? result[@"bundle"] : nil;
              NSString *token = (result[@"token"] != [NSNull null]) ? result[@"token"] : nil;

              if ([config.verifyScriptSignature isEqualToString:@"strict"] ||
                  ([config.verifyScriptSignature isEqualToString:@"lax"] && token != nil)) {
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
  NSFileManager *manager = [NSFileManager defaultManager];

  if (![manager fileExistsAtPath:scriptsDirectoryPath]) {
    [manager createDirectoryAtPath:scriptsDirectoryPath withIntermediateDirectories:YES attributes:nil error:&error];
  }

  if (error != nil) {
    throw error;
  }
}

- (void)executeFromFilesystem:(ScriptConfig *)config
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

    NSDictionary<NSString *, id> *result = [CodeSigningUtils extractBundleAndTokenWithFileContent:data];
    NSData *bundle = (result[@"bundle"] != [NSNull null]) ? result[@"bundle"] : nil;
    NSString *token = (result[@"token"] != [NSNull null]) ? result[@"token"] : nil;

    if ([config.verifyScriptSignature isEqualToString:@"strict"] ||
        ([config.verifyScriptSignature isEqualToString:@"lax"] && token != nil)) {
      NSError *codeSigningError = nil;
      [CodeSigningUtils verifyBundleWithToken:token fileContent:bundle error:&codeSigningError];
      if (codeSigningError != nil) {
        reject(CodeExecutionFailure, codeSigningError.localizedDescription, nil);
        return;
      }
    }

    [self evaluateJavascript:bundle url:config.sourceUrl resolve:resolve reject:reject];
  } @catch (NSError *error) {
    reject(CodeExecutionFailure, error.localizedDescription, nil);
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

- (void)evaluateJavascript:(NSData *)code
                       url:(NSString *)url
                   resolve:(RCTPromiseResolveBlock)resolve
                    reject:(RCTPromiseRejectBlock)reject
{
  std::shared_ptr<facebook::react::CallInvoker> callInvoker = self.bridge.jsCallInvoker;
  if (!callInvoker) {
    reject(CallInvokerUnavailableError, @"Missing CallInvoker - bridgeless on RN 0.73 is not supported", nil);
    return;
  }

  // There is no backwards compatible way to get runtime in an asynchronous manner
  // we obtain the ptr here, and use it inside of invokeAsync callback
  // TODO: Consider doing this during initialization step once to fail fast
  facebook::jsi::Runtime *runtime = [self getJavaScriptRuntimePointer];
  if (!runtime) {
    reject(RuntimeUnavailableError, @"Can't access React Native runtime", nil);
    return;
  }

  std::string source{static_cast<const char *>([code bytes]), [code length]};
  std::string sourceUrl{[url UTF8String]};

  callInvoker->invokeAsync([source = std::move(source), sourceUrl = std::move(sourceUrl), runtime, resolve, reject]() {
    // use c++ error handling here
    try {
      runtime->evaluateJavaScript(std::make_unique<facebook::jsi::StringBuffer>(std::move(source)), sourceUrl);
      resolve(nil);
    } catch (const std::exception &e) {
      NSString *errorString = [NSString stringWithUTF8String:e.what()];
      reject(CodeExecutionFailure, errorString, nil);
    }
  });
}

- (void)runInBackground:(void (^)())callback
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

@end
