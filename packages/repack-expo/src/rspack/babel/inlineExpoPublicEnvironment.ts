type BabelApi = {
  caller(callback: (caller: BabelCaller | undefined) => boolean): boolean;
  types: Record<string, (...args: any[]) => any>;
};

type BabelCaller = {
  isNodeModule?: boolean;
};

type BabelPath = {
  node: any;
  parent: any;
  replaceWith(node: any): void;
};

type InlineExpoPublicEnvironmentOptions = {
  environment: Readonly<Record<string, string>>;
};

export default function inlineExpoPublicEnvironment(
  api: BabelApi,
  options: InlineExpoPublicEnvironmentOptions
) {
  const { types: t } = api;
  const isNodeModule = api.caller((caller) => !!caller?.isNodeModule);

  function isProcessEnv(path: BabelPath): boolean {
    const { object } = path.node;
    if (
      (!t.isMemberExpression(object) &&
        !t.isOptionalMemberExpression(object)) ||
      !t.isIdentifier(object.object) ||
      object.object.name !== 'process'
    ) {
      return false;
    }

    const { property } = object;
    if (!object.computed && t.isIdentifier(property)) {
      return property.name === 'env';
    }
    if (object.computed && t.isStringLiteral(property)) {
      return property.value === 'env';
    }
    return false;
  }

  function getMemberProperty(path: BabelPath): string | undefined {
    const { computed, property } = path.node;
    if (!computed && t.isIdentifier(property)) return property.name;
    if (computed && t.isStringLiteral(property)) return property.value;
    return undefined;
  }

  function isAssignment(path: BabelPath): boolean {
    return (
      t.isAssignmentExpression(path.parent) && path.parent.left === path.node
    );
  }

  function visitMemberExpression(path: BabelPath): void {
    if (isNodeModule || !isProcessEnv(path) || isAssignment(path)) return;

    const key = getMemberProperty(path);
    if (key?.startsWith('EXPO_PUBLIC_')) {
      path.replaceWith(t.valueToNode(options.environment[key]));
    }
  }

  return {
    name: 'repack-expo-inline-public-environment',
    visitor: {
      MemberExpression: visitMemberExpression,
      OptionalMemberExpression: visitMemberExpression,
    },
  };
}
