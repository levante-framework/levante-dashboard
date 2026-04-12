function parseTaskIds(value?: string): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((taskId) => taskId.trim())
    .filter((taskId) => taskId.length > 0);
}

export const KIOSK_MODE_ENABLED = import.meta.env.VITE_KIOSK_MODE === 'true';
export const KIOSK_SITE_ID = import.meta.env.VITE_KIOSK_SITE_ID ?? '';
export const KIOSK_SITE_NAME = import.meta.env.VITE_KIOSK_SITE_NAME ?? '';
export const KIOSK_GROUP_ID = import.meta.env.VITE_KIOSK_GROUP_ID ?? '';
export const KIOSK_GROUP_NAME = import.meta.env.VITE_KIOSK_GROUP_NAME ?? '';
export const KIOSK_TASK_IDS = parseTaskIds(import.meta.env.VITE_KIOSK_TASK_IDS);
