/** Removes terminal colour codes, e.g. from code frames and compiler messages. */
export const stripAnsi = (value: string) =>
  value.replace(/\u001b\[[0-9;]*m/g, '');
