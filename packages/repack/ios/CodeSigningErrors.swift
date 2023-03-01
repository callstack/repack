//
//  CodeSigningErrors.swift
//  callstack-repack
//
//  Created by Jakub Romańczyk on 28/02/2023.
//

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
            failureReason = "No token for the bundle found."
        case .tokenInvalid:
            failureReason = "Token associated with the bundle is invalid."
        case .tokenDecodingFailed:
            failureReason = "Failed to decode the token."
        case .tokenVerificationFailed:
            failureReason = "Failed to verify the token. This might mean the token has been tampered with."
        case .publicKeyNotFound:
            failureReason = "PublicKey used for code-signing not found in the bundle. Make sure you've added the PublicKey to the Info.plist under RepackPublicKey key."
        case .publicKeyInvalid:
            failureReason = "PublicKey found in the bundle is not a valid key."
        case .bundleVerificationFailed:
            failureReason = "Bundle verification failed."
        }
        
        return [NSLocalizedFailureReasonErrorKey: failureReason]
    }
}
