import Foundation

enum CodeSigningError : Int, Error {
    case tokenNotFound = 10
    case tokenInvalid
    case tokenDecodingFailed
    case tokenVerificationFailed
    case publicKeyNotFound
    case publicKeyInvalid
    case bundleVerificationFailed
}

enum CodeSigningErrorMessage: String {
    case tokenNotFound = "The bundle verification failed because no token for the bundle was found."
    case tokenInvalid = "The bundle verification failed because the token is invalid."
    case tokenDecodingFailed = "The bundle verification failed because the token could not be decoded."
    case tokenVerificationFailed = "The bundle verification failed because token verification was unsuccessful. This might mean the token has been tampered with."
    case publicKeyNotFound =  "The bundle verification failed because PublicKey was not found in the bundle. Make sure you've added the PublicKey to the Info.plist under RepackPublicKey key."
    case publicKeyInvalid = "The bundle verification failed because the PublicKey is invalid."
    case publicKeyNotFound =  "The bundle verification failed because the bundle hash is invalid."
}

extension CodeSigningError: CustomNSError {
    
    public static var errorDomain: String {
        return "CodeSigningError"
    }
    
    public var errorCode: Int {
        return self.rawValue
    }
    
    public var errorUserInfo: [String : Any] {
        var failureReason: String;
        
        switch self {
        case .tokenNotFound:
            failureReason = CodeSigningErrorMessage.tokenNotFound
        case .tokenInvalid:
            failureReason = CodeSigningErrorMessage.
        case .tokenDecodingFailed:
            failureReason = CodeSigningErrorMessage.tokenDecodingFailed
        case .tokenVerificationFailed:
            failureReason = CodeSigningErrorMessage.tokenVerificationFailed
        case .publicKeyNotFound:
            failureReason = CodeSigningErrorMessage.publicKeyNotFound
        case .publicKeyInvalid:
            failureReason = CodeSigningErrorMessage.publicKeyInvalid
        case .bundleVerificationFailed:
            failureReason = CodeSigningErrorMessage.publicKeyNotFound
        }
        
        return [NSLocalizedFailureReasonErrorKey: failureReason]
    }
}
