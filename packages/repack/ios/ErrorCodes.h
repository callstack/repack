#ifndef ErrorCodes_h
#define ErrorCodes_h

typedef NSString *ScriptManagerError NS_TYPED_ENUM;
extern ScriptManagerError const CodeExecutionFailure = @"CodeExecutionFailure";
extern ScriptManagerError const InvalidationFailure = @"InvalidationFailure";
extern ScriptManagerError const ScriptDownloadFailure = @"ScriptDownloadFailure";
extern ScriptManagerError const UnsupportedScheme = @"UnsupportedScheme";
extern ScriptManagerError const ScriptConfigError = @"ScriptConfigError";
extern ScriptManagerError const RuntimeUnavailableError = @"RuntimeUnavailableError";
extern ScriptManagerError const CallInvokerUnavailableError = @"CallInvokerUnavailableError";

#endif /* ErrorCodes_h */
