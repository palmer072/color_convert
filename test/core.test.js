import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hexToRgb, rgbToHex, rgbToHsl, hslToRgb, hexToHsl, hslToHex } from '../src/index.js';

test('hexToRgb parses #rrggbb', () => {
  assert.deepEqual(hexToRgb('#ff8800'), [255, 136, 0]);
});

test('hexToRgb works without leading hash', () => {
  assert.deepEqual(hexToRgb('00ff00'), [0, 255, 0]);
});

test('hexToRgb expands #rgb to #rrggbb', () => {
  assert.deepEqual(hexToRgb('#f80'), [255, 136, 0]);
});

test('hexToRgb is case-insensitive', () => {
  assert.deepEqual(hexToRgb('#FFAABB'), [255, 170, 187]);
});

test('hexToRgb throws on invalid characters', () => {
  assert.throws(() => hexToRgb('#zzzzzz'), /invalid hex/);
});

test('hexToRgb throws on wrong length', () => {
  assert.throws(() => hexToRgb('#abcd'), /3 or 6 hex digits/);
});

test('rgbToHex formats a lowercase padded string', () => {
  assert.equal(rgbToHex([0, 0, 0]), '#000000');
  assert.equal(rgbToHex([255, 255, 255]), '#ffffff');
});

test('rgbToHex zero-pads single-digit channels', () => {
  assert.equal(rgbToHex([15, 15, 15]), '#0f0f0f');
});

test('rgbToHex accepts {r,g,b} object form', () => {
  assert.equal(rgbToHex({ r: 1, g: 2, b: 3 }), '#010203');
});

test('rgbToHex clamps out-of-range inputs', () => {
  assert.equal(rgbToHex([300, -10, 128]), '#ff0080');
});

test('hex -> rgb -> hex is exact for a representative sample', () => {
  const samples = [
    '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
    '#ff8800', '#0a0a0a', '#102030', '#abcdef', '#012345',
    '#a1b2c3', '#f0e1d2', '#112233', '#332211', '#fedcba',
  ];
  for (const h of samples) {
    assert.equal(rgbToHex(hexToRgb(h)), h);
  }
});

test('hex -> rgb -> hex is exact for every short-form color', () => {
  const hex = '0123456789abcdef';
  for (let i = 0; i < 16; i++) {
    for (let j = 0; j < 16; j++) {
      for (let k = 0; k < 16; k++) {
        const short = '#' + hex[i] + hex[j] + hex[k];
        const expanded = '#' + hex[i] + hex[i] + hex[j] + hex[j] + hex[k] + hex[k];
        assert.equal(rgbToHex(hexToRgb(short)), expanded);
      }
    }
  }
});

test('rgbToHsl black is grayscale (h=0, s=0, l=0)', () => {
  assert.deepEqual(rgbToHsl([0, 0, 0]), [0, 0, 0]);
});

test('rgbToHsl white is grayscale (h=0, s=0, l=100)', () => {
  assert.deepEqual(rgbToHsl([255, 255, 255]), [0, 0, 100]);
});

test('rgbToHsl mid gray has zero saturation', () => {
  assert.deepEqual(rgbToHsl([128, 128, 128]), [0, 0, 50]);
});

test('rgbToHsl pure red is 0deg, 100%, 50%', () => {
  assert.deepEqual(rgbToHsl([255, 0, 0]), [0, 100, 50]);
});

test('rgbToHsl pure green is 120deg', () => {
  assert.deepEqual(rgbToHsl([0, 255, 0]), [120, 100, 50]);
});

test('rgbToHsl pure blue is 240deg', () => {
  assert.deepEqual(rgbToHsl([0, 0, 255]), [240, 100, 50]);
});

test('rgbToHsl accepts {r,g,b} object form', () => {
  assert.deepEqual(rgbToHsl({ r: 255, g: 0, b: 0 }), [0, 100, 50]);
});

test('hslToRgb pure red round-trips', () => {
  assert.deepEqual(hslToRgb([0, 100, 50]), [255, 0, 0]);
});

test('hslToRgb pure green round-trips', () => {
  assert.deepEqual(hslToRgb([120, 100, 50]), [0, 255, 0]);
});

test('hslToRgb pure blue round-trips', () => {
  assert.deepEqual(hslToRgb([240, 100, 50]), [0, 0, 255]);
});

test('hslToRgb black and white', () => {
  assert.deepEqual(hslToRgb([0, 0, 0]), [0, 0, 0]);
  assert.deepEqual(hslToRgb([0, 0, 100]), [255, 255, 255]);
});

test('hslToRgb normalizes hue to [0, 360)', () => {
  assert.deepEqual(hslToRgb([360, 100, 50]), [255, 0, 0]);
  assert.deepEqual(hslToRgb([480, 100, 50]), [0, 255, 0]);
  assert.deepEqual(hslToRgb([-120, 100, 50]), [0, 0, 255]);
});

test('hslToRgb accepts {h,s,l} object form', () => {
  assert.deepEqual(hslToRgb({ h: 0, s: 100, l: 50 }), [255, 0, 0]);
});

test('hslToRgb clamps s and l to [0, 100]', () => {
  assert.deepEqual(hslToRgb([0, 200, 0]), [0, 0, 0]);
});

test('rgb -> hsl -> rgb is stable for pure primary colors', () => {
  for (const rgb of [[255, 0, 0], [0, 255, 0], [0, 0, 255]]) {
    const back = hslToRgb(rgbToHsl(rgb));
    assert.deepEqual(back, rgb);
  }
});

test('rgb -> hsl -> rgb is stable for black and white', () => {
  assert.deepEqual(hslToRgb(rgbToHsl([0, 0, 0])), [0, 0, 0]);
  assert.deepEqual(hslToRgb(rgbToHsl([255, 255, 255])), [255, 255, 255]);
});

test('hexToHsl convenience wrapper', () => {
  assert.deepEqual(hexToHsl('#ff0000'), [0, 100, 50]);
});

test('hslToHex convenience wrapper', () => {
  assert.equal(hslToHex([0, 100, 50]), '#ff0000');
});
