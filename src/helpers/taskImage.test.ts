import { describe, expect, it } from 'vitest';
import { TASK_IMAGE_BASE_URL } from '@/constants/bucket';
import { onTaskImageError, resolveTaskImage, TASK_IMAGE_FALLBACK } from './taskImage';

describe('resolveTaskImage', () => {
  it('falls back to Levante logo when image is empty', () => {
    expect(resolveTaskImage(undefined)).toEqual({ src: TASK_IMAGE_FALLBACK });
    expect(resolveTaskImage(null)).toEqual({ src: TASK_IMAGE_FALLBACK });
    expect(resolveTaskImage('')).toEqual({ src: TASK_IMAGE_FALLBACK });
    expect(resolveTaskImage('   ')).toEqual({ src: TASK_IMAGE_FALLBACK });
  });

  it('prefers sibling webp and keeps raster as fallback', () => {
    const png = 'https://storage.googleapis.com/bucket/tasks/sre.png';
    expect(resolveTaskImage(png)).toEqual({
      src: 'https://storage.googleapis.com/bucket/tasks/sre.webp',
      fallbackSrc: png,
    });

    const jpg = 'https://example.com/cover.JPG?x=1';
    expect(resolveTaskImage(jpg)).toEqual({
      src: 'https://example.com/cover.webp?x=1',
      fallbackSrc: jpg,
    });
  });

  it('prepends the default folder for bare filenames', () => {
    expect(resolveTaskImage('sre.png')).toEqual({
      src: `${TASK_IMAGE_BASE_URL}/sre.webp`,
      fallbackSrc: `${TASK_IMAGE_BASE_URL}/sre.png`,
    });

    expect(resolveTaskImage('sre.jpg')).toEqual({
      src: `${TASK_IMAGE_BASE_URL}/sre.webp`,
      fallbackSrc: `${TASK_IMAGE_BASE_URL}/sre.jpg`,
    });

    expect(resolveTaskImage('sre.webp')).toEqual({
      src: `${TASK_IMAGE_BASE_URL}/sre.webp`,
    });

    expect(resolveTaskImage('sre')).toEqual({
      src: `${TASK_IMAGE_BASE_URL}/sre.webp`,
      fallbackSrc: `${TASK_IMAGE_BASE_URL}/sre.png`,
    });
  });

  it('returns the original when already webp or unknown extension', () => {
    const webp = 'https://storage.googleapis.com/bucket/tasks/sre.webp';
    expect(resolveTaskImage(webp)).toEqual({ src: webp });

    const svg = '/icons/task.svg';
    expect(resolveTaskImage(svg)).toEqual({ src: svg });
  });
});

describe('onTaskImageError', () => {
  it('falls back to raster then Levante logo', () => {
    const img = document.createElement('img');
    const raster = 'https://example.com/cover.png';
    const event = { target: img } as unknown as Event;

    onTaskImageError(event, raster);
    expect(img.src).toContain(raster);

    onTaskImageError(event, raster);
    expect(img.getAttribute('src')).toBe(TASK_IMAGE_FALLBACK);
  });

  it('falls back to Levante logo when no raster fallback exists', () => {
    const img = document.createElement('img');
    const event = { target: img } as unknown as Event;

    onTaskImageError(event);
    expect(img.getAttribute('src')).toBe(TASK_IMAGE_FALLBACK);
  });

  it('ignores events without an image target', () => {
    expect(() => onTaskImageError({ target: null } as unknown as Event)).not.toThrow();
  });
});
