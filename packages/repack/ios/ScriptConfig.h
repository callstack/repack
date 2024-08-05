#ifndef ScriptConfig_h
#define ScriptConfig_h

#ifdef RCT_NEW_ARCH_ENABLED
#import "RNScriptManagerSpec.h"
#endif

@interface ScriptConfig : NSObject

NS_ASSUME_NONNULL_BEGIN

@property (readonly) NSString *scriptId;
@property (readonly) NSURL *url;
@property (readonly) NSString *method;
@property (readonly, nullable) NSString *query;
@property (readonly) BOOL fetch;
@property (readonly) BOOL absolute;
@property (readonly, nullable) NSData *body;
@property (readonly, nullable) NSDictionary *headers;
@property (readonly) NSNumber *timeout;
@property (readonly) NSString *verifyScriptSignature;

#ifdef RCT_NEW_ARCH_ENABLED
+ (ScriptConfig *)fromConfig:(JS::NativeScriptManager::NormalizedScriptLocator)config withScriptId:(NSString *)scriptId;
#else
+ (ScriptConfig *)fromConfig:(NSDictionary *)config withScriptId:(NSString *)scriptId;
#endif

- (ScriptConfig *)initWithScript:(NSString *)scriptId
                         withURL:(NSURL *)url
                      withMethod:(NSString *)method
                       withQuery:(nullable NSString *)query
                       withFetch:(BOOL)fetch
                    withAbsolute:(BOOL)absolute
                     withHeaders:(nullable NSDictionary *)headers
                        withBody:(nullable NSData *)body
                     withTimeout:(NSNumber *)timeout
       withVerifyScriptSignature:(NSString *)verifyScriptSignature;

NS_ASSUME_NONNULL_END

@end

#endif /* ScriptConfig_h */
