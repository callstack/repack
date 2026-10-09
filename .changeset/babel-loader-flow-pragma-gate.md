---
"@callstack/repack": patch
---

Send only sources carrying an `@flow` pragma through hermes-parser in `babelLoader`, matching
`babel-plugin-syntax-hermes-parser` with the React Native preset's default
`parseLangTypes: 'flow'`. hermes-parser converts its own AST into a Babel AST, and that conversion
is quadratic in the number of sibling nodes, so a single prebuilt minified dependency could add
minutes to a build. Set `hermesParserOverrides.flow` to `'all'` to keep parsing every file with
hermes-parser.
