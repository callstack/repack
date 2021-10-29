#ifndef ChunkConfig_h
#define ChunkConfig_h

@interface ChunkConfig : NSObject

@property (readonly, nonnull) NSString *chunkId;
@property (readonly, nonnull) NSURL *url;
@property (readonly, nonnull) NSString *method;
@property (readonly, nullable) NSString *query;
@property (readonly) BOOL fetch;
@property (readonly) BOOL absolute;
@property (readonly, nullable) NSData *body;
@property (readonly, nullable) NSDictionary *headers;
@property (readonly, nonnull) NSNumber *timeout;

+ (nonnull ChunkConfig *)fromConfigDictionary:(nonnull NSDictionary *)config
                                  withChunkId:(nonnull NSString*)chunkId;

- (ChunkConfig *)initWithChunk:(nonnull NSString*)chunkId
                       withURL:(nonnull NSURL*)url
                    withMethod:(nonnull NSString*)method
                     withQuery:(nullable NSString*)query
                     withFetch:(BOOL)fetch
                  withAbsolute:(BOOL)absolute
                   withHeaders:(nullable NSDictionary *)headers
                      withBody:(nullable NSData *)body
                   withTimeout:(nonnull NSNumber *)timeout;

@end

#endif /* ChunkConfig_h */
