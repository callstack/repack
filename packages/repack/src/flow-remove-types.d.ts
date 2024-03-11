declare module 'flow-remove-types' {
  declare const removeTypes: (
    code: string,
    options: {
      all?: boolean;
      pretty?: boolean;
      ignoreUninitializedFields?: boolean;
    }
  ) => {
    toString(): string;
    generateMap(): {
      version: number;
      sources: string[];
      names: string[];
      mappings: string;
    };
  };
  export = removeTypes;
}
