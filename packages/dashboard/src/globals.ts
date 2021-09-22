// @ts-ignore
global.process = undefined;

declare module '*.svg' {
  const svg: string;
  export default svg;
}
