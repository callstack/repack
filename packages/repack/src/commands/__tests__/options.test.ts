import {
  bundleCommandOptions,
  federationDevCommandOptions,
  federationInitCommandOptions,
  startCommandOptions,
} from '../options.js';

describe.each([
  ['start', startCommandOptions],
  ['bundle', bundleCommandOptions],
])('%s command options', (_, options) => {
  const bundlerOption = options.find(
    (option) => option.name === '--bundler <string>'
  );

  test.each(['rspack', 'webpack'])('accepts the %s bundler', (bundler) => {
    expect(bundlerOption?.parse?.(bundler)).toBe(bundler);
  });

  test('rejects an unsupported bundler', () => {
    expect(() => bundlerOption?.parse?.('metro')).toThrow(
      'Invalid bundler "metro". Expected "rspack" or "webpack".'
    );
  });
});

describe('--standalone registration', () => {
  test.each([
    ['start', startCommandOptions],
    ['bundle', bundleCommandOptions],
  ])('%s command exposes --standalone as a boolean flag', (_, options) => {
    const standaloneOption = options.find(
      (option) => option.name === '--standalone'
    );
    // Boolean commander flag: no parse, no default — presence means true.
    expect(standaloneOption).toBeDefined();
    expect(standaloneOption?.parse).toBeUndefined();
  });
});

describe('federation-init command options', () => {
  test('exposes --name, --yes and --standalone', () => {
    const names = federationInitCommandOptions.map((option) => option.name);
    expect(names).toContain('--name <remote>');
    expect(names).toContain('--yes');
    expect(names).toContain('--standalone');
  });

  test('--yes and --standalone are boolean flags', () => {
    for (const name of ['--yes', '--standalone']) {
      const option = federationInitCommandOptions.find(
        (candidate) => candidate.name === name
      ) as { name: string; parse?: unknown } | undefined;
      // Boolean commander flags: no parse, no default — presence means true.
      expect(option).toBeDefined();
      expect(option?.parse).toBeUndefined();
    }
  });
});

describe('federation-dev launch options', () => {
  test('exposes --launch, --no-launch and --device', () => {
    const names = federationDevCommandOptions.map((option) => option.name);
    expect(names).toContain('--launch');
    expect(names).toContain('--no-launch');
    expect(names).toContain('--device <id>');
  });

  test('--launch and --no-launch are boolean flags; --device passes the id through', () => {
    for (const name of ['--launch', '--no-launch']) {
      const option = federationDevCommandOptions.find(
        (candidate) => candidate.name === name
      ) as { name: string; parse?: unknown } | undefined;
      // Boolean commander flags: no parse, no default — the command reads
      // presence as true / false / absent (wizard decides the absent case).
      expect(option).toBeDefined();
      expect(option?.parse).toBeUndefined();
    }
    const device = federationDevCommandOptions.find(
      (candidate) => candidate.name === '--device <id>'
    ) as { parse?: (value: string) => unknown } | undefined;
    expect(device?.parse?.('emulator-5554')).toBe('emulator-5554');
  });
});
