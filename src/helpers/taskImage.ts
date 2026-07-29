/**
 * Task cover-image URL resolution.
 *
 * Firestore `task.image` may be a full URL, a path, or a bare filename under the
 * assets bucket `task-logos/` folder (`TASK_IMAGE_BASE_URL`).
 *
 * Resolution order for `<TaskImage>` / `resolveTaskImage`:
 * 1. Empty / missing → Levante logo (`TASK_IMAGE_FALLBACK`)
 * 2. Bare filename (no `/`) → prepend `TASK_IMAGE_BASE_URL`
 * 3. Prefer sibling `.webp` when the stored path is `.png` / `.jpg` / `.jpeg` / `.gif`
 *    (or when there is no extension: try `.webp`, then `.png`)
 * 4. On load error → raster fallback, then Levante logo
 *
 * Upload WebP siblings next to existing logos in GCS when available, e.g.
 * `gs://levante-assets-*/task-logos/sre-logo.webp` beside `sre-logo.png`.
 *
 * Prefer the Vue wrapper: `<TaskImage :image="task.image" :alt="task.name" />`.
 */
import { TASK_IMAGE_BASE_URL } from '@/constants/bucket';

export const TASK_IMAGE_FALLBACK = '/LEVANTE/Levante_Logo.png';

const RASTER_EXT_PATTERN = /\.(png|jpe?g|gif)(?=[?#]|$)/i;

export interface TaskImage {
  /** Preferred image URL (WebP when derivable). */
  src: string;
  /** Raster URL used if `src` fails to load. */
  fallbackSrc?: string;
}

function isBareFilename(value: string): boolean {
  return !value.includes('/') && !value.includes('\\') && !/^https?:/i.test(value);
}

function normalizeTaskImagePath(image: string): string {
  if (!isBareFilename(image)) return image;
  return `${TASK_IMAGE_BASE_URL}/${image}`;
}

/** Resolve a task image field into a preferred `src` and optional raster fallback. */
export function resolveTaskImage(image?: string | null): TaskImage {
  const trimmed = image?.trim();
  if (!trimmed) return { src: TASK_IMAGE_FALLBACK };

  const resolved = normalizeTaskImagePath(trimmed);
  const hasExtension = /\.[a-z0-9]+(?=[?#]|$)/i.test(resolved);

  if (!hasExtension) {
    return {
      src: `${resolved}.webp`,
      fallbackSrc: `${resolved}.png`,
    };
  }

  if (!RASTER_EXT_PATTERN.test(resolved)) return { src: resolved };

  return {
    src: resolved.replace(RASTER_EXT_PATTERN, '.webp'),
    fallbackSrc: resolved,
  };
}

/** Swap to raster fallback, then Levante logo, on `<img>` load errors. */
export function onTaskImageError(event: Event, fallbackSrc?: string): void {
  const img = event.target as HTMLImageElement | null;
  if (!img) return;

  const stage = img.dataset.taskImageFallback ?? '0';
  if (stage === '0' && fallbackSrc) {
    img.dataset.taskImageFallback = '1';
    img.src = fallbackSrc;
    return;
  }

  if (stage !== '2') {
    img.dataset.taskImageFallback = '2';
    img.src = TASK_IMAGE_FALLBACK;
  }
}
