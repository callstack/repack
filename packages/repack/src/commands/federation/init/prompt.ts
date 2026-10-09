import readline from 'node:readline';

/** Injected question function — tests stub it; the command wires readline. */
export type Ask = (question: string) => Promise<string>;

export type DivergenceAction = 'align' | 'ignore' | 'cancel';

/** Real prompt channel: node:readline, one interface per question. */
export function createReadlineAsk(): Ask {
  return (question) =>
    new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      let answered = false;
      rl.question(question, (answer) => {
        answered = true;
        rl.close();
        resolve(answer);
      });
      // A closed input (non-interactive run) answers nothing: the defaults
      // ([y/N] decline, [c]ancel) keep the no-write side safe.
      rl.on('close', () => {
        if (!answered) resolve('');
      });
    });
}

/** Apply confirmation gate — the default is No. */
export async function askApplyChanges(
  ask: Ask,
  fileCount: number
): Promise<boolean> {
  const answer = (
    await ask(
      `Apply ${fileCount} file change${fileCount === 1 ? '' : 's'}? [y/N]: `
    )
  )
    .trim()
    .toLowerCase();
  return answer === 'y' || answer === 'yes';
}

/** Divergence decision — an unusable answer cancels, never guesses a write. */
export async function askDivergenceAction(ask: Ask): Promise<DivergenceAction> {
  const answer = (
    await ask(
      'Shared versions diverge between the host and existing remotes. ' +
        '[a]lign remote pins to the host, [i]gnore and continue, or [c]ancel? [c]: '
    )
  )
    .trim()
    .toLowerCase();
  if (answer === 'a' || answer === 'align') return 'align';
  if (answer === 'i' || answer === 'ignore') return 'ignore';
  return 'cancel';
}
