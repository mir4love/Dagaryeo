import type { NormalizedRect, PixelRect } from './types';

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

export function pixelToNormalized(
  rect: PixelRect,
  imageWidth: number,
  imageHeight: number,
): NormalizedRect {
  if (imageWidth <= 0 || imageHeight <= 0) {
    throw new Error('Image dimensions must be positive.');
  }

  const x = clamp(rect.x / imageWidth);
  const y = clamp(rect.y / imageHeight);
  const right = clamp((rect.x + rect.width) / imageWidth);
  const bottom = clamp((rect.y + rect.height) / imageHeight);

  return {x, y, width: Math.max(0, right - x), height: Math.max(0, bottom - y)};
}

export function normalizedToPixel(
  rect: NormalizedRect,
  imageWidth: number,
  imageHeight: number,
): PixelRect {
  return {
    x: Math.round(clamp(rect.x) * imageWidth),
    y: Math.round(clamp(rect.y) * imageHeight),
    width: Math.round(clamp(rect.width, 0, 1 - clamp(rect.x)) * imageWidth),
    height: Math.round(clamp(rect.height, 0, 1 - clamp(rect.y)) * imageHeight),
  };
}

export function containTransform(
  imageWidth: number,
  imageHeight: number,
  viewWidth: number,
  viewHeight: number,
) {
  const scale = Math.min(viewWidth / imageWidth, viewHeight / imageHeight);
  const renderedWidth = imageWidth * scale;
  const renderedHeight = imageHeight * scale;
  return {
    scale,
    offsetX: (viewWidth - renderedWidth) / 2,
    offsetY: (viewHeight - renderedHeight) / 2,
    renderedWidth,
    renderedHeight,
  };
}

export function viewRectToNormalized(
  rect: PixelRect,
  imageWidth: number,
  imageHeight: number,
  viewWidth: number,
  viewHeight: number,
): NormalizedRect {
  const transform = containTransform(imageWidth, imageHeight, viewWidth, viewHeight);
  return pixelToNormalized(
    {
      x: (rect.x - transform.offsetX) / transform.scale,
      y: (rect.y - transform.offsetY) / transform.scale,
      width: rect.width / transform.scale,
      height: rect.height / transform.scale,
    },
    imageWidth,
    imageHeight,
  );
}

export function normalizedToViewRect(
  rect: NormalizedRect,
  imageWidth: number,
  imageHeight: number,
  viewWidth: number,
  viewHeight: number,
): PixelRect {
  const transform = containTransform(imageWidth, imageHeight, viewWidth, viewHeight);
  const pixel = normalizedToPixel(rect, imageWidth, imageHeight);
  return {
    x: transform.offsetX + pixel.x * transform.scale,
    y: transform.offsetY + pixel.y * transform.scale,
    width: pixel.width * transform.scale,
    height: pixel.height * transform.scale,
  };
}
