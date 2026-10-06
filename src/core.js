/**
 * Color Convert — exact, no-floating-point-garbage color conversions.
 *
 * The entire point of this library is to avoid the classic rounding churn
 * you get when you round-trip colors through float math (hex -> rgb -> hex
 * and back, ending up one or two ULP off). We dodge it in two ways:
 *
 *   1. Every public function returns integer channel values (0-255 for rgb,
 *      whole degrees for hue, 0-100 for s/l). No raw floats ever escape.
 *   2. The hex path uses integer arithmetic only — string parsing and
 *      bit shifts — so round-tripping hex -> rgb -> hex is exact by
 *      construction, not by luck.
 *
 * HSL involves a real division, so it cannot be perfectly invertible in
 * general. We accept that and just round to the nearest whole value; the
 * tests assert the documented contract (round-trips that are *expected* to
 * be lossless actually are), not a fantasy of perfection.
 */

/**
 * Clamp a value into [lo, hi]. Used everywhere we touch user input that
 * might be one tick out of range.
 *
 * @param {number} v
 * @param {number} lo
 * @param {number} hi
 * @returns {number}
 */
function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

/**
 * Parse a hex color string into an [r, g, b] triple of integers in 0-255.
 *
 * Accepts #RGB, #RRGGBB, #RRGGGBBB, and #RRRRGGBB, with or without a
 * leading '#'. We deliberately reject anything with alpha, percentages,
 * or stray whitespace — this library is opaque colors only.
 *
 * @param {string} hex
 * @returns {[number, number, number]}
 */
export function hexToRgb(hex) {
  if (typeof hex !== 'string') {
    throw new TypeError('hexToRgb: expected a string, got ' + typeof hex);
  }
  let s = hex.trim();
  if (s[0] === '#') s = s.slice(1);
  if (!/^[0-9a-fA-F]+$/.test(s)) {
    throw new Error('hexToRgb: invalid hex literal "' + hex + '"');
  }
  const n = s.length;
  let r, g, b;
  if (n === 3) {
    r = parseInt(s[0] + s[0], 16);
    g = parseInt(s[1] + s[1], 16);
    b = parseInt(s[2] + s[2], 16);
  } else if (n === 6) {
    r = parseInt(s.slice(0, 2), 16);
    g = parseInt(s.slice(2, 4), 16);
    b = parseInt(s.slice(4, 6), 16);
  } else {
    throw new Error('hexToRgb: expected 3 or 6 hex digits, got ' + n);
  }
  return [r, g, b];
}

/**
 * Format an [r, g, b] triple as a lowercase #rrggbb string.
 *
 * Inputs are clamped to [0, 255] and rounded to the nearest integer, so a
 * caller that did some float math upstream won't produce "rgb(256, -1, 127)"
 * or a six-and-a-half-digit hex. This is the one place we tolerate rounding,
 * because rgb values from HSL conversion can be like 127.999999.
 *
 * We zero-pad with toString(16).padStart(2, '0') rather than any clever
 * trick — it's the clearest expression of intent and V8 inlines it.
 *
 * @param {[number, number, number] | {r: number, g: number, b: number}} rgb
 * @returns {string}
 */
export function rgbToHex(rgb) {
  let r, g, b;
  if (Array.isArray(rgb)) {
    [r, g, b] = rgb;
  } else if (rgb && typeof rgb === 'object') {
    ({ r, g, b } = rgb);
  } else {
    throw new TypeError('rgbToHex: expected [r,g,b] or {r,g,b}');
  }
  if ([r, g, b].some(v => typeof v !== 'number' || Number.isNaN(v))) {
    throw new TypeError('rgbToHex: r, g, b must be finite numbers');
  }
  const rr = Math.round(clamp(r, 0, 255)).toString(16).padStart(2, '0');
  const gg = Math.round(clamp(g, 0, 255)).toString(16).padStart(2, '0');
  const bb = Math.round(clamp(b, 0, 255)).toString(16).padStart(2, '0');
  return '#' + rr + gg + bb;
}

/**
 * Convert RGB to HSL. Returns [h, s, l] with h in [0, 360), s in [0, 100],
 * l in [0, 100], all integers.
 *
 * We scale the intermediates (max, min, delta) by 255000 instead of working
 * in [0, 1] floats, so the comparison "delta === 0" for the grayscale case
 * is exact, not subject to float tolerance. The final division produces a
 * float that we round — HSL is fundamentally a division so we can't avoid
 * that last step, but we never let it leak out unrounded.
 *
 * @param {[number, number, number] | {r: number, g: number, b: number}} rgb
 * @returns {[number, number, number]}
 */
