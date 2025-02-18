interface MoveElementBeforeConfig<T> {
  beforeElement: string | RegExp;
  elementToMove: string | RegExp;
  getElement?: (item: T) => string;
}

function matchElement(
  value: string | undefined,
  tester: string | RegExp
): boolean {
  if (!value) return false;
  if (typeof tester === 'string') return value === tester;
  return tester.test(value);
}

export function moveElementBefore<T>(
  array: T[],
  {
    beforeElement,
    elementToMove,
    getElement = (item) => item as string,
  }: MoveElementBeforeConfig<T>
) {
  const sourceIndex = array.findIndex((item) =>
    matchElement(getElement(item), elementToMove)
  );

  if (sourceIndex === -1) return;

  const targetIndex = array.findIndex((item) =>
    matchElement(getElement(item), beforeElement)
  );

  if (targetIndex === -1) return;

  // target order already achieved
  if (sourceIndex < targetIndex) return;

  // Remove source element from its current position
  const [moveElement] = array.splice(sourceIndex, 1);

  // Insert source element right before the target element
  array.splice(targetIndex, 0, moveElement);
}
