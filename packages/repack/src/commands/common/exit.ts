export class NoStackError extends Error {
  constructor(message: string) {
    super(message);
    this.name = `${message}`;

    this.stack = undefined;
  }
}
