import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  embedPublicKey,
  embedPublicKeyInPlist,
  embedPublicKeyInStringsXml,
  findAndroidStringsXmlPath,
  findIOSInfoPlistPath,
} from '../CodeSigningPlugin/embedPublicKey.js';

const SAMPLE_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0Z3VS5JJcds3xfn/ygWe
FJwMGMIZ+PbSmUXzpFbz0YjJZHQmRm9LTjg0Ij5kbBgB/TDH5mvIhkP6sBTVKCh
-----END PUBLIC KEY-----`;

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'repack-cs-test-'));
}

function cleanupTempDir(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

describe('embedPublicKeyInPlist', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tmpDir);
  });

  it('adds RepackPublicKey to an Info.plist without existing key', () => {
    const plistPath = path.join(tmpDir, 'Info.plist');
    fs.writeFileSync(
      plistPath,
      `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>CFBundleName</key>
\t<string>TestApp</string>
</dict>
</plist>`
    );

    embedPublicKeyInPlist(SAMPLE_PUBLIC_KEY, plistPath);
    const result = fs.readFileSync(plistPath, 'utf-8');

    expect(result).toContain('<key>RepackPublicKey</key>');
    expect(result).toContain('-----BEGIN PUBLIC KEY-----');
    expect(result).toContain('-----END PUBLIC KEY-----');
    expect(result).toContain('</dict>');
    expect(result).toContain('</plist>');
  });

  it('updates existing RepackPublicKey in Info.plist', () => {
    const plistPath = path.join(tmpDir, 'Info.plist');
    fs.writeFileSync(
      plistPath,
      `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
<dict>
\t<key>RepackPublicKey</key>
\t<string>OLD_KEY_CONTENT</string>
\t<key>CFBundleName</key>
\t<string>TestApp</string>
</dict>
</plist>`
    );

    embedPublicKeyInPlist(SAMPLE_PUBLIC_KEY, plistPath);
    const result = fs.readFileSync(plistPath, 'utf-8');

    expect(result).not.toContain('OLD_KEY_CONTENT');
    expect(result).toContain('-----BEGIN PUBLIC KEY-----');
    expect(result).toContain('<key>CFBundleName</key>');
  });

  it('returns false and skips write when key is already up-to-date', () => {
    const plistPath = path.join(tmpDir, 'Info.plist');
    fs.writeFileSync(
      plistPath,
      `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
<dict>
</dict>
</plist>`
    );

    embedPublicKeyInPlist(SAMPLE_PUBLIC_KEY, plistPath);
    const mtimeBefore = fs.statSync(plistPath).mtimeMs;

    const written = embedPublicKeyInPlist(SAMPLE_PUBLIC_KEY, plistPath);
    const mtimeAfter = fs.statSync(plistPath).mtimeMs;

    expect(written).toBe(false);
    expect(mtimeAfter).toBe(mtimeBefore);
  });

  it('throws when plist has no </dict> tag', () => {
    const plistPath = path.join(tmpDir, 'Info.plist');
    fs.writeFileSync(plistPath, '<plist><broken></plist>');

    expect(() => embedPublicKeyInPlist(SAMPLE_PUBLIC_KEY, plistPath)).toThrow(
      /Could not find <\/dict>/
    );
  });

  it('escapes XML special characters in the public key', () => {
    const plistPath = path.join(tmpDir, 'Info.plist');
    fs.writeFileSync(
      plistPath,
      `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
<dict>
</dict>
</plist>`
    );

    embedPublicKeyInPlist('key<with>&special', plistPath);
    const result = fs.readFileSync(plistPath, 'utf-8');

    expect(result).toContain('key&lt;with&gt;&amp;special');
  });
});

describe('embedPublicKeyInStringsXml', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tmpDir);
  });

  it('adds RepackPublicKey to an existing strings.xml', () => {
    const xmlPath = path.join(tmpDir, 'strings.xml');
    fs.writeFileSync(
      xmlPath,
      `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">TestApp</string>
