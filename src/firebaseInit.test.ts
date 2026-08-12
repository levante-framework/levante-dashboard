import { afterEach, describe, expect, it, vi } from 'vitest';
import { isReactive, markRaw, ref } from 'vue';

const { constructorSpy } = vi.hoisted(() => ({ constructorSpy: vi.fn() }));

// Stand-in for RoarFirekit (no Firebase/network in unit tests). It records the
// config it was constructed with and mirrors firekit's real markRaw behavior:
// each product is marked raw only when its markRawConfig flag is set.
vi.mock('@levante-framework/firekit', () => {
  class RoarFirekit {
    admin: { auth: object; db: object; functions: object };

    constructor(config: { markRawConfig?: Record<string, boolean> }) {
      constructorSpy(config);
      const wrap = (key: string, instance: object) => (config.markRawConfig?.[key] ? markRaw(instance) : instance);
      this.admin = {
        auth: wrap('auth', { product: 'auth' }),
        db: wrap('db', { product: 'db' }),
        functions: wrap('functions', { product: 'functions' }),
      };
    }

    async init() {
      return this;
    }
  }

  return { RoarFirekit };
});

import { initNewFirekit } from './firebaseInit';

// Regression guard for a token-refresh outage: the RoarFirekit instance is stored
// in a Vue ref, so without markRaw Vue deep-proxies its Firebase Auth object and
// breaks Auth's internal proactive-refresh timers, silently expiring the session.
// The fix passes markRawConfig so firekit marks auth/db/functions raw.
describe('initNewFirekit markRaw configuration', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  // Config guard: fails loudly if anyone drops or flips a markRawConfig flag,
  // the exact change that reintroduces the reactive proxying and voids the timers.
  it('constructs RoarFirekit with auth, db, and functions marked raw', async () => {
    await initNewFirekit();

    expect(constructorSpy).toHaveBeenCalledTimes(1);
    expect(constructorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        markRawConfig: { auth: true, db: true, functions: true },
      }),
    );
  });

  // Mechanism guard: encodes the actual bug. Holding firekit in a ref must not
  // turn the marked-raw products into reactive proxies; the control shows a plain
  // object in the same position would be proxied.
  it('keeps admin.auth non-reactive once the firekit instance is held in a Vue ref', async () => {
    const firekit = await initNewFirekit();

    const firekitRef = ref(firekit);

    const admin = firekitRef.value.admin!;
    expect(isReactive(admin.auth)).toBe(false);
    expect(isReactive(admin.db)).toBe(false);
    expect(isReactive(admin.functions)).toBe(false);

    const control = ref({ auth: { product: 'auth' } });
    expect(isReactive(control.value.auth)).toBe(true);
  });
});
