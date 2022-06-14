#ifndef ScriptConfig_h
#define ScriptConfig_h

@interface ScriptConfig : NSObject

@property (readonly, nonnull) NSString *scriptId;
@property (readonly, nonnull) NSURL *url;
@property (readonly, nonnull) NSString *method;
@property (readonly, nullable) NSString *query;
@property (readonly) BOOL fetch;
@property (readonly) BOOL absolute;
@property (readonly, nullable) NSData *body;
@property (readonly, nullable) NSDictionary *headers;
@property (readonly, nonnull) NSNumber *timeout;

+ (nonnull ScriptConfig *)fromConfigDictionary:(nonnull NSDictionary *)config
                                  withScriptId:(nonnull NSString*)scriptId;

- (ScriptConfig *)initWithScript:(nonnull NSString*)scriptId
                       withURL:(nonnull NSURL*)url
                    withMethod:(nonnull NSString*)method
                     withQuery:(nullable NSString*)query
                     withFetch:(BOOL)fetch
                  withAbsolute:(BOOL)absolute
                   withHeaders:(nullable NSDictionary *)headers
                      withBody:(nullable NSData *)body
                   withTimeout:(nonnull NSNumber *)timeout;

@end

#endif /* ScriptConfig_h */
