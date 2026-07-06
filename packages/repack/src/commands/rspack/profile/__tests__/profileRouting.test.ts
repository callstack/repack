import { getRspackVersion } from '../../../../helpers/index.js';
import { applyProfile } from '../index.js';
import { applyProfile as applyProfileV1_4 } from '../profile-1.4.js';
import { applyProfile as applyProfileV2 } from '../profile-2.js';
import { applyProfile as applyProfileLegacy } from '../profile-legacy.js';

jest.mock('../../../../helpers/index.js', () => ({
  ...jest.requireActual('../../../../helpers/index.js'),
  getRspackVersion: jest.fn(),
}));
jest.mock('../profile-2.js', () => ({ applyProfile: jest.fn() }));
jest.mock('../profile-1.4.js', () => ({ applyProfile: jest.fn() }));
jest.mock('../profile-legacy.js', () => ({ applyProfile: jest.fn() }));

const getRspackVersionMock = jest.mocked(getRspackVersion);
const applyProfileV2Mock = jest.mocked(applyProfileV2);
const applyProfileV1_4Mock = jest.mocked(applyProfileV1_4);
const applyProfileLegacyMock = jest.mocked(applyProfileLegacy);

describe('profiling handler routing', () => {
  it('routes to the rspack 2 handler for rspack 2', async () => {
    getRspackVersionMock.mockReturnValue('2.0.0');
    await applyProfile('OVERVIEW');
    expect(applyProfileV2Mock).toHaveBeenCalledTimes(1);
    expect(applyProfileV1_4Mock).not.toHaveBeenCalled();
    expect(applyProfileLegacyMock).not.toHaveBeenCalled();
  });

  it('routes to the rspack 2 handler for rspack 2 prereleases', async () => {
    getRspackVersionMock.mockReturnValue('2.0.0-beta.3');
    await applyProfile('OVERVIEW');
    expect(applyProfileV2Mock).toHaveBeenCalledTimes(1);
  });

  it('routes to the 1.4 handler for rspack >= 1.4', async () => {
    getRspackVersionMock.mockReturnValue('1.4.11');
    await applyProfile('OVERVIEW');
    expect(applyProfileV1_4Mock).toHaveBeenCalledTimes(1);
    expect(applyProfileV2Mock).not.toHaveBeenCalled();
    expect(applyProfileLegacyMock).not.toHaveBeenCalled();
  });

  it('routes to the legacy handler for rspack < 1.4', async () => {
    getRspackVersionMock.mockReturnValue('1.3.9');
    await applyProfile('OVERVIEW');
    expect(applyProfileLegacyMock).toHaveBeenCalledTimes(1);
    expect(applyProfileV2Mock).not.toHaveBeenCalled();
    expect(applyProfileV1_4Mock).not.toHaveBeenCalled();
  });

  it('routes to the legacy handler when the rspack version is unresolvable', async () => {
    getRspackVersionMock.mockReturnValue(null);
    await applyProfile('OVERVIEW');
    expect(applyProfileLegacyMock).toHaveBeenCalledTimes(1);
    expect(applyProfileV2Mock).not.toHaveBeenCalled();
    expect(applyProfileV1_4Mock).not.toHaveBeenCalled();
  });

  it('forwards trace layer and output to the selected handler', async () => {
    getRspackVersionMock.mockReturnValue('2.1.0');
    await applyProfile('OVERVIEW', 'logger', 'stderr');
    expect(applyProfileV2Mock).toHaveBeenCalledWith(
      'OVERVIEW',
      'logger',
      'stderr'
    );
  });
});
