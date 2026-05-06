import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import {
  deriveNextCsvFilename,
  downloadCsv,
  formatTimestamp,
  generateColumns,
  parseCsvFile,
  unparseCsvFile,
} from './csv';

const makeFile = (content: string[][]) =>
  new File([content.map((row) => row.join(',')).join('\n')], 'test.csv', { type: 'text/csv' });

describe('deriveNextCsvFilename', () => {
  const date = new Date(2024, 10, 28, 14, 35);
  const slug = '20241128-1435';

  it('returns the filename with .csv when no options are given', () => {
    expect(deriveNextCsvFilename('users.csv', {})).toBe('users.csv');
  });

  it('strips the .csv extension before rebuilding the filename', () => {
    expect(deriveNextCsvFilename('users.csv', { suffix: 'errors' })).toBe('users_errors.csv');
  });

  it('strips the .CSV extension case-insensitively', () => {
    expect(deriveNextCsvFilename('users.CSV', { suffix: 'errors' })).toBe('users_errors.csv');
  });

  it('strips a trailing timestamp slug', () => {
    expect(deriveNextCsvFilename(`users_${slug}.csv`, {})).toBe('users.csv');
  });

  it('strips the _errors suffix', () => {
    expect(deriveNextCsvFilename('users_errors.csv', {})).toBe('users.csv');
  });

  it('strips the _registered suffix', () => {
    expect(deriveNextCsvFilename('users_registered.csv', {})).toBe('users.csv');
  });

  it('strips the _template suffix', () => {
    expect(deriveNextCsvFilename('users_template.csv', {})).toBe('users.csv');
  });

  it('strips a timestamp that follows a suffix', () => {
    expect(deriveNextCsvFilename(`users_errors_${slug}.csv`, {})).toBe('users.csv');
  });

  it('appends the suffix when options.suffix is provided', () => {
    expect(deriveNextCsvFilename('users.csv', { suffix: 'registered' })).toBe('users_registered.csv');
  });

  it('appends a timestamp when options.now is provided', () => {
    expect(deriveNextCsvFilename('users.csv', { now: date })).toBe(`users_${slug}.csv`);
  });

  it('appends suffix before timestamp when both options are provided', () => {
    expect(deriveNextCsvFilename('users.csv', { suffix: 'errors', now: date })).toBe(`users_errors_${slug}.csv`);
  });

  it('replaces an old timestamp with a new one', () => {
    const oldSlug = '20230101-0900';
    expect(deriveNextCsvFilename(`users_${oldSlug}.csv`, { now: date })).toBe(`users_${slug}.csv`);
  });

  it('replaces an old suffix with a new one', () => {
    expect(deriveNextCsvFilename('users_errors.csv', { suffix: 'registered' })).toBe('users_registered.csv');
  });

  it('falls back to the basename when stripping produces an empty name', () => {
    expect(deriveNextCsvFilename('_errors.csv', {})).toBe('_errors.csv');
  });
});

describe('downloadCsv', () => {
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;
  let appendChild: ReturnType<typeof vi.fn>;
  let removeChild: ReturnType<typeof vi.fn>;
  let click: ReturnType<typeof vi.fn>;
  let originalCreateElement: typeof document.createElement;
  let originalAppendChild: typeof document.body.appendChild;
  let originalRemoveChild: typeof document.body.removeChild;

  beforeEach(() => {
    createObjectURL = vi.fn(() => 'mock-blob-url');
    revokeObjectURL = vi.fn();
    appendChild = vi.fn();
    removeChild = vi.fn();
    click = vi.fn();

    global.URL.createObjectURL = createObjectURL;
    global.URL.revokeObjectURL = revokeObjectURL;

    originalCreateElement = document.createElement.bind(document);
    document.createElement = vi.fn((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === 'a') el.click = click;
      return el;
    });

    originalAppendChild = document.body.appendChild.bind(document.body);
    originalRemoveChild = document.body.removeChild.bind(document.body);
    document.body.appendChild = appendChild;
    document.body.removeChild = removeChild;
  });

  afterEach(() => {
    document.createElement = originalCreateElement;
    document.body.appendChild = originalAppendChild;
    document.body.removeChild = originalRemoveChild;
  });

  it('creates a CSV Blob with the correct MIME type', () => {
    downloadCsv('a,b\n1,2', 'test.csv');

    expect(createObjectURL).toHaveBeenCalledOnce();
    const [blob] = createObjectURL.mock.calls[0] as unknown as [Blob];
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('text/csv;charset=utf-8;');
  });

  it('triggers a download via an anchor element with the given filename', () => {
    downloadCsv('a,b\n1,2', 'my-file.csv');

    expect(appendChild).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(removeChild).toHaveBeenCalledOnce();

    const link = appendChild.mock.calls[0]?.[0] as HTMLAnchorElement;
    expect(link.tagName).toBe('A');
    expect(link.getAttribute('href')).toBe('mock-blob-url');
    expect(link.getAttribute('download')).toBe('my-file.csv');
  });

  it('revokes the object URL after triggering the download', () => {
    downloadCsv('a,b\n1,2', 'test.csv');

    expect(revokeObjectURL).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('mock-blob-url');
  });

  it('writes the provided CSV string to the Blob', async () => {
    downloadCsv('id,name\n1,Alice', 'test.csv');

    const [blob] = createObjectURL.mock.calls[0] as unknown as [Blob];
    expect(await blob.text()).toBe('id,name\n1,Alice');
  });
});

