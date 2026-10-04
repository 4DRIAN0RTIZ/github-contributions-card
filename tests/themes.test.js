import { describe, it, expect } from 'vitest';
import themes from '../src/themes.js';

const requiredKeys = ['bg', 'fg', 'red', 'green', 'yellow', 'statusBg'];

describe('themes', () => {
  it('exporta al menos un tema', () => {
    expect(Object.keys(themes).length).toBeGreaterThan(0);
  });

  it('cada tema define las claves requeridas', () => {
    for (const [name, theme] of Object.entries(themes)) {
      for (const key of requiredKeys) {
        expect(theme, `tema ${name} sin clave ${key}`).toHaveProperty(key);
      }
    }
  });
});
