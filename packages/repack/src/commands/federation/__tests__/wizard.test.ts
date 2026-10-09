import { PassThrough } from 'node:stream';
import type { FederationConfig } from '../configFile.js';
import type { PlannedApp } from '../devPlan.js';
import type { WizardAnswers, WizardOutcome } from '../wizard.js';
import { runWizard } from '../wizard.js';

// Clack-shaped stub injected through the loadClack seam — the wizard never
// hard-imports @clack/prompts on the test path, so no virtual mocks needed.
interface ClackStub {
  multiselect: jest.Mock;
  select: jest.Mock;
  confirm: jest.Mock;
  text: jest.Mock;
  cancel: jest.Mock;
  isCancel: jest.Mock;
}

const CANCEL = Symbol('cancel');

const makeClack = (): ClackStub => ({
  multiselect: jest.fn(),
  select: jest.fn(),
  confirm: jest.fn(),
  text: jest.fn(),
  cancel: jest.fn(),
  isCancel: jest.fn((value: unknown) => value === CANCEL),
});

const config = {
  host: { manifest: './build/host', root: '.', port: 8081 },
  remotes: {
    MiniApp: {
      manifest: './build/mini',
      root: '.',
      port: 8082,
      standalone: true,
    },
    SideApp: { manifest: './build/side', root: '.', port: 8083 },
  },
} as unknown as FederationConfig;

const planned = [
  { name: 'host', role: 'host', port: 8081 },
  { name: 'MiniApp', role: 'remote', port: 8082, standalone: true },
  { name: 'SideApp', role: 'remote', port: 8083 },
] as unknown as PlannedApp[];

const runWith = async (
  clack: ClackStub,
  overrides: {
    config?: FederationConfig;
    planned?: PlannedApp[];
    launch?: boolean;
    onOutput?: (chunk: string) => void;
  } = {}
): Promise<WizardOutcome> => {
  const output = new PassThrough();
  output.on('data', (chunk) => overrides.onOutput?.(String(chunk)));
  return runWizard({
    config: overrides.config ?? config,
    planned: overrides.planned ?? planned,
    ...(overrides.launch === undefined ? {} : { launch: overrides.launch }),
    loadClack: async () => clack as never,
    input: new PassThrough(),
    output,
  });
};

