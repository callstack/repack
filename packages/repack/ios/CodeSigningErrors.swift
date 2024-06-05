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
            failureReason = "The bundle verification failed because no token for the bundle was found."
        case .tokenInvalid:
            failureReason = "The bundle verification failed because the token is invalid."
        case .tokenDecodingFailed:
            failureReason = "The bundle verification failed because the token could not be decoded."
        case .tokenVerificationFailed:
            failureReason = "The bundle verification failed because token verification was unsuccessful. This might mean the token has been tampered with."
        case .publicKeyNotFound:
            failureReason = "The bundle verification failed because PublicKey was not found in the bundle. Make sure you've added the PublicKey to the Info.plist under RepackPublicKey key."
        case .publicKeyInvalid:
            failureReason = "The bundle verification failed because the PublicKey is invalid."
        case .bundleVerificationFailed:
            failureReason = "The bundle verification failed because the bundle hash is invalid."
        }
        
        return [NSLocalizedFailureReasonErrorKey: failureReason]
    }
}
