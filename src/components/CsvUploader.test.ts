import PrimeVue from 'primevue/config';
import PvFileUpload from 'primevue/fileupload';
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import CsvUploader from './CsvUploader.vue';

// ─── Mount helper ─────────────────────────────────────────────────────────────

type CsvUploaderProps = InstanceType<typeof CsvUploader>['$props'];

const mountCsvUploader = (props: CsvUploaderProps) =>
  mount(CsvUploader, {
    props,
    global: {
      plugins: [PrimeVue],
    },
  });

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const DEFAULT_PROPS: CsvUploaderProps = {
  disabled: false,
  disabledMessage: 'Select a site to add users',
  uploadedFile: null,
};

const makeFile = (name = 'users.csv') => new File(['name,age\nAlice,30'], name, { type: 'text/csv' });

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CsvUploader', () => {
  describe('choose button label', () => {
    it('shows "Choose CSV File" when no file has been uploaded', () => {
      const wrapper = mountCsvUploader({ ...DEFAULT_PROPS, uploadedFile: null });
      expect(wrapper.text()).toContain('Choose CSV File');
      expect(wrapper.text()).not.toContain('Choose Another CSV File');
    });

    it('shows "Choose Another CSV File" when a file has been uploaded', () => {
      const wrapper = mountCsvUploader({ ...DEFAULT_PROPS, uploadedFile: makeFile() });
      expect(wrapper.text()).toContain('Choose Another CSV File');
    });
  });

  describe('status message', () => {
    it('shows "No file chosen" when not disabled and no file is uploaded', () => {
      const wrapper = mountCsvUploader({ ...DEFAULT_PROPS, disabled: false, uploadedFile: null });
      expect(wrapper.text()).toContain('No file chosen');
    });

    it('shows the disabledMessage when disabled and no file is uploaded', () => {
      const wrapper = mountCsvUploader({
        ...DEFAULT_PROPS,
        disabled: true,
        disabledMessage: 'Select a site to add users',
        uploadedFile: null,
      });
      expect(wrapper.text()).toContain('Select a site to add users');
      expect(wrapper.text()).not.toContain('No file chosen');
    });

    it('shows the uploaded file name when a file is provided', () => {
      const wrapper = mountCsvUploader({ ...DEFAULT_PROPS, uploadedFile: makeFile('participants.csv') });
      expect(wrapper.text()).toContain('File: participants.csv');
    });

    it('prefers the uploaded file name over the disabledMessage when both conditions apply', () => {
      const wrapper = mountCsvUploader({
        ...DEFAULT_PROPS,
        disabled: true,
        disabledMessage: 'Select a site to add users',
        uploadedFile: makeFile('participants.csv'),
      });
      expect(wrapper.text()).toContain('File: participants.csv');
      expect(wrapper.text()).not.toContain('Select a site to add users');
    });
  });

  describe('disabled state', () => {
    it('forwards the disabled prop to the underlying PvFileUpload', () => {
      const wrapper = mountCsvUploader({ ...DEFAULT_PROPS, disabled: true });
      const input = wrapper.find('input[type="file"]');
      expect(input.exists()).toBe(true);
      expect(input.attributes('disabled')).toBeDefined();
    });

    it('leaves the underlying PvFileUpload enabled when disabled is false', () => {
      const wrapper = mountCsvUploader({ ...DEFAULT_PROPS, disabled: false });
      const input = wrapper.find('input[type="file"]');
      expect(input.exists()).toBe(true);
      expect(input.attributes('disabled')).toBeUndefined();
    });
  });

  describe('upload event', () => {
    it('emits "upload" with the event payload when PvFileUpload triggers @uploader', async () => {
      const wrapper = mountCsvUploader({ ...DEFAULT_PROPS });
      const file = makeFile();
      const payload = { files: [file] };

      const pvFileUpload = wrapper.findComponent(PvFileUpload);
      expect(pvFileUpload.exists()).toBe(true);

      await pvFileUpload.vm.$emit('uploader', payload);

      expect(wrapper.emitted('upload')).toBeTruthy();
      expect(wrapper.emitted('upload')).toHaveLength(1);
      expect(wrapper.emitted('upload')![0]).toEqual([payload]);
    });

    it('only accepts .csv files', () => {
      const wrapper = mountCsvUploader({ ...DEFAULT_PROPS });
      const input = wrapper.find('input[type="file"]');
      expect(input.attributes('accept')).toBe('.csv');
    });
  });
});
