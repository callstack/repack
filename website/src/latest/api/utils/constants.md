# Constants

## ASSET_EXTENSIONS

Array of all supported asset extensions.

```ts
type ASSET_EXTENSIONS = string[];
```

Contains all extensions from `SCALABLE_ASSETS` plus additional extensions for:

- Video formats: `m4v`, `mov`, `mp4`, `mpeg`, `mpg`, `webm`
- Audio formats: `aac`, `aiff`, `caf`, `m4a`, `mp3`, `wav`
- Document formats: `html`, `pdf`, `yaml`, `yml`
- Font formats: `otf`, `ttf`
- Other: `zip`, `obj`

## SCALABLE_ASSETS

Array of file extensions for scalable image assets.

```ts
type SCALABLE_ASSETS = string[];
```

Contains the following extensions: `bmp`, `gif`, `jpg`, `jpeg`, `png`, `psd`, `svg`, `webp`, `tiff`.

## SCALABLE_RESOLUTIONS

Array of supported asset resolutions.

```ts
type SCALABLE_RESOLUTIONS = string[];
```

Contains the following resolutions: `0.75`, `1`, `1.5`, `2`, `3`, `4`.
