# color-convert

Exact hex / rgb / hsl color conversions for JavaScript. No floating-point
rounding churn, no dependencies.

```js
import { hexToRgb, rgbToHex, rgbToHsl, hslToRgb, hexToHsl, hslToHex } from 'color-convert';

hexToRgb('#ff8800');          // [255, 136, 0]
rgbToHex([255, 136, 0]);      // '#ff8800'
rgbToHsl([255, 136, 0]);      // [29, 100, 50]
hslToRgb([29, 100, 50]);      // [255, 136, 0]
hexToHsl('#ff8800');          // [29, 100, 50]
hslToHex([29, 100, 50]);     // '#ff8800'
```

## Why

Most color libraries expose raw floats and let rounding accumulate across
round-trips: `rgbToHex(hexToRgb('#0a0a0a'))` comes back as `#090909` because
some intermediate got truncated. This library avoids that by keeping the
hex and rgb paths in integer arithmetic (string parsing and bit-free integer
math, no `[0,1]` scaling) and by only rounding at the *boundary* of hsl,
where a real division is unavoidable.

The trade-off: hsl is not perfectly invertible in general, because it is a
lossy representation. We round hsl outputs to whole numbers (hue in degrees,
saturation and lightness as 0–100 percentages) and accept that a handful of
rgb values will not survive `rgb -> hsl -> rgb`. The tests assert stability
only for the colors where it is mathematically guaranteed: pure primaries,
black, and white.

## Inputs and edge cases

- `hexToRgb` accepts `#rgb`, `#rrggbb`, with or without a leading `#`,
  case-insensitive. It rejects 4- or 8-digit (alpha) forms, percentages,
  and anything that is not hex digits. Whitespace around the string is
  trimmed.
- `rgbToHex` accepts either `[r, g, b]` or `{r, g, b}`. Channels are clamped
to `[0, 255]` and rounded, so out-of-range or fractional inputs produce a
valid hex string rather than throwing.
- `rgbToHsl` and `hslToRgb` accept the same two shapes. `hslToRgb`
  normalizes hue with `((h % 360) + 360) % 360`, so `h = 480` and
  `h = -120` both work. Saturation and lightness are clamped to `[0, 100]`.
- Grayscale inputs (r = g = b) produce `h = 0, s = 0`. Hue is undefined for
  gray; we pick `0` rather than returning `null` or `NaN`, so the output is
  always three finite integers.

## Exports

All six functions are named exports from the package root:

- `hexToRgb(hex) -> [r, g, b]`
- `rgbToHex(rgb) -> string`
- `rgbToHsl(rgb) -> [h, s, l]`
- `hslToRgb(hsl) -> [r, g, b]`
- `hexToHsl(hex) -> [h, s, l]`
- `hslToHex(hsl) -> string`
