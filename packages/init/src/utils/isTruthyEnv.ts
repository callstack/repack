export const isTruthyEnv = (env: string | undefined) => {
  return !!env && env !== 'false' && env !== '0';
};
