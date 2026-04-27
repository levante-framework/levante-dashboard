import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';
import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import AddUsersInfo from './AddUsersInfo.vue';

const setupDownloadMocks = () => {
  // Mock DOM APIs
  const urlCreateObjectUrlMock = vi.fn(() => 'mock-blob-url');
  global.URL.createObjectURL = urlCreateObjectUrlMock;

  const appendChildMock = vi.fn();
  const removeChildMock = vi.fn();
  const clickMock = vi.fn();

  const createElementOriginal = document.createElement;
  global.document.createElement = vi.fn((tagName) => {
    const element = createElementOriginal.call(document, tagName);
    if (tagName === 'a') {
      element.click = clickMock;
    }
    return element;
  });

  global.document.body.appendChild = appendChildMock;
  global.document.body.removeChild = removeChildMock;

  return {
    urlCreateObjectUrlMock,
    appendChildMock,
    removeChildMock,
    clickMock,
    createElementOriginal,
  };
};

const cleanupDownloadMocks = (createElementOriginal: typeof document.createElement) => {
  global.document.createElement = createElementOriginal;
  (global.URL.createObjectURL as ReturnType<typeof vi.fn>).mockRestore();
};

describe('AddUsersInfo Component', () => {
  it('Downloads the CSV template file', async () => {
    const mocks = setupDownloadMocks();

    const wrapper = mount(AddUsersInfo, {
      global: {
        plugins: [PrimeVue, ToastService],
        stubs: {
          RouterLink: true,
        },
      },
    });

    const downloadButton = wrapper.find('button[data-testid="download-template"]');
    await downloadButton.trigger('click');

    // Verify URL.createObjectURL was called with a Blob
    expect(global.URL.createObjectURL).toHaveBeenCalled();
    const blob = (global.URL.createObjectURL as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(blob).toBeInstanceOf(Blob);

    // Verify link properties and DOM operations
    expect(mocks.appendChildMock).toHaveBeenCalled();
    expect(mocks.clickMock).toHaveBeenCalled();
    expect(mocks.removeChildMock).toHaveBeenCalled();

    // Restore original methods
    cleanupDownloadMocks(mocks.createElementOriginal);
  });
});
