# Debugging

Debugging is an important part of development. To debug apps using Re.Pack, you can use the following methods:

## Debugging configuration & build

To debug build process and compilation time, compilation transformations, module dependencies, duplicate modules, and bundle size analysis, you can use the [Rsdoctor plugin](/docs/guides/bundle-analysis).

## Debugging runtime

Re.pack has first-class support for debugging. You can use React Native DevTools to debug your app. Take a look at our detailed guide [here](/docs/features/devtools).

## Other

You can always pass `--verbose` flag to the `bundle` or `start` command to get more detailed logs:

```bash
npx react-native bundle --verbose
```

```bash
npx react-native start --verbose
```