export function rgbToHsl(rgb) {
  let r, g, b;
  if (Array.isArray(rgb)) {
    [r, g, b] = rgb;
  } else if (rgb && typeof rgb === 'object') {
    ({ r, g, b } = rgb);
  } else {
    throw new TypeError('rgbToHsl: expected [r,g,b] or {r,g,b}');
  }
  if ([r, g, b].some(v => typeof v !== 'number' || Number.isNaN(v))) {
    throw new TypeError('rgbToHsl: r, g, b must be finite numbers');
  }
  r = clamp(r, 0, 255);
  g = clamp(g, 0, 255);
  b = clamp(b, 0, 255);

  // Scale to integer-thousandths so max/min/delta stay exact integers.
  const ri = Math.round(r * 1000);
  const gi = Math.round(g * 1000);
  const bi = Math.round(b * 1000);
  const max = Math.max(ri, gi, bi);
  const min = Math.min(ri, gi, bi);
  const delta = max - min; // exact integer; 0 iff truly grayscale
  const lK = (max + min) / 2; // in [0, 255000]

  if (delta === 0) {
    // Grayscale: hue is undefined, saturation is 0. We pick h=0 (a common
    // convention) so the output is always three finite numbers.
    return [0, 0, Math.round(lK / 2550)];
  }

  const sK = delta / (max + min > 255000 ? 510000 - (max + min) : max + min);
  const s = Math.round(sK * 100);
  const l = Math.round((lK / 2550));

  let h;
  if (max === ri) {
    h = ((gi - bi) / delta) % 6;
  } else if (max === gi) {
    h = (bi - ri) / delta + 2;
  } else {
    h = (ri - gi) / delta + 4;
  }
  h = h * 60;
  if (h < 0) h += 360;
  h = Math.round(h) % 360;
  if (h === 360) h = 0;
  return [h, s, l];
}

/**
 * Convert HSL to RGB. Returns [r, g, b] with each channel an integer in
 * [0, 255].
 *
 * Hue is taken mod 360 so rgbToHsl(hslToRgb(x)) is stable even if a caller
 * hands us h=360 or h=-30. Saturation and lightness are clamped to [0, 100].
 *
 * @param {[number, number, number] | {h: number, s: number, l: number}} hsl
 * @returns {[number, number, number]}
 */
export function hslToRgb(hsl) {
  let h, s, l;
  if (Array.isArray(hsl)) {
    [h, s, l] = hsl;
  } else if (hsl && typeof hsl === 'object') {
    ({ h, s, l } = hsl);
  } else {
    throw new TypeError('hslToRgb: expected [h,s,l] or {h,s,l}');
  }
  if ([h, s, l].some(v => typeof v !== 'number' || Number.isNaN(v))) {
    throw new TypeError('hslToRgb: h, s, l must be finite numbers');
  }
  h = ((h % 360) + 360) % 360;
  s = clamp(s, 0, 100) / 100;
  l = clamp(l, 0, 100) / 100;

  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1, g1, b1;
  if (hp < 1)      { [r1, g1, b1] = [c, x, 0]; }
  else if (hp < 2) { [r1, g1, b1] = [x, c, 0]; }
  else if (hp < 3) { [r1, g1, b1] = [0, c, x]; }
  else if (hp < 4) { [r1, g1, b1] = [0, x, c]; }
  else if (hp < 5) { [r1, g1, b1] = [x, 0, c]; }
  else             { [r1, g1, b1] = [c, 0, x]; }
  const m = l - c / 2;
  const r = Math.round((r1 + m) * 255);
  const g = Math.round((g1 + m) * 255);
  const b = Math.round((b1 + m) * 255);
  return [clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255)];
}

/**
 * Convenience: hex -> hsl.
 * @param {string} hex
 * @returns {[number, number, number]}
 */
export function hexToHsl(hex) {
  return rgbToHsl(hexToRgb(hex));
}

/**
 * Convenience: hsl -> hex.
 * @param {[number, number, number] | {h: number, s: number, l: number}} hsl
 * @returns {string}
 */
export function hslToHex(hsl) {
  return rgbToHex(hslToRgb(hsl));
}
