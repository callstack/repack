package com.callstack.repack

import android.content.Context
import android.util.Base64
import com.nimbusds.jose.JWSVerifier
import com.nimbusds.jose.crypto.RSASSAVerifier
import com.nimbusds.jwt.SignedJWT
import java.math.BigInteger
import java.security.KeyFactory
import java.security.MessageDigest
import java.security.NoSuchAlgorithmException
import java.security.PublicKey
import java.security.interfaces.RSAPublicKey
import java.security.spec.X509EncodedKeySpec


class CodeSigningUtils {
    companion object {
        private fun getHash(string: String): ByteArray? {
            var digest: MessageDigest? = null
            try {
                digest = MessageDigest.getInstance("SHA-256")
            } catch (e1: NoSuchAlgorithmException) {
                e1.printStackTrace()
            }
            digest?.reset()
            return digest?.digest(string.toByteArray())
        }

        private fun bin2hex(data: ByteArray): String {
            return java.lang.String.format("%0" + data.size * 2 + "x", BigInteger(1, data))
        }

        private fun computeHash(content: String?): String? {
            if (content == null) {
                return null
            }

            val hashByteArray = getHash(content) ?: return null

            return bin2hex(hashByteArray)
        }

        private fun parsePublicKey(stringPublicKey: String?): PublicKey? {
            if (stringPublicKey == null) {
                return null
            }

            val formattedPublicKey = stringPublicKey.replace("-----BEGIN PUBLIC KEY-----", "")
                .replace("-----END PUBLIC KEY-----", "")
                .replace(System.getProperty("line.separator")!!, "");

            val byteKey: ByteArray = Base64.decode(formattedPublicKey.toByteArray(), Base64.DEFAULT)
            val X509Key = X509EncodedKeySpec(byteKey)
            val kf = KeyFactory.getInstance("RSA")

            return kf.generatePublic(X509Key)
        }

        private fun verifyAndDecodeToken(
            token: String, publicKey: PublicKey?
        ): Map<String, Any?>? {
            val signedJWT = SignedJWT.parse(token)
            val verifier: JWSVerifier = RSASSAVerifier(publicKey as RSAPublicKey)
            if (signedJWT.verify(verifier)) {
                return signedJWT.jwtClaimsSet.claims
            }

            return null
        }

        private fun getCustomPropertyFromStringsIfExist(
            context: Context, propertyName: String
        ): String? {
            val property: String
            val packageName: String = context.packageName
            val resId: Int =
                context.resources.getIdentifier("Repack$propertyName", "string", packageName)
            if (resId != 0) {
                property = context.getString(resId)
                return if (!property.isEmpty()) {
                    property
                } else {
                    null
                }
            }
            return null
        }

        fun verifyBundle(context: Context, token: String?, fileContent: String?) {
            if (token == null) {
                throw Exception("The bundle could not be verified because no token was found.")
            }

            val stringPublicKey = getCustomPropertyFromStringsIfExist(context, "PublicKey")

            val publicKey = parsePublicKey(stringPublicKey)
                ?: throw Exception("The bundle could not be verified because public key is invalid.")

            val claims: Map<String, Any?> = verifyAndDecodeToken(token, publicKey)
                ?: throw Exception("The bundle verification failed because the token is invalid")

            val contentHash = claims["hash"] as String?
                ?: throw Exception("The bundle could not be verified because file hash from token is invalid.")

            val fileHash = computeHash(fileContent)
                ?: throw Exception("The bundle could not be verified because bundle content is invalid.")

            if (contentHash != fileHash) {
                throw Exception("The bundle verification failed because the hash is invalid")
            }
        }
    }
}
