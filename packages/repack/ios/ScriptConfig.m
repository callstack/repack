#import <Foundation/Foundation.h>
#import "ScriptConfig.h"

@implementation ScriptConfig

@synthesize scriptId = _scriptId;
@synthesize url = _url;
@synthesize method = _method;
@synthesize query = _query;
@synthesize fetch = _fetch;
@synthesize absolute = _absolute;
@synthesize body = _body;
@synthesize headers = _headers;
@synthesize timeout = _timeout;
@synthesize verifyScriptSignature = _verifyScriptSignature;

+ (ScriptConfig *)fromConfigDictionary:(NSDictionary *)config
                          withScriptId:(nonnull NSString*)scriptId
{
    NSString *urlString = config[@"url"];
    NSString *query = config[@"query"];
    NSString *method = config[@"method"];
    NSNumber *timeout = config[@"timeout"];
    
    if (!urlString) {
        @throw [NSError errorWithDomain:@"Missing url" code:1 userInfo:nil];
    }
    
    if (!method) {
        @throw [NSError errorWithDomain:@"Missing method" code:2 userInfo:nil];
    }
    
    if (!timeout) {
        @throw [NSError errorWithDomain:@"Missing timeout" code:3 userInfo:nil];
    }
    
    NSURLComponents *urlComponents = [NSURLComponents componentsWithString:urlString];
    urlComponents.query = query;
    
    BOOL fetch = [config[@"fetch"] boolValue];
    BOOL absolute = [config[@"absolute"] boolValue];
    
    return [[ScriptConfig alloc] initWithScript:scriptId
                                          withURL:urlComponents.URL
                                       withMethod:method
                                        withQuery:query
                                        withFetch:fetch
                                     withAbsolute:absolute
                                      withHeaders:config[@"headers"]
                                         withBody:[config[@"body"] dataUsingEncoding:NSUTF8StringEncoding]
                                      withTimeout:config[@"timeout"]
                        withVerifyScriptSignature:config[@"verifyScriptSignature"]];
}

- (id)init
{
    if (!self) {
        self = [super init];
    }
    return self;
}

- (ScriptConfig *)initWithScript:(NSString *)scriptId
                       withURL:(NSURL *)url
                    withMethod:(NSString *)method
                     withQuery:(NSString *)query
                     withFetch:(BOOL)fetch
                  withAbsolute:(BOOL)absolute
                   withHeaders:(nullable NSDictionary *)headers
                      withBody:(nullable NSData *)body
                   withTimeout:(nonnull NSNumber *)timeout
     withVerifyScriptSignature:(NSString *)verifyScriptSignature;
{
    _scriptId = scriptId;
    _url = url;
    _method = method;
    _query = query;
    _fetch = fetch;
    _absolute = absolute;
    _body = body;
    _headers = headers;
    _timeout = timeout;
    _verifyScriptSignature = verifyScriptSignature;
    return self;
}

@end