describe('runWizard (clack path)', () => {
  let clack: ClackStub;

  beforeEach(() => {
    clack = makeClack();
  });

  it('maps the answer sequence to wizard answers in spec order', async () => {
    clack.multiselect.mockResolvedValue(['MiniApp']);
    clack.select.mockResolvedValue('ios');
    clack.confirm
      .mockResolvedValueOnce(true) // launch: yes
      .mockResolvedValueOnce(true) // host port
      .mockResolvedValueOnce(true) // MiniApp port
      .mockResolvedValueOnce(false); // standalone: no
    const outcome = await runWith(clack);
    expect(outcome).toEqual({
      status: 'completed',
      answers: {
        session: { remotes: ['MiniApp'] },
        platform: 'ios',
        launch: true,
        ports: { host: 8081, MiniApp: 8082 },
      },
    });
    // One execution path: the first block is a remotes multiselect over the
    // declared remotes only (host is never optional).
    expect(clack.multiselect).toHaveBeenCalledTimes(1);
    const options = (
      clack.multiselect.mock.calls[0] as unknown as [
        { options: Array<{ value: string }> },
      ]
    )[0].options;
    expect(options.map((option) => option.value)).toEqual([
      'MiniApp',
      'SideApp',
    ]);
    // Answers feed the same planning record the non-interactive path uses.
    expect(
      Object.keys(outcome.status === 'completed' ? outcome.answers.ports : {})
    ).toEqual(['host', 'MiniApp']);
  });

  it('confirms launch right after the platform step, defaulting to yes', async () => {
    clack.multiselect.mockResolvedValue(['MiniApp']);
    clack.select.mockResolvedValue('ios');
    clack.confirm.mockResolvedValue(true);
    await runWith(clack);
    // The FIRST confirm is the launch question — it precedes the port loop.
    const first = clack.confirm.mock.calls[0] as unknown as [
      { message: string; initialValue?: boolean },
    ];
    expect(first[0].message).toContain('Launch the app on ios');
    expect(first[0].initialValue).toBe(true);
    const messages = clack.confirm.mock.calls.map(
      (call) => (call as unknown as [{ message: string }])[0].message
    );
    expect(messages[1]).toContain('port');
  });

  it('launch answer "no" records launch false', async () => {
    clack.multiselect.mockResolvedValue(['MiniApp']);
    clack.select.mockResolvedValue('ios');
    clack.confirm
      .mockResolvedValueOnce(false) // launch: no
      .mockResolvedValue(true); // ports + standalone: defaults
    const outcome = await runWith(clack);
    expect(outcome.status === 'completed' && outcome.answers.launch).toBe(
      false
    );
  });

  it('an explicit launch answer from the flags is not asked again', async () => {
    clack.multiselect.mockResolvedValue(['MiniApp']);
    clack.select.mockResolvedValue('ios');
    clack.confirm.mockResolvedValue(true); // ports + standalone only
    const outcome = await runWith(clack, { launch: false });
    const messages = clack.confirm.mock.calls.map(
      (call) => (call as unknown as [{ message: string }])[0].message
    );
    expect(messages.some((message) => message.includes('Launch'))).toBe(false);
    expect(outcome.status === 'completed' && outcome.answers.launch).toBe(
      false
    );
  });

  it('port override: confirm "no" then text answer wins', async () => {
    clack.multiselect.mockResolvedValue(['MiniApp']);
    clack.select.mockResolvedValue('ios');
    clack.confirm
      .mockResolvedValueOnce(true) // launch: yes
      .mockResolvedValueOnce(false) // host port: override
      .mockResolvedValueOnce(true) // MiniApp port
      .mockResolvedValueOnce(false); // standalone
    clack.text.mockResolvedValue('8090');
    const outcome = await runWith(clack);
    expect(outcome.status === 'completed' && outcome.answers.ports.host).toBe(
      8090
    );
    expect(clack.text).toHaveBeenCalledTimes(1);
  });

  it('platform "all" means no platform override', async () => {
    clack.multiselect.mockResolvedValue(['MiniApp']);
    clack.select.mockResolvedValue('all');
    clack.confirm.mockResolvedValue(true); // all port confirms
    let captured = '';
    const outcome = await runWith(clack, { onOutput: (c) => (captured += c) });
    expect(outcome.status === 'completed' && outcome.answers.platform).toBe(
      undefined
    );
  });

  it('platform "all" skips the launch question and explains why', async () => {
    clack.multiselect.mockResolvedValue(['MiniApp']);
    clack.select.mockResolvedValue('all');
    clack.confirm.mockResolvedValue(true); // ports + standalone only
    let captured = '';
    const outcome = await runWith(clack, { onOutput: (c) => (captured += c) });
    const messages = clack.confirm.mock.calls.map(
      (call) => (call as unknown as [{ message: string }])[0].message
    );
    expect(messages.some((message) => message.includes('Launch'))).toBe(false);
    // Silently skipped as a question, but never silently as a behavior.
    expect(captured).toContain('single platform');
    expect(outcome.status === 'completed' && 'launch' in outcome.answers).toBe(
      false
    );
  });

  it('standalone is confirmed for selected remotes that declare it', async () => {
    clack.multiselect.mockResolvedValue(['MiniApp']);
    clack.select.mockResolvedValue('all');
    clack.confirm
      .mockResolvedValueOnce(true) // host port
      .mockResolvedValueOnce(true) // MiniApp port
      .mockResolvedValueOnce(true); // standalone: yes
    const outcome = await runWith(clack);
    expect(
      outcome.status === 'completed' && outcome.answers.session.standaloneRemote
    ).toBe('MiniApp');
  });

  it('never offers standalone for remotes without the declaration', async () => {
    // SideApp declares no standalone flag and is the only selection.
    clack.multiselect.mockResolvedValue(['SideApp']);
    clack.select.mockResolvedValue('all');
    clack.confirm
      .mockResolvedValueOnce(true) // host port
      .mockResolvedValueOnce(true); // SideApp port
    const outcome = await runWith(clack);
    // No third confirm: the standalone block never ran for SideApp.
    expect(clack.confirm).toHaveBeenCalledTimes(2);
    expect(
      outcome.status === 'completed' && outcome.answers.session.standaloneRemote
    ).toBeUndefined();
  });

  it('cancel returns the cancelled outcome and says so via clack cancel', async () => {
    clack.multiselect.mockResolvedValue(CANCEL);
    const outcome = await runWith(clack);
    expect(outcome).toEqual({ status: 'cancelled' });
    expect(clack.cancel).toHaveBeenCalledTimes(1);
  });
});

