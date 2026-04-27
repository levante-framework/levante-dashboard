import PrimeVue from 'primevue/config';
import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import CsvTable from './CsvTable.vue';

// ─── Mount helper ─────────────────────────────────────────────────────────────

type CsvTableProps = InstanceType<typeof CsvTable>['$props'];

const mountCsvTable = (props: CsvTableProps) =>
  mount(CsvTable, {
    props,
    global: {
      plugins: [PrimeVue],
    },
  });

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const KEYS = ['name', 'status', 'tags'];
const ROWS: Record<string, unknown>[] = [
  { name: 'Alice', status: 'active', tags: ['admin', 'user'] },
  { name: 'Bob', status: 42, tags: null },
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CsvTable', () => {
  describe('table visibility', () => {
    it('does not render the table when rows is an empty array', () => {
      const wrapper = mountCsvTable({ keys: KEYS, rows: [] });
      expect(wrapper.find('table').exists()).toBe(false);
    });

    it('renders the table when rows has data', () => {
      const wrapper = mountCsvTable({ keys: KEYS, rows: ROWS });
      expect(wrapper.find('table').exists()).toBe(true);
    });
  });

  describe('column headers', () => {
    it('falls back to key names when the headers prop is not provided', () => {
      const wrapper = mountCsvTable({ keys: KEYS, rows: ROWS });
      const text = wrapper.text();
      for (const key of KEYS) {
        expect(text).toContain(key);
      }
    });

    it('uses the headers prop labels when provided', () => {
      const headers = ['Full Name', 'Status Code', 'Assigned Tags'];
      const wrapper = mountCsvTable({ keys: KEYS, rows: ROWS, headers });
      const text = wrapper.text();
      for (const label of headers) {
        expect(text).toContain(label);
      }
    });

    it('falls back to the key when a headers entry is missing for that index', () => {
      // Only the first header is supplied; the remaining two fall back to their keys.
      const wrapper = mountCsvTable({ keys: KEYS, rows: ROWS, headers: ['Full Name'] });
      const text = wrapper.text();
      expect(text).toContain('Full Name');
      expect(text).toContain('status');
      expect(text).toContain('tags');
    });
  });

  describe('formatCell', () => {
    it('renders an empty string for null values', () => {
      const wrapper = mountCsvTable({
        keys: ['a'],
        rows: [{ a: null }],
      });
      const cells = wrapper.findAll('td');
      expect(cells.some((td) => td.text() === '')).toBe(true);
    });

    it('renders an empty string for undefined values', () => {
      const wrapper = mountCsvTable({
        keys: ['a'],
        rows: [{ a: undefined }],
      });
      const cells = wrapper.findAll('td');
      expect(cells.some((td) => td.text() === '')).toBe(true);
    });

    it('joins arrays of 5 or fewer items with ", "', () => {
      const wrapper = mountCsvTable({
        keys: ['tags'],
        rows: [{ tags: ['x', 'y', 'z'] }],
      });
      expect(wrapper.text()).toContain('x, y, z');
    });

    it('shows a placeholder message for arrays with more than 5 items', () => {
      const wrapper = mountCsvTable({
        keys: ['tags'],
        rows: [{ tags: ['a', 'b', 'c', 'd', 'e', 'f'] }],
      });
      expect(wrapper.text()).toContain('Many rows affected, download Error CSV for details');
    });

    it('does not show a placeholder for an array of exactly 5 items', () => {
      const wrapper = mountCsvTable({
        keys: ['tags'],
        rows: [{ tags: ['a', 'b', 'c', 'd', 'e'] }],
      });
      expect(wrapper.text()).toContain('a, b, c, d, e');
      expect(wrapper.text()).not.toContain('Many rows affected');
    });

    it('converts non-array primitive values to strings', () => {
      const wrapper = mountCsvTable({
        keys: ['count', 'flag'],
        rows: [{ count: 42, flag: true }],
      });
      const text = wrapper.text();
      expect(text).toContain('42');
      expect(text).toContain('true');
    });
  });
});