</resources>`
    );

    embedPublicKeyInStringsXml(SAMPLE_PUBLIC_KEY, xmlPath);
    const result = fs.readFileSync(xmlPath, 'utf-8');

    expect(result).toContain('name="RepackPublicKey"');
    expect(result).toContain('translatable="false"');
    expect(result).toContain('-----BEGIN PUBLIC KEY-----');
    expect(result).toContain('</resources>');
    expect(result).toContain('name="app_name"');
  });

  it('updates existing RepackPublicKey in strings.xml', () => {
    const xmlPath = path.join(tmpDir, 'strings.xml');
    fs.writeFileSync(
      xmlPath,
      `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="RepackPublicKey" translatable="false">OLD_KEY</string>
    <string name="app_name">TestApp</string>
</resources>`
    );

    embedPublicKeyInStringsXml(SAMPLE_PUBLIC_KEY, xmlPath);
    const result = fs.readFileSync(xmlPath, 'utf-8');

    expect(result).not.toContain('OLD_KEY');
    expect(result).toContain('-----BEGIN PUBLIC KEY-----');
    expect(result).toContain('name="app_name"');
  });

  it('creates strings.xml if it does not exist', () => {
    const valuesDir = path.join(tmpDir, 'res', 'values');
    const xmlPath = path.join(valuesDir, 'strings.xml');

    embedPublicKeyInStringsXml(SAMPLE_PUBLIC_KEY, xmlPath);
    const result = fs.readFileSync(xmlPath, 'utf-8');

    expect(result).toContain('<?xml version="1.0" encoding="utf-8"?>');
    expect(result).toContain('<resources>');
    expect(result).toContain('name="RepackPublicKey"');
    expect(result).toContain('</resources>');
  });

  it('returns false and skips write when key is already up-to-date', () => {
    const xmlPath = path.join(tmpDir, 'strings.xml');
    fs.writeFileSync(
      xmlPath,
      `<?xml version="1.0" encoding="utf-8"?>
<resources>
</resources>`
    );

    embedPublicKeyInStringsXml(SAMPLE_PUBLIC_KEY, xmlPath);
    const mtimeBefore = fs.statSync(xmlPath).mtimeMs;

    const written = embedPublicKeyInStringsXml(SAMPLE_PUBLIC_KEY, xmlPath);
    const mtimeAfter = fs.statSync(xmlPath).mtimeMs;

    expect(written).toBe(false);
    expect(mtimeAfter).toBe(mtimeBefore);
  });

  it('throws when strings.xml has no </resources> tag', () => {
    const xmlPath = path.join(tmpDir, 'strings.xml');
    fs.writeFileSync(xmlPath, '<broken>content</broken>');

    expect(() =>
      embedPublicKeyInStringsXml(SAMPLE_PUBLIC_KEY, xmlPath)
    ).toThrow(/Could not find <\/resources>/);
  });
});

describe('findIOSInfoPlistPath', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tmpDir);
  });

  it('finds Info.plist in ios/<AppName>/ directory', () => {
    const appDir = path.join(tmpDir, 'ios', 'MyApp');
    fs.mkdirSync(appDir, { recursive: true });
    const plistPath = path.join(appDir, 'Info.plist');
    fs.writeFileSync(plistPath, '<plist></plist>');

    expect(findIOSInfoPlistPath(tmpDir)).toBe(plistPath);
  });

  it('skips Pods and build directories', () => {
    const podsDir = path.join(tmpDir, 'ios', 'Pods');
    fs.mkdirSync(podsDir, { recursive: true });
    fs.writeFileSync(path.join(podsDir, 'Info.plist'), '<plist></plist>');

    const buildDir = path.join(tmpDir, 'ios', 'build');
    fs.mkdirSync(buildDir, { recursive: true });
    fs.writeFileSync(path.join(buildDir, 'Info.plist'), '<plist></plist>');

    expect(findIOSInfoPlistPath(tmpDir)).toBeNull();
  });

  it('returns null when ios directory does not exist', () => {
    expect(findIOSInfoPlistPath(tmpDir)).toBeNull();
  });
});

describe('findAndroidStringsXmlPath', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tmpDir);
  });

  it('finds strings.xml at standard location', () => {
    const valuesDir = path.join(
      tmpDir,
      'android',
      'app',
      'src',
      'main',
      'res',
      'values'
    );
    fs.mkdirSync(valuesDir, { recursive: true });
    const xmlPath = path.join(valuesDir, 'strings.xml');
    fs.writeFileSync(xmlPath, '<resources></resources>');

    expect(findAndroidStringsXmlPath(tmpDir)).toBe(xmlPath);
  });

  it('returns null when strings.xml does not exist', () => {
    expect(findAndroidStringsXmlPath(tmpDir)).toBeNull();
  });
});

describe('embedPublicKey', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tmpDir);
  });

  it('embeds public key in both iOS and Android files', () => {
    const keyPath = path.join(tmpDir, 'code-signing.pem.pub');
    fs.writeFileSync(keyPath, SAMPLE_PUBLIC_KEY);

    const iosAppDir = path.join(tmpDir, 'ios', 'TestApp');
    fs.mkdirSync(iosAppDir, { recursive: true });
    const plistPath = path.join(iosAppDir, 'Info.plist');
    fs.writeFileSync(
      plistPath,
      `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
