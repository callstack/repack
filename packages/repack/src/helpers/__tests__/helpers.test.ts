import { moveElementBefore } from '../helpers.js';

describe('moveElementBefore', () => {
  it('should move element before target using string matcher', () => {
    const array = ['a', 'b', 'c', 'd'];
    moveElementBefore(array, { beforeElement: 'b', elementToMove: 'd' });
    expect(array).toEqual(['a', 'd', 'b', 'c']);
  });

  it('should move element before target using RegExp matcher', () => {
    const array = ['foo1', 'bar1', 'foo2', 'bar2'];
    moveElementBefore(array, { beforeElement: /^bar/, elementToMove: 'foo2' });
    expect(array).toEqual(['foo1', 'foo2', 'bar1', 'bar2']);
  });

  it('should not modify array if source element is not found', () => {
    const array = ['a', 'b', 'c'];
    const original = [...array];
    moveElementBefore(array, { beforeElement: 'b', elementToMove: 'x' });
    expect(array).toEqual(original);
  });

  it('should not modify array if target element is not found', () => {
    const array = ['a', 'b', 'c'];
    const original = [...array];
    moveElementBefore(array, { beforeElement: 'x', elementToMove: 'c' });
    expect(array).toEqual(original);
  });

  it('should not modify array if source is already before target', () => {
    const array = ['a', 'b', 'c'];
    const original = [...array];
    moveElementBefore(array, { beforeElement: 'c', elementToMove: 'b' });
    expect(array).toEqual(original);
  });

  it('should move element using custom element getter', () => {
    const array = [
      { id: 'a', value: 1 },
      { id: 'b', value: 2 },
      { id: 'c', value: 3 },
    ];
    moveElementBefore(array, {
      beforeElement: 'b',
      elementToMove: 'c',
      getElement: (item) => item.id,
    });
    expect(array).toEqual([
      { id: 'a', value: 1 },
      { id: 'c', value: 3 },
      { id: 'b', value: 2 },
    ]);
  });
});
