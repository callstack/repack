#ifndef ErrorCodes_h
#define ErrorCodes_h

typedef NSString *ChunkManagerError NS_TYPED_ENUM;
extern ChunkManagerError const CodeExecutionFailure = @"CodeExecutionFailure";
extern ChunkManagerError const CodeExecutionFromFileSystemFailure = @"CodeExecutionFromFileSystemFailure";
extern ChunkManagerError const InvalidationFailure = @"InvalidationFailure";
extern ChunkManagerError const ChunkDownloadFailure = @"ChunkDownloadFailure";
extern ChunkManagerError const UnsupportedScheme = @"UnsupportedScheme";
extern ChunkManagerError const ChunkConfigError = @"ChunkConfigError";

#endif /* ErrorCodes_h */
