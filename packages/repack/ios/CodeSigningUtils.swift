import Foundation
import CommonCrypto
import JWTDecode
import SwiftyRSA

@objc(CodeSigningUtils)
public class CodeSigningUtils: NSObject {
    
    private static func getPublicKey() -> String? {
        // obtain public key embedded into the bundle from infoPlist under a key RepackPublicKey
        let bundle = Bundle.main
        let publicKey = bundle.object(forInfoDictionaryKey: "RepackPublicKey") as? String
        return publicKey
    }
    
    private static func convertBase64URLtoBase64(_ base64URL: String) -> String {
        // replace the characters -_ with main format equivalents
        var base64 = base64URL
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        
        // pad the base64 string with "=" so it's divisible by 4
        if base64.count % 4 != 0 {
            base64.append(String(repeating: "=", count: 4 - base64.count % 4))
        }
        
        return base64
    }
    
    private static func decodeAndVerifyToken(token: String, publicKey: String) throws -> JWTDecode.JWT {
        guard let jwt = try? JWTDecode.decode(jwt: token) else {
            throw CodeSigningError.tokenDecodingFailed
        }
        
        // we have to convert the signature from base64URL standard to main format
        guard let jwtSignature = jwt.signature else {
            throw CodeSigningError.tokenInvalid
        }
        
        let signatureB64 = convertBase64URLtoBase64(jwtSignature)
        let signature = Signature(data: Data(base64Encoded: signatureB64)!)
        
        guard let pk = try? PublicKey(pemEncoded: publicKey) else {
            throw CodeSigningError.publicKeyInvalid
        }
        
        // use b64-encoded header and payload for signature verification
        let tokenWithoutSignature = token.components(separatedBy: ".").dropLast().joined(separator: ".")
        let clearMessage = try? ClearMessage(string: tokenWithoutSignature, using: .utf8)
        
        let isSuccesfullyVerified = try? clearMessage?.verify(with: pk, signature: signature, digestType: .sha256)
        
        if isSuccesfullyVerified! {
            return jwt
        } else {
            throw CodeSigningError.tokenVerificationFailed
        }
    }
    
    private static func computeHash(fileContent content: NSData?) -> String? {
        guard let content = content else { return nil }
        
        let hash = getHash(content)
        let hexHash = convertToHex(hash)
        
        return hexHash
    }
    
    private static func getHash(_ content: NSData) -> Data {
        let data = Data(referencing: content)
        var hash = [UInt8](repeating: 0, count: Int(CC_SHA256_DIGEST_LENGTH))
        data.withUnsafeBytes {
            _ = CC_SHA256($0.baseAddress, CC_LONG(data.count), &hash)
        }
        return Data(hash)
    }
    
    private static func convertToHex(_ data: Data) -> String {
        return data.reduce("") { $0 + String(format: "%02x", $1) }
    }
    
    @objc
    public static func verifyBundle(token: String?, fileContent: NSData?) throws {
        guard let token = token else {
            throw CodeSigningError.tokenNotFound
        }
        
        guard let publicKey = getPublicKey() else {
            throw CodeSigningError.publicKeyNotFound
        }
        
        let jwt = try decodeAndVerifyToken(token: token, publicKey: publicKey)
        guard let contentHash = jwt["hash"].string else {
            throw CodeSigningError.tokenInvalid
        }
        
        let fileHash = computeHash(fileContent: fileContent)
        
        if contentHash != fileHash {
            throw CodeSigningError.bundleVerificationFailed
        }
    }
    
    @objc
    public static func extractBundleAndToken(fileContent: NSData?) -> [String: Any] {
        // in signed bundles, last 1280 bytes are reserved for the token
        let signatureSize = 1280
        // used to denote beginning of the code-signing section of the bundle
        // alias for "Repack Code-Signing Signature Begin"
        let startingSequence = "/* RCSSB */"
        
        guard let data = fileContent else {
            return ["bundle": NSNull(), "token": NSNull()]
        }
        
        let fullData = Data(referencing: data)
        
        // if bundle is smaller than 1280 bytes, treat it as unsigned
        if fullData.count < signatureSize {
            return ["bundle": data, "token": NSNull()]
        }
        
        // extract the last 1280 bytes from the ByteArray
        let lastBytes = fullData.suffix(signatureSize)
        
        if let signatureString = String(data: lastBytes, encoding: .utf8), signatureString.hasPrefix(startingSequence) {
            // bundle is signed
            let bundle = fullData.prefix(fullData.count - signatureSize)
            let token = signatureString
                .replacingOccurrences(of: startingSequence, with: "")
                .replacingOccurrences(of: "\u{0000}", with: "")
                .trimmingCharacters(in: .whitespaces)
            return ["bundle": NSData(data: bundle), "token": token]
        } else {
            // bundle is not signed, so consider all bytes as bundle
            return ["bundle": data, "token": NSNull()]
        }
    }
}


