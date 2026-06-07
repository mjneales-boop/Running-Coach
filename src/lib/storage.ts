// Adapter: prefers window.storage (Claude Code / artifact env), falls back to localStorage.

interface StorageAPI {
  get(key: string): Promise<{ key: string; value: string; shared: boolean } | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

function localStorageAPI(): StorageAPI {
  return {
    get: async (key) => {
      const value = localStorage.getItem(key);
      if (value === null) return null;
      return { key, value, shared: false };
    },
    set: async (key, value) => {
      localStorage.setItem(key, value);
    },
    delete: async (key) => {
      localStorage.removeItem(key);
    },
  };
}

function windowStorageAPI(ws: NonNullable<typeof window.storage>): StorageAPI {
  return {
    get: async (key) => {
      try {
        const result = await ws.get(key);
        return result ?? null;
      } catch {
        return null;
      }
    },
    set: async (key, value) => {
      await ws.set(key, value);
    },
    delete: async (key) => {
      await ws.delete(key);
    },
  };
}

// Extend Window type to allow window.storage
declare global {
  interface Window {
    storage?: {
      get(key: string): Promise<{ key: string; value: string; shared: boolean } | null>;
      set(key: string, value: string): Promise<unknown>;
      delete(key: string): Promise<unknown>;
      list(prefix?: string): Promise<{ keys: string[]; prefix?: string; shared: boolean } | null>;
    };
  }
}

const storage: StorageAPI =
  typeof window !== 'undefined' && window.storage
    ? windowStorageAPI(window.storage)
    : localStorageAPI();

export default storage;
