export class RepackInitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RepackInitError';
    this.stack = undefined;
  }
}
