import { getMimeType } from '../getMimeType';

describe('getMimeType', () => {
  it('should return correct MIME types for various file extensions', () => {
    expect(getMimeType('script.js')).toBe('application/javascript');
    expect(getMimeType('main.bundle')).toBe('application/javascript');
    expect(getMimeType('main.bundle.map')).toBe('application/json');
    expect(getMimeType('hot-update.js')).toBe('application/javascript');
    expect(getMimeType('image.png')).toBe('image/png');
    expect(getMimeType('unknownfile.unknown')).toBe('text/plain');
  });
});
