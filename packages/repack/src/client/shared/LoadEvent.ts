export class LoadEvent {
  target: { src: string };

  constructor(public type: string, src: string, public error?: Error | any) {
    this.target = { src };
  }
}
