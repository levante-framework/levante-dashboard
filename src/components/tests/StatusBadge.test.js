import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import StatusBadge from '@/components/StatusBadge.vue';

const mountBadge = (props = {}) => mount(StatusBadge, { props });

describe('StatusBadge.vue', () => {
  describe('visibility', () => {
    it('does not render when icon and label are omitted', () => {
      const wrapper = mountBadge();
      expect(wrapper.find('.status-badge').exists()).toBe(false);
    });

    it('does not render when icon and label are empty strings', () => {
      const wrapper = mountBadge({ icon: '', label: '' });
      expect(wrapper.find('.status-badge').exists()).toBe(false);
    });

    it('renders when only an icon is provided', () => {
      const wrapper = mountBadge({ icon: 'pi pi-check' });
      expect(wrapper.find('.status-badge').exists()).toBe(true);
      expect(wrapper.find('.status-badge__icon').exists()).toBe(true);
      expect(wrapper.find('.status-badge__label').exists()).toBe(false);
    });

    it('renders when only a label is provided', () => {
      const wrapper = mountBadge({ label: 'Synced' });
      expect(wrapper.find('.status-badge').exists()).toBe(true);
      expect(wrapper.find('.status-badge__label').exists()).toBe(true);
      expect(wrapper.find('.status-badge__icon').exists()).toBe(false);
    });

    it('renders icon and label together', () => {
      const wrapper = mountBadge({ icon: 'pi pi-check', label: 'Synced' });
      expect(wrapper.find('.status-badge__icon').exists()).toBe(true);
      expect(wrapper.find('.status-badge__label').text()).toBe('Synced');
    });
  });

  describe('status class', () => {
    it('applies default status class', () => {
      const wrapper = mountBadge({ label: 'Default' });
      expect(wrapper.find('.status-badge').classes()).toEqual(
        expect.arrayContaining(['status-badge', 'status-badge--default']),
      );
    });

    it.each(['error', 'info', 'success', 'warn'])('applies status-badge--%s', (status) => {
      const wrapper = mountBadge({ label: status, status });
      expect(wrapper.find('.status-badge').classes()).toContain(`status-badge--${status}`);
    });
  });

  describe('pulse and icon', () => {
    it('does not render the pulse by default', () => {
      const wrapper = mountBadge({ label: 'Idle' });
      expect(wrapper.find('.status-badge__pulse').exists()).toBe(false);
    });

    it('renders the pulse when pulse is true', () => {
      const wrapper = mountBadge({ label: 'Live', pulse: true });
      expect(wrapper.find('.status-badge__pulse').exists()).toBe(true);
    });

    it('applies the icon class on the icon element', () => {
      const wrapper = mountBadge({ icon: 'pi pi-sync' });
      expect(wrapper.find('i').classes()).toEqual(expect.arrayContaining(['status-badge__icon', 'pi', 'pi-sync']));
    });
  });
});
