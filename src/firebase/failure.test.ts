import { describe, expect, it } from 'vitest';
import { isNameTakenError } from '@/firebase/failure';

describe('isNameTakenError', () => {
  it('matches an already-exists functions code', () => {
    expect(isNameTakenError({ code: 'functions/already-exists', message: 'taken' })).toBe(true);
  });

  it('matches an org duplicate thrown as an internal error', () => {
    const error = new Error('Class "class 2" already exists') as Error & {
      code: string;
    };
    error.code = 'functions/internal';
    expect(isNameTakenError(error)).toBe(true);
  });

  it('leaves other failures as product errors', () => {
    const error = new Error('deadline exceeded') as Error & { code: string };
    error.code = 'functions/internal';
    expect(isNameTakenError(error)).toBe(false);
    expect(isNameTakenError(new Error('Failed to fetch'))).toBe(false);
  });
});
