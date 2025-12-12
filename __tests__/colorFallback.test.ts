import { describe, it, expect } from 'vitest';
import { resolveEventColorStyle, getDefaultColorByType, EventType } from '../types';

describe('title color resolution', () => {
  it('uses the custom title color when provided (override category)', () => {
    const style = resolveEventColorStyle(EventType.DUE, 'green');
    expect(style.bg).toContain('green');
  });

  it('keeps category default when color is missing (legacy fallback)', () => {
    const style = resolveEventColorStyle(EventType.CLOSING);
    expect(style.bg).toContain('amber');
    expect(getDefaultColorByType(EventType.CLOSING)).toBe('yellow');
  });

  it('returns consistent default mapping per category', () => {
    expect(getDefaultColorByType(EventType.DUE)).toBe('red');
    expect(getDefaultColorByType(EventType.PUSH)).toBe('blue');
  });
});
