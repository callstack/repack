import { cancel, isCancel } from '@clack/prompts';

export function cancelPromptAndExit(message?: string) {
  cancel(message ?? 'Operation cancelled.');
  process.exit(0);
}

export function checkCancelPrompt<T>(value: unknown) {
  if (isCancel(value)) {
    cancelPromptAndExit();
  }

  return value as T;
}
