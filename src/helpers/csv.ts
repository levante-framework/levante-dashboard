import _startCase from 'lodash/startCase';
import * as Papa from 'papaparse';

export interface CsvColumn {
  field: string;
  header: string;
  dataType: string;
}

/** @deprecated Use parseCsvFile instead */
export const csvFileToJson = async (file: File): Promise<any[]> => {
  const text = await file.text();
  const results = await new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header: string): string => {
        if (header.trim().toLowerCase() === 'id') return 'id';
        return header.trim();
      },
      transform: (value: string, field: string | number): string => {
        // Ensure field is treated as string if it's a number (column index)
        if (typeof field === 'number') field = String(field);
        if (field === 'id') {
          return value.trim();
        }
        return value;
      },
      complete: (res) => resolve(res),
      error: (err: any) => reject(err),
    });
  });
  return (results as { data: any[] }).data;
};

/**
 * Generate CSV columns from a JSON object.
 * @param rawJson The JSON object to generate columns from.
 * @returns An array of CsvColumn objects.
 */
export function generateColumns(rawJson: Record<string, unknown>): CsvColumn[] {
  const columns: CsvColumn[] = [];
  Object.keys(rawJson).forEach((colKey) => {
    // Hide orgIds column
    if (colKey === 'orgIds') return;

    let dataType: string = typeof rawJson[colKey];
    if (dataType === 'object') {
      if (rawJson[colKey] instanceof Date) dataType = 'date';
    }
    columns.push({
      field: colKey,
      header: _startCase(colKey),
      dataType,
    });
  });
  return columns;
}

/**
 * Parse a CSV file to an array of objects where each non-empty CSV row becomes
 * an object w/ properties per CSV column
 * @param file The CSV file to parse
 * @param options.normalizedHeaders Optional map of lowercase-to-normalized headers
 * @param options.omitColumns Optional array of column names to omit from the results
 * @returns The parsed data, or null if the CSV is malformed
 */
export const parseCsvFile = async (
  file: File,
  options: {
    normalizedHeaders?: Record<string, string>;
    omitColumns?: string[];
  } = {},
): Promise<Record<string, string>[] | null> => {
  const text = await file.text();

  const results = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header: string): string => {
      return options.normalizedHeaders?.[header.trim().toLowerCase()] ?? header.trim();
    },
    transform: (v: string): string => v.trim(),
  });

  // Delete omitted columns from the results
  if (options.omitColumns?.length) {
    const omit = new Set(options.omitColumns);
    for (const row of results.data) {
      for (const key of omit) delete row[key];
    }
  }

  return results.errors.length === 0 ? results.data : null;
};

/**
 * Unparse an array of objects into a CSV string
 * @param data The data to unparse
 * @param keys Optional array of keys to determine CSV header order
 * @returns A CSV string representing the data
 */
export const unparseCsvFile = (data: Record<string, unknown>[], keys?: string[]): string => {
  // If no data, return an empty string or a header row if keys are provided
  if (data.length === 0) {
    return !keys ? '' : keys.map((k) => `"${k}"`).join(',') + '\n';
  }

  // If keys are provided, use them and add any extraneous keys to the end,
  // otherwise use all keys from the first object
  let fields = Object.keys(data[0]!);
  if (keys) {
    fields = [...keys, ...fields.filter((v) => !keys.includes(v))];
  }

  return Papa.unparse(
    {
      data,
      fields,
    },
    {
      newline: '\n',
    },
  );
};
