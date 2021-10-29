#import <Foundation/Foundation.h>
#import "ChunkConfig.h"

@implementation ChunkConfig

@synthesize chunkId = _chunkId;
@synthesize url = _url;
@synthesize method = _method;
@synthesize query = _query;
@synthesize fetch = _fetch;
@synthesize body = _body;
@synthesize headers = _headers;

+ (ChunkConfig *)fromConfigDictionary:(NSDictionary *)config
                          withChunkId:(nonnull NSString*)chunkId
{
    NSString *urlString = config[@"url"];
    NSString *query = config[@"query"];
    NSString *method = config[@"method"];
    
    if (!urlString) {
        @throw [NSError errorWithDomain:@"Missing url" code:1 userInfo:nil];
    }
    
    if (!method) {
        @throw [NSError errorWithDomain:@"Missing method" code:2 userInfo:nil];
    }
    
    NSURLComponents *urlComponents = [NSURLComponents componentsWithString:urlString];
    urlComponents.query = query;
    
    return [[ChunkConfig alloc] initWithChunk:chunkId
                                      withURL:urlComponents.URL
                                   withMethod:method
                                    withQuery:query
                                    withFetch:config[@"fetch"]
                                  withHeaders:config[@"headers"]
                                     withBody:[config[@"body"] dataUsingEncoding:NSUTF8StringEncoding]];
}

- (id)init
{
    if (!self) {
        self = [super init];
    }
    return self;
}

- (ChunkConfig *)initWithChunk:(NSString *)chunkId
                       withURL:(NSURL *)url
                    withMethod:(NSString *)method
                     withQuery:(NSString *)query
                     withFetch:(BOOL)fetch
                   withHeaders:(nullable NSDictionary *)headers
                      withBody:(nullable NSData *)body
{
    _chunkId = chunkId;
    _url = url;
    _method = method;
    _query = query;
    _fetch = fetch;
    _body = body;
    _headers = headers;
    
    return self;
}

@end