describe('formatTimestamp', () => {
  it('formats a date as YYYYMMDD-HHMM', () => {
    expect(formatTimestamp(new Date(2024, 10, 28, 14, 35))).toBe('20241128-1435');
  });

  it('pads a single-digit month with a leading zero', () => {
    expect(formatTimestamp(new Date(2024, 0, 28, 14, 35))).toBe('20240128-1435');
  });

  it('pads a single-digit day with a leading zero', () => {
    expect(formatTimestamp(new Date(2024, 10, 5, 14, 35))).toBe('20241105-1435');
  });

  it('pads single-digit hours with a leading zero', () => {
    expect(formatTimestamp(new Date(2024, 10, 28, 9, 35))).toBe('20241128-0935');
  });

  it('pads single-digit minutes with a leading zero', () => {
    expect(formatTimestamp(new Date(2024, 10, 28, 14, 7))).toBe('20241128-1407');
  });
});

describe('generateColumns', () => {
  it('returns an empty array for an empty object', () => {
    expect(generateColumns({})).toEqual([]);
  });

  it('generates a column with field, startCase header, and correct dataType', () => {
    const result = generateColumns({ firstName: 'Alice', age: 30, isActive: true });
    expect(result).toEqual([
      { field: 'firstName', header: 'First Name', dataType: 'string' },
      { field: 'age', header: 'Age', dataType: 'number' },
      { field: 'isActive', header: 'Is Active', dataType: 'boolean' },
    ]);
  });

  it('uses dataType "date" for Date values', () => {
    const result = generateColumns({ createdAt: new Date() });
    expect(result[0]).toMatchObject({ field: 'createdAt', dataType: 'date' });
  });

  it('uses dataType "object" for plain objects', () => {
    const result = generateColumns({ meta: { foo: 'bar' } });
    expect(result[0]).toMatchObject({ field: 'meta', dataType: 'object' });
  });

  it('omits the orgIds column', () => {
    const result = generateColumns({ orgIds: ['org1'], name: 'Alice' });
    expect(result).toHaveLength(1);
    expect(result[0]?.field).toBe('name');
  });
});

