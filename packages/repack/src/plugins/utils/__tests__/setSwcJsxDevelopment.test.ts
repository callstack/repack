import { setSwcJsxDevelopment } from '../setSwcJsxDevelopment.js';

const SWC_LOADER = 'builtin:swc-loader';

function swcOptions(development?: boolean) {
  return {
    sourceMaps: true,
    jsc: {
      parser: { syntax: 'ecmascript' },
      transform: {
        legacyDecorator: true,
        react: {
          runtime: 'automatic',
          importSource: 'react',
          ...(development !== undefined && { development }),
        },
      },
    },
  };
}

describe('setSwcJsxDevelopment', () => {
  it.each([true, false])(
    'sets development to %s on a rule-level loader',
    (development) => {
      const rules = [{ loader: SWC_LOADER, options: swcOptions() }];

      setSwcJsxDevelopment(rules, development);

      expect(rules).toEqual([
        { loader: SWC_LOADER, options: swcOptions(development) },
      ]);
    }
  );

  it('sets development on a use object', () => {
    const rules = [{ use: { loader: SWC_LOADER, options: swcOptions() } }];

    setSwcJsxDevelopment(rules, true);

    expect(rules).toEqual([
      { use: { loader: SWC_LOADER, options: swcOptions(true) } },
    ]);
  });

  it('sets development only on swc loaders in a use array', () => {
    const babelLoader = { loader: 'babel-loader', options: { presets: [] } };
    const rules = [
      {
        use: [
          'string-loader',
          babelLoader,
          { loader: SWC_LOADER, options: swcOptions() },
        ],
      },
    ];

    setSwcJsxDevelopment(rules, true);

    expect(rules).toEqual([
      {
        use: [
          'string-loader',
          babelLoader,
          { loader: SWC_LOADER, options: swcOptions(true) },
        ],
      },
    ]);
    expect(rules[0].use[1]).toBe(babelLoader);
  });

  it('walks nested oneOf and rules', () => {
    const nestedRules = (options: object) => [
      { oneOf: [{ rules: [{ loader: SWC_LOADER, options }] }] },
      { rules: [{ oneOf: [{ use: { loader: SWC_LOADER, options } }] }] },
    ];
    const rules = nestedRules(swcOptions());

    setSwcJsxDevelopment(rules, true);

    expect(rules).toEqual(nestedRules(swcOptions(true)));
  });

  it('skips empty rule and use entries', () => {
    const rules = [null, undefined, false, { use: [null, undefined] }];

    expect(() => setSwcJsxDevelopment(rules, true)).not.toThrow();
  });

  it.each([true, false])(
    'keeps an explicit development: %s',
    (explicitDevelopment) => {
      const rules = [
        { loader: SWC_LOADER, options: swcOptions(explicitDevelopment) },
      ];

      setSwcJsxDevelopment(rules, !explicitDevelopment);

      expect(rules).toEqual([
        { loader: SWC_LOADER, options: swcOptions(explicitDevelopment) },
      ]);
    }
  );

  it('leaves swc options without a react transform untouched', () => {
    const options = { jsc: { parser: { syntax: 'typescript' } } };
    const rules = [{ loader: SWC_LOADER, options }];

    setSwcJsxDevelopment(rules, true);

    expect(rules[0].options).toBe(options);
    expect(options).toEqual({ jsc: { parser: { syntax: 'typescript' } } });
  });

  it('leaves other loaders untouched', () => {
    const rules = [{ loader: 'other-loader', options: swcOptions() }];

    setSwcJsxDevelopment(rules, true);

    expect(rules).toEqual([{ loader: 'other-loader', options: swcOptions() }]);
  });

  it('copies shared options and use entries instead of mutating them', () => {
    const sharedOptions = swcOptions();
    const sharedLoader = { loader: SWC_LOADER, options: sharedOptions };
    const rules = [
      { loader: SWC_LOADER, options: sharedOptions },
      { use: sharedLoader },
      { use: [sharedLoader] },
    ];

    setSwcJsxDevelopment(rules, true);

    expect(sharedOptions).toEqual(swcOptions());
    expect(sharedLoader.options).toBe(sharedOptions);
    expect(rules).toEqual([
      { loader: SWC_LOADER, options: swcOptions(true) },
      { use: { loader: SWC_LOADER, options: swcOptions(true) } },
      { use: [{ loader: SWC_LOADER, options: swcOptions(true) }] },
    ]);
  });
});
