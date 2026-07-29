/** Mirror of firebase `semanticIdFromName` for create-id preview. */
export function semanticIdFromName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getCallableErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') return fallback;
  const err = error as { code?: string; message?: string; details?: { code?: string } };
  if (err.code === 'functions/already-exists') {
    if (err.details?.code === 'params') {
      return err.message || 'A variant with the same params already exists for this task.';
    }
    return err.message || 'A document with this id already exists.';
  }
  if (err.code === 'functions/not-found') {
    return err.message || 'Document not found.';
  }
  if (err.code === 'functions/invalid-argument') {
    return err.message || 'Invalid input.';
  }
  if (err.code === 'functions/permission-denied') {
    return 'You do not have permission to perform this action.';
  }
  return err.message || fallback;
}
