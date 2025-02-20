#ifndef ScriptConfig_h
#define ScriptConfig_h

#ifdef RCT_NEW_ARCH_ENABLED
#import "RNScriptManagerSpec.h"
#endif

@interface ScriptConfig : NSObject

NS_ASSUME_NONNULL_BEGIN

@property (nonatomic, readonly) NSString *scriptId;
@property (nonatomic, readonly) NSURL *url;
@property (nonatomic, readonly) NSString *method;
@property (nonatomic, readonly, nullable) NSString *query;
@property (nonatomic, readonly) BOOL fetch;
@property (nonatomic, readonly) BOOL absolute;
@property (nonatomic, readonly, nullable) NSData *body;
@property (nonatomic, readonly, nullable) NSDictionary *headers;
@property (nonatomic, readonly) NSNumber *timeout;
@property (nonatomic, readonly) NSString *verifyScriptSignature;
@property (nonatomic, readonly) NSString *uniqueId;
@property (nonatomic, readonly) NSString *sourceUrl;

#ifdef RCT_NEW_ARCH_ENABLED
+ (ScriptConfig *)fromConfig:(JS::NativeScriptManager::NormalizedScriptLocator &)config
                withScriptId:(NSString *)scriptId;
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
       withVerifyScriptSignature:(NSString *)verifyScriptSignature
                    withUniqueId:(NSString *)uniqueId
                   withSourceUrl:(NSString *)sourceUrl;

NS_ASSUME_NONNULL_END

@end

#endif /* ScriptConfig_h */
