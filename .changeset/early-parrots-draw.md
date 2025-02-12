---
"@callstack/repack-dev-server": major
"@callstack/repack": major
---

BREAKING CHANGES: Removed `devServerEnabled` option from assets-loader and `devServer` from Repack plugin configuration - they are now obtained automatically from configuration.

Added new `config.devServer` field to configure development server properties with type-safe http/https configuration, special host values (local-ip, local-ipv4, local-ipv6), and enhanced HTTPS configuration with full HttpsServerOptions support.
