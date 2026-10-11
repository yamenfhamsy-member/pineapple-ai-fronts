// Settings island — persists pineapple:settings + pineapple:key (localStorage only).
// Migrate silently on version change, never wipe.
import { DEFAULT_SETTINGS, type StoredSettings } from "../api/types";

const KEY = "pineapple:settings";
const KEY2 = "pineapple:key";

export function loadSettings(): StoredSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<StoredSettings>) };
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_SETTINGS };
}

export function initSettings(): void {
  const base = document.getElementById("set-base") as HTMLInputElement | null;
  const temp = document.getElementById("set-temp") as HTMLInputElement | null;
  const sys = document.getElementById("set-sys") as HTMLTextAreaElement | null;
  const stream = document.getElementById("set-stream") as HTMLInputElement | null;
  const key = document.getElementById("set-key") as HTMLInputElement | null;
  const clearKey = document.getElementById("set-key-clear") as HTMLButtonElement | null;
  if (!base || !temp || !sys || !stream) return;
  const cur = loadSettings();
  base.value = cur.base;
  temp.value = String(cur.temperature);
  sys.value = cur.system_prompt;
  stream.checked = cur.stream;
  if (key) {
    try {
      key.value = localStorage.getItem(KEY2) ?? "";
    } catch {
      key.value = "";
    }
  }

  const save = (): void => {
    const next: StoredSettings = {
      base: base.value.trim() || DEFAULT_SETTINGS.base,
      temperature: Number(temp.value) || DEFAULT_SETTINGS.temperature,
      system_prompt: sys.value,
      stream: stream.checked,
    };
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    if (key) {
      try {
        if (key.value.trim().length > 0) localStorage.setItem(KEY2, key.value.trim());
        else localStorage.removeItem(KEY2);
      } catch {
        /* ignore */
      }
    }
  };

  for (const el of [base, temp, sys, stream, key]) el?.addEventListener("change", save);
  clearKey?.addEventListener("click", () => {
    try {
      localStorage.removeItem(KEY2);
    } catch {
      /* ignore */
    }
    if (key) key.value = "";
  });
}
