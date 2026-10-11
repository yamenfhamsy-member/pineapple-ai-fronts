// Settings island — persists pineapple:settings {temperature, system_prompt} (localStorage only).
// Migrate silently on version change, never wipe (unknown stored keys are ignored).
import { DEFAULT_SETTINGS, type StoredSettings } from "../api/types";

const KEY = "pineapple:settings";

export function loadSettings(): StoredSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredSettings>;
      return {
        temperature: typeof parsed.temperature === "number" ? parsed.temperature : DEFAULT_SETTINGS.temperature,
        system_prompt: typeof parsed.system_prompt === "string" ? parsed.system_prompt : DEFAULT_SETTINGS.system_prompt,
      };
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_SETTINGS };
}

export function initSettings(): void {
  const temp = document.getElementById("set-temp") as HTMLInputElement | null;
  const sys = document.getElementById("set-sys") as HTMLTextAreaElement | null;
  if (!temp || !sys) return;
  const cur = loadSettings();
  temp.value = String(cur.temperature);
  sys.value = cur.system_prompt;

  const save = (): void => {
    const next: StoredSettings = {
      temperature: Number(temp.value) || DEFAULT_SETTINGS.temperature,
      system_prompt: sys.value,
    };
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  temp.addEventListener("change", save);
  sys.addEventListener("change", save);
}