describe('parseCsvFile', () => {
  it('parses a basic CSV into an array of objects', async () => {
    const csv = makeFile([['name,age'], ['Alice,30'], ['Bob,25']]);
    const result = await parseCsvFile(csv);
    expect(result).toEqual([
      { name: 'Alice', age: '30' },
      { name: 'Bob', age: '25' },
    ]);
  });

  it('returns an empty array for a header-only CSV', async () => {
    const csv = makeFile([['name,age']]);
    const result = await parseCsvFile(csv);
    expect(result).toEqual([]);
  });

  describe('header handling', () => {
    it('trims non-normalized header names', async () => {
      for (const header of ['NAME', ' Name ', ' name ']) {
        const csv = makeFile([[`${header},age`], ['Alice,30']]);
        const result = await parseCsvFile(csv);
        expect(result).toEqual([{ [header.trim()]: 'Alice', age: '30' }]);
      }
    });

    it('handles empty header names by producing an empty string value', async () => {
      const csv = makeFile([['', 'age'], ['foo,30']]);
      const result = await parseCsvFile(csv);
      expect(result).toEqual([{ '': 'foo', age: '30' }]);
    });

    it('handles duplicate header names w/ suffix', async () => {
      const csv = makeFile([['name,name,name'], ['foo,bar,baz']]);
      const result = await parseCsvFile(csv);
      expect(result).toEqual([{ name: 'foo', name_1: 'bar', name_2: 'baz' }]);
    });
  });

  describe('value handling', () => {
    it('trims whitespace from values', async () => {
      const csv = makeFile([['id,name'], ['  abc123  , Alice ']]);
      const result = await parseCsvFile(csv);
      expect(result).toEqual([{ id: 'abc123', name: 'Alice' }]);
    });

    it('skips empty and blank lines', async () => {
      const csv = makeFile([['name,age'], ['Alice,30'], [''], ['   '], [','], ['Bob,25']]);
      const result = await parseCsvFile(csv);
      expect(result).toEqual([
        { name: 'Alice', age: '30' },
        { name: 'Bob', age: '25' },
      ]);
    });

    it('handles quoted fields containing commas', async () => {
      const csv = makeFile([['name,address'], ['Alice,"123 Main St, Suite 4"'], ['Bob,"456 Elm St, Apt 2"']]);
      const result = await parseCsvFile(csv);
      expect(result).toEqual([
        { name: 'Alice', address: '123 Main St, Suite 4' },
        { name: 'Bob', address: '456 Elm St, Apt 2' },
      ]);
    });
  });

  describe('error handling', () => {
    it('rejects when the CSV has parse errors (e.g. unterminated quote)', async () => {
      const csv = makeFile([['name,age'], ['"Alice,30'], ['Bob,25'], ['Charlie,35']]);
      const result = await parseCsvFile(csv);
      expect(result).toBeNull();
    });

    it('rejects when the CSV has rows w/ too many columns', async () => {
      const csv = makeFile([['name,value'], ['foo,'], ['bar,bar'], ['baz,baz,baz']]);
      const result = await parseCsvFile(csv);
      expect(result).toBeNull();
    });

    it('rejects when the CSV has rows w/ too few columns', async () => {
      const csv = makeFile([['name,value'], ['foo'], ['bar,bar']]);
      const result = await parseCsvFile(csv);
      expect(result).toBeNull();
    });

    it('returns null when file.text() rejects', async () => {
      // Browsers reject file.text() on cancelled streams or permission errors.
      // parseCsvFile must surface this as the same null contract used for
      // malformed CSVs, so callers don't see an unhandled rejection.
      const file = {
        text: () => Promise.reject(new Error('read failed')),
      } as unknown as File;
      const result = await parseCsvFile(file);
      expect(result).toBeNull();
    });
  });

  describe('options.normalizedHeaders', () => {
    it('maps lowercased headers to normalized names', async () => {
      const csv = makeFile([['ID,FirstName'], ['abc123,Alice']]);
      const result = await parseCsvFile(csv, {
        normalizedHeaders: { id: 'id', firstname: 'firstName' },
      });
      expect(result).toEqual([{ id: 'abc123', firstName: 'Alice' }]);
    });

    it('falls back to the trimmed header when no mapping matches', async () => {
      const csv = makeFile([[' Unknown , name'], ['x,Alice']]);
      const result = await parseCsvFile(csv, {
        normalizedHeaders: { id: 'id' },
      });
      expect(result).toEqual([{ Unknown: 'x', name: 'Alice' }]);
    });
  });

  describe('options.omitColumns', () => {
    it('removes a single named column from every row', async () => {
      const csv = makeFile([['name,age,errors'], ['Alice,30,bad email'], ['Bob,25,']]);
      const result = await parseCsvFile(csv, { omitColumns: ['errors'] });
      expect(result).toEqual([
        { name: 'Alice', age: '30' },
        { name: 'Bob', age: '25' },
      ]);
    });

    it('removes multiple named columns', async () => {
      const csv = makeFile([['name,age,errors,notes'], ['Alice,30,bad email,hi']]);
      const result = await parseCsvFile(csv, { omitColumns: ['errors', 'notes'] });
      expect(result).toEqual([{ name: 'Alice', age: '30' }]);
    });

    it('is a no-op when the named column does not exist', async () => {
      const csv = makeFile([['name,age'], ['Alice,30']]);
      const result = await parseCsvFile(csv, { omitColumns: ['errors'] });
      expect(result).toEqual([{ name: 'Alice', age: '30' }]);
    });

    it('does not mutate keys that are not listed', async () => {
      const csv = makeFile([['name,errors,age'], ['Alice,bad,30']]);
      const result = await parseCsvFile(csv, { omitColumns: ['errors'] });
      expect(Object.keys(result![0]!)).toEqual(['name', 'age']);
    });

    it('applies after normalizedHeaders, so omit keys must use the normalized name', async () => {
      const csv = makeFile([['Errors,name'], ['bad,Alice']]);
      const result = await parseCsvFile(csv, {
        normalizedHeaders: { errors: 'errors' },
        omitColumns: ['errors'],
      });
      expect(result).toEqual([{ name: 'Alice' }]);
    });

    it('treats an empty omitColumns array as a no-op', async () => {
      const csv = makeFile([['name,age'], ['Alice,30']]);
      const result = await parseCsvFile(csv, { omitColumns: [] });
      expect(result).toEqual([{ name: 'Alice', age: '30' }]);
    });

    it('returns null when the CSV has parse errors, even with omitColumns set', async () => {
      const csv = makeFile([['name,errors'], ['"Alice,bad']]);
      const result = await parseCsvFile(csv, { omitColumns: ['errors'] });
      expect(result).toBeNull();
    });
  });
});

