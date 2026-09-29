import {describe, expect, it} from 'vitest';
import {normalizedToPixel, normalizedToViewRect, viewRectToNormalized} from '../src';

describe('coordinate transforms', () => {
  it('round-trips contain-scaled view coordinates', () => {
    const source = {x: 0.1, y: 0.2, width: 0.3, height: 0.1};
    const view = normalizedToViewRect(source, 4000, 3000, 360, 640);
    const result = viewRectToNormalized(view, 4000, 3000, 360, 640);
    expect(result.x).toBeCloseTo(source.x, 3);
    expect(result.y).toBeCloseTo(source.y, 3);
    expect(result.width).toBeCloseTo(source.width, 3);
    expect(result.height).toBeCloseTo(source.height, 3);
  });

  it('clamps regions to the source image', () => {
    expect(normalizedToPixel({x: 0.9, y: 0.9, width: 0.5, height: 0.5}, 100, 200))
      .toEqual({x: 90, y: 180, width: 10, height: 20});
  });
});
