import fs from 'node:fs';
import path from 'node:path';

export interface EmbedPublicKeyConfig {
  /** Absolute path to the public key file. */
  publicKeyPath: string;
  /** Absolute path to the project root. */
  projectRoot: string;
  /** Custom path to iOS Info.plist. Auto-detected if not provided. */
  iosInfoPlistPath?: string;
  /** Custom path to Android strings.xml. Auto-detected if not provided. */
  androidStringsXmlPath?: string;
}

export interface EmbedPublicKeyResult {
  error?: string;
  ios: { modified: boolean; path?: string; error?: string };
  android: { modified: boolean; path?: string; error?: string };
}

/**
 * Embeds the Re.Pack code-signing public key into native project files.
 * Modifies `Info.plist` (iOS) and `strings.xml` (Android) so the runtime
 * can verify signed bundles without manual file editing.
 */
export function embedPublicKey(
  config: EmbedPublicKeyConfig
): EmbedPublicKeyResult {
  let publicKey: string;
  try {
    publicKey = fs.readFileSync(config.publicKeyPath, 'utf-8').trim();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      error: `Failed to read public key from ${config.publicKeyPath}: ${message}`,
      ios: { modified: false },
      android: { modified: false },
    };
  }

  const result: EmbedPublicKeyResult = {
    ios: { modified: false },
    android: { modified: false },
  };

  const plistPath =
    config.iosInfoPlistPath ?? findIOSInfoPlistPath(config.projectRoot);

  if (plistPath) {
    try {
      embedPublicKeyInPlist(publicKey, plistPath);
      result.ios = { modified: true, path: plistPath };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      result.ios = { modified: false, path: plistPath, error: message };
    }
  }

  const stringsXmlPath =
    config.androidStringsXmlPath ??
    findAndroidStringsXmlPath(config.projectRoot);

  if (stringsXmlPath) {
    try {
      embedPublicKeyInStringsXml(publicKey, stringsXmlPath);
      result.android = { modified: true, path: stringsXmlPath };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      result.android = {
        modified: false,
        path: stringsXmlPath,
        error: message,
      };
    }
  }

  return result;
}

/**
 * Searches for `Info.plist` inside `ios/<AppDir>/Info.plist`.
 * Returns the first match or `null`.
 */
export function findIOSInfoPlistPath(projectRoot: string): string | null {
  const iosDir = path.join(projectRoot, 'ios');
  if (!fs.existsSync(iosDir)) {
    return null;
  }

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(iosDir, { withFileTypes: true });
  } catch {
    return null;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    // Skip common non-app directories
    if (
      entry.name === 'Pods' ||
      entry.name === 'build' ||
      entry.name.endsWith('.xcodeproj') ||
      entry.name.endsWith('.xcworkspace')
    ) {
      continue;
    }
    const plistPath = path.join(iosDir, entry.name, 'Info.plist');
    if (fs.existsSync(plistPath)) {
      return plistPath;
    }
  }

  return null;
}

/**
 * Returns the standard path to `strings.xml` if it exists, or `null`.
 */
export function findAndroidStringsXmlPath(projectRoot: string): string | null {
  const stringsPath = path.join(
    projectRoot,
    'android',
    'app',
    'src',
    'main',
    'res',
    'values',
    'strings.xml'
  );
  return fs.existsSync(stringsPath) ? stringsPath : null;
}

/**
 * Embeds or updates `RepackPublicKey` in an iOS `Info.plist` file.
 */
export function embedPublicKeyInPlist(
  publicKey: string,
  plistPath: string
): void {
  let content = fs.readFileSync(plistPath, 'utf-8');

  const existingKeyPattern =
    /[ \t]*<key>RepackPublicKey<\/key>\s*<string>[\s\S]*?<\/string>/;

  const replacement =
    '\t<key>RepackPublicKey</key>\n' +
    `\t<string>${escapeXml(publicKey)}</string>`;

  if (existingKeyPattern.test(content)) {
    content = content.replace(existingKeyPattern, replacement);
  } else {
    const insertIdx = content.lastIndexOf('</dict>');
    if (insertIdx === -1) {
      throw new Error(
        `[CodeSigningPlugin] Could not find </dict> in ${plistPath}. ` +
          'The file may not be a valid Info.plist.'
      );
    }
    content =
      content.slice(0, insertIdx) +
      replacement +
      '\n' +
      content.slice(insertIdx);
  }

  fs.writeFileSync(plistPath, content, 'utf-8');
}

/**
 * Embeds or updates `RepackPublicKey` in an Android `strings.xml` file.
 * Creates the file if it does not exist.
 */
export function embedPublicKeyInStringsXml(
  publicKey: string,
  stringsXmlPath: string
): void {
  const escapedKey = escapeXml(publicKey);
  const newEntry = `    <string name="RepackPublicKey" translatable="false">${escapedKey}</string>`;

  if (!fs.existsSync(stringsXmlPath)) {
    const dir = path.dirname(stringsXmlPath);
    fs.mkdirSync(dir, { recursive: true });
    const content =
      '<?xml version="1.0" encoding="utf-8"?>\n' +
      '<resources>\n' +
      newEntry +
      '\n' +
      '</resources>\n';
    fs.writeFileSync(stringsXmlPath, content, 'utf-8');
    return;
  }

  let content = fs.readFileSync(stringsXmlPath, 'utf-8');

  const existingPattern =
    /[ \t]*<string name="RepackPublicKey"[^>]*>[\s\S]*?<\/string>/;

  if (existingPattern.test(content)) {
    content = content.replace(existingPattern, newEntry);
  } else {
    const insertIdx = content.lastIndexOf('</resources>');
    if (insertIdx === -1) {
      throw new Error(
        `[CodeSigningPlugin] Could not find </resources> in ${stringsXmlPath}. ` +
          'The file may not be a valid strings.xml.'
      );
    }
    content =
      content.slice(0, insertIdx) + newEntry + '\n' + content.slice(insertIdx);
  }

  fs.writeFileSync(stringsXmlPath, content, 'utf-8');
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
