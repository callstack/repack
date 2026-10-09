import type { init } from '@module-federation/enhanced/runtime';

// Module Federation 0.17 renamed FederationHost and FederationRuntimePlugin to
// ModuleFederation and ModuleFederationRuntimePlugin. Deriving both from `init`
// keeps the published typings working with every supported version.
export type MFInstance = ReturnType<typeof init>;

export type MFRuntimePlugin = NonNullable<
  Parameters<typeof init>[0]['plugins']
>[number];