describe('runWizard (readline fallback)', () => {
  const feed = (answers: string[]) => {
    const input = new PassThrough();
    // readline/promises consumes lines as they arrive.
    setTimeout(() => input.write(`${answers.join('\n')}\n`), 0);
    return input;
  };

  const runFallback = async (answers: string[]) => {
    const output = new PassThrough();
    let captured = '';
    output.on('data', (chunk) => {
      captured += String(chunk);
    });
    const outcome = await runWizard({
      config,
      planned,
      loadClack: async () => {
        throw new Error('clack unavailable');
      },
      input: feed(answers),
      output,
    });
    return { outcome, captured };
  };

  it('returns the same output shape as the clack path', async () => {
    const { outcome, captured } = await runFallback([
      'MiniApp', // remotes
      'ios', // platform
      'y', // launch: yes
      '', // host port: default
      '8090', // MiniApp port: override
      'n', // standalone
    ]);
    const expected: WizardAnswers = {
      session: { remotes: ['MiniApp'] },
      platform: 'ios',
      launch: true,
      ports: { host: 8081, MiniApp: 8090 },
    };
    expect(outcome).toEqual({ status: 'completed', answers: expected });
    expect(captured).toContain('MiniApp');
    expect(captured).toContain('8081');
    expect(captured).toContain('Launch the app on ios');
  });

  it('launch prompt defaults to yes on an empty answer', async () => {
    const { outcome } = await runFallback([
      'MiniApp', // remotes
      'ios', // platform
      '', // launch: empty = default yes
      '', // host port
      '', // MiniApp port
      'n', // standalone
    ]);
    expect(outcome.status === 'completed' && outcome.answers.launch).toBe(true);
  });

  it('launch "no" records launch false', async () => {
    const { outcome } = await runFallback([
      'MiniApp', // remotes
      'ios', // platform
      'n', // launch: no
      '', // host port
      '', // MiniApp port
      'n', // standalone
    ]);
    expect(outcome.status === 'completed' && outcome.answers.launch).toBe(
      false
    );
  });

  it('platform "all" never asks launch and explains the skip', async () => {
    const { outcome, captured } = await runFallback([
      'MiniApp', // remotes
      '', // platform: all
      '', // host port
      '', // MiniApp port
      'n', // standalone
    ]);
    expect(outcome.status === 'completed' && 'launch' in outcome.answers).toBe(
      false
    );
    expect(captured).toContain('single platform');
    expect(captured).not.toContain('Launch the app on');
  });

  it('empty answers take the defaults (all remotes, all platforms)', async () => {
    // six questions: remotes, platform, three ports, standalone(MiniApp)
    const { outcome } = await runFallback(['', '', '', '', '', 'n']);
    expect(outcome).toEqual({
      status: 'completed',
      answers: {
        session: { remotes: ['MiniApp', 'SideApp'] },
        platform: undefined,
        ports: { host: 8081, MiniApp: 8082, SideApp: 8083 },
      },
    });
  });

  it('EOF on stdin cancels like the clack path', async () => {
    const input = new PassThrough();
    setTimeout(() => input.end(), 0);
    const outcome = await runWizard({
      config,
      planned,
      loadClack: async () => {
        throw new Error('clack unavailable');
      },
      input,
      output: new PassThrough(),
    });
    expect(outcome).toEqual({ status: 'cancelled' });
  });
});