describe('unparseCsvFile', () => {
  it('unparses an array of objects into a CSV string', () => {
    const data = [
      { name: 'Alice', age: '30' },
      { name: 'Bob', age: '25' },
    ];
    const result = unparseCsvFile(data);
    expect(result).toEqual('name,age\nAlice,30\nBob,25');
  });

  it('returns an empty string for empty data when no keys are provided', () => {
    expect(unparseCsvFile([])).toEqual('');
  });

  it('serializes non-string values (numbers, booleans, null, arrays) using Papa defaults', () => {
    const data = [
      {
        name: 'Alice',
        age: 30,
        isActive: true,
        nickname: null,
        singleTag: ['org1'],
        emptyTags: [],
        tags: ['org1', 'org2', 'org3'],
      },
    ];
    const result = unparseCsvFile(data);
    expect(result).toEqual(
      'name,age,isActive,nickname,singleTag,emptyTags,tags\nAlice,30,true,,org1,,"org1,org2,org3"',
    );
  });

  describe('keys parameter', () => {
    it('orders columns according to the provided keys', () => {
      const data = [
        { name: 'Alice', age: '30' },
        { name: 'Bob', age: '25' },
      ];
      const result = unparseCsvFile(data, ['age', 'name']);
      expect(result).toEqual('age,name\n30,Alice\n25,Bob');
    });

    it('appends extraneous keys (not in keys) to the end in their original order', () => {
      const data = [{ name: 'Alice', age: '30', email: 'a@example.com' }];
      const result = unparseCsvFile(data, ['email']);
      expect(result).toEqual('email,name,age\na@example.com,Alice,30');
    });

    it('includes provided keys not present in the data with empty values', () => {
      const data = [{ name: 'Alice', age: '30' }];
      const result = unparseCsvFile(data, ['name', 'age', 'email']);
      expect(result).toEqual('name,age,email\nAlice,30,');
    });

    it('uses the data row key order when an empty keys array is provided', () => {
      const data = [{ name: 'Alice', age: '30' }];
      const result = unparseCsvFile(data, []);
      expect(result).toEqual('name,age\nAlice,30');
    });

    it('returns a header row (no data rows) when data is empty but keys are provided', () => {
      expect(unparseCsvFile([], ['name', 'age'])).toEqual('name,age\n');
    });

    it('quotes empty-data headers that contain commas or quotes', () => {
      expect(unparseCsvFile([], ['na,me', 'a"ge'])).toEqual('"na,me","a""ge"\n');
    });
  });
});
