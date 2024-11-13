#import "ScriptConfig.h"
#import <Foundation/Foundation.h>

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
@synthesize uniqueId = _uniqueId;
@synthesize sourceUrl = _sourceUrl;

#ifdef RCT_NEW_ARCH_ENABLED
+ (ScriptConfig *)fromConfig:(JS::NativeScriptManager::NormalizedScriptLocator &)config
                withScriptId:(nonnull NSString *)scriptId
{
  NSDictionary *_Nullable headers = (NSDictionary *)config.headers();

  NSURLComponents *urlComponents = [NSURLComponents componentsWithString:config.url()];
  NSString *sourceUrl = urlComponents.URL.absoluteString;

  // overrides any existing query in the URL with config.query
  if (config.query() != nil) {
    urlComponents.percentEncodedQuery = config.query();
  }

  NSURL *url = urlComponents.URL;

  return [[ScriptConfig alloc] initWithScript:scriptId
                                      withURL:url
                                   withMethod:config.method()
                                    withQuery:config.query()
                                    withFetch:config.fetch()
                                 withAbsolute:config.absolute()
                                  withHeaders:headers
                                     withBody:[config.body() dataUsingEncoding:NSUTF8StringEncoding]
                                  withTimeout:[NSNumber numberWithDouble:config.timeout()]
                    withVerifyScriptSignature:config.verifyScriptSignature()
                                 withUniqueId:config.uniqueId()
                                withSourceUrl:sourceUrl];
}
#else
+ (ScriptConfig *)fromConfig:(NSDictionary *)config withScriptId:(nonnull NSString *)scriptId
{
  NSURLComponents *urlComponents = [NSURLComponents componentsWithString:config[@"url"]];
  if (config[@"query"] != nil) {
    urlComponents.percentEncodedQuery = config[@"query"];
  }
  NSURL *url = urlComponents.URL;

  urlComponents.query = nil;
  NSString *sourceUrl = urlComponents.URL.absoluteString;

  return [[ScriptConfig alloc] initWithScript:scriptId
                                      withURL:url
                                   withMethod:config[@"method"]
                                    withQuery:config[@"query"]
                                    withFetch:[config[@"fetch"] boolValue]
                                 withAbsolute:[config[@"absolute"] boolValue]
                                  withHeaders:config[@"headers"]
                                     withBody:[config[@"body"] dataUsingEncoding:NSUTF8StringEncoding]
                                  withTimeout:config[@"timeout"]
                    withVerifyScriptSignature:config[@"verifyScriptSignature"]
                                 withUniqueId:config[@"uniqueId"]
                                withSourceUrl:sourceUrl];
}
#endif

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
                       withQuery:(nullable NSString *)query
                       withFetch:(BOOL)fetch
                    withAbsolute:(BOOL)absolute
                     withHeaders:(nullable NSDictionary *)headers
                        withBody:(nullable NSData *)body
                     withTimeout:(nonnull NSNumber *)timeout
       withVerifyScriptSignature:(NSString *)verifyScriptSignature
                    withUniqueId:(NSString *)uniqueId
                   withSourceUrl:(nonnull NSString *)sourceUrl
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
  _uniqueId = uniqueId;
  _sourceUrl = sourceUrl;
  return self;
}

@end
