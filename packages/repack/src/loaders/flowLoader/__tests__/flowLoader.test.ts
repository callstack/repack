import { needsFlowLowering } from '../flowLoader.js';

describe('flowLoader', () => {
  describe('needsFlowLowering', () => {
    it.each([
      ['component declaration', 'export component View(ref: Ref) {}'],
      ['default component', 'export default component Foo<T>(x: T) {}'],
      ['hook declaration', 'hook useFoo(): number { return 1; }'],
      ['enum', 'export enum Status { Active, Paused }'],
      ['typed enum', 'enum Mode of string { A = "a" }'],
      ['match expression', "const s = match (x) { 0 => 'none', _ => 'some' };"],
      ['match with a call', 'return match (Math.abs(x)) { _ => 1 };'],
      ['multi-line match', 'return match (\n  props.value\n) {\n  _ => 1,\n};'],
    ])('sends a %s to the React Native parser', (_, source) => {
      expect(needsFlowLowering(source)).toBe(true);
    });

    it.each([
      ['type annotations', 'const x: number = 1;\ntype T = { a: string };'],
      ['component types', 'type C = component(ref: Ref<View>);'],
      ['String#match', 'if (value.match(/re/)) { run(); }'],
      ['a `components` identifier', 'const components = [];'],
      ['an `enums` identifier', 'const enums = {};'],
    ])('keeps %s on flow-remove-types', (_, source) => {
      expect(needsFlowLowering(source)).toBe(false);
    });
  });
});