<dict>
\t<key>CFBundleName</key>
\t<string>TestApp</string>
</dict>
</plist>`
    );

    const androidValuesDir = path.join(
      tmpDir,
      'android',
      'app',
      'src',
      'main',
      'res',
      'values'
    );
    fs.mkdirSync(androidValuesDir, { recursive: true });
    const stringsPath = path.join(androidValuesDir, 'strings.xml');
    fs.writeFileSync(
      stringsPath,
      `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">TestApp</string>
</resources>`
    );

    const result = embedPublicKey({
      publicKeyPath: keyPath,
      projectRoot: tmpDir,
    });

    expect(result.ios.modified).toBe(true);
    expect(result.ios.path).toBe(plistPath);
    expect(result.android.modified).toBe(true);
    expect(result.android.path).toBe(stringsPath);

    const plistContent = fs.readFileSync(plistPath, 'utf-8');
    expect(plistContent).toContain('RepackPublicKey');

    const stringsContent = fs.readFileSync(stringsPath, 'utf-8');
    expect(stringsContent).toContain('RepackPublicKey');
  });

  it('uses custom native project paths when provided', () => {
    const keyPath = path.join(tmpDir, 'key.pub');
    fs.writeFileSync(keyPath, SAMPLE_PUBLIC_KEY);

    const customPlistPath = path.join(tmpDir, 'custom', 'Info.plist');
    fs.mkdirSync(path.dirname(customPlistPath), { recursive: true });
    fs.writeFileSync(
      customPlistPath,
      `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
<dict>
</dict>
</plist>`
    );

    const customStringsPath = path.join(tmpDir, 'custom', 'strings.xml');
    fs.writeFileSync(
      customStringsPath,
      `<?xml version="1.0" encoding="utf-8"?>
<resources>
</resources>`
    );

    const result = embedPublicKey({
      publicKeyPath: keyPath,
      projectRoot: tmpDir,
      iosInfoPlistPath: customPlistPath,
      androidStringsXmlPath: customStringsPath,
    });

    expect(result.ios.modified).toBe(true);
    expect(result.ios.path).toBe(customPlistPath);
    expect(result.android.modified).toBe(true);
    expect(result.android.path).toBe(customStringsPath);
  });

  it('handles missing native project files gracefully', () => {
    const keyPath = path.join(tmpDir, 'key.pub');
    fs.writeFileSync(keyPath, SAMPLE_PUBLIC_KEY);

    const result = embedPublicKey({
      publicKeyPath: keyPath,
      projectRoot: tmpDir,
    });

    expect(result.ios.modified).toBe(false);
    expect(result.android.modified).toBe(false);
  });

  it('reports errors without crashing', () => {
    const keyPath = path.join(tmpDir, 'key.pub');
    fs.writeFileSync(keyPath, SAMPLE_PUBLIC_KEY);

    const brokenPlistPath = path.join(tmpDir, 'broken.plist');
    fs.writeFileSync(brokenPlistPath, '<plist><broken></plist>');

    const result = embedPublicKey({
      publicKeyPath: keyPath,
      projectRoot: tmpDir,
      iosInfoPlistPath: brokenPlistPath,
    });

    expect(result.ios.modified).toBe(false);
    expect(result.ios.error).toContain('Could not find </dict>');
  });
});
