import { describe, expect, it, vi } from 'vitest';
import { isRetryableStartAssessmentError, startAssessmentWithRetry } from './startAssessmentWithRetry';

describe('isRetryableStartAssessmentError', () => {
  it('returns true for transient Firebase callable codes', () => {
    expect(isRetryableStartAssessmentError({ code: 'functions/internal' })).toBe(true);
    expect(isRetryableStartAssessmentError({ code: 'unavailable' })).toBe(true);
    expect(isRetryableStartAssessmentError({ code: 'deadline-exceeded' })).toBe(true);
  });

  it('returns false for non-retryable errors', () => {
    expect(isRetryableStartAssessmentError({ code: 'permission-denied' })).toBe(false);
    expect(isRetryableStartAssessmentError(new Error('boom'))).toBe(false);
    expect(isRetryableStartAssessmentError(null)).toBe(false);
  });
});

describe('startAssessmentWithRetry', () => {
  it('returns the first successful result', async () => {
    const startAssessment = vi.fn().mockResolvedValue('ok');
    await expect(startAssessmentWithRetry(startAssessment, 0)).resolves.toBe('ok');
    expect(startAssessment).toHaveBeenCalledTimes(1);
  });

  it('retries once on a transient error', async () => {
    const startAssessment = vi.fn().mockRejectedValueOnce({ code: 'functions/internal' }).mockResolvedValueOnce('ok');
    await expect(startAssessmentWithRetry(startAssessment, 0)).resolves.toBe('ok');
    expect(startAssessment).toHaveBeenCalledTimes(2);
  });

  it('does not retry permission errors', async () => {
    const error = { code: 'permission-denied' };
    const startAssessment = vi.fn().mockRejectedValue(error);
    await expect(startAssessmentWithRetry(startAssessment, 0)).rejects.toBe(error);
    expect(startAssessment).toHaveBeenCalledTimes(1);
  });
});
