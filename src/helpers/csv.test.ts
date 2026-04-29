import { describe, it, expect } from 'vitest';
import { generateColumns, parseCsvFile, unparseCsvFile } from './csv';

const makeFile = (content: string[][]) =>
  new File([content.map((row) => row.join(',')).join('\n')], 'test.csv', { type: 'text/csv' });

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
