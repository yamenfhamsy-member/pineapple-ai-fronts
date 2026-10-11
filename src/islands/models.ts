// Models island — reads GET /v1/models live, persists pineapple:model.
// Default UI model: freeai/qwen3-8b. Neutral display names from gateway (never upstream sources).
import { DEFAULT_MODEL } from "../api/types";
import { listModels } from "../api/client";

const KEY = "pineapple:model";
const SELECT_ID = "model-select";
const STATUS_ID = "model-status";

// Providers verified dead are hidden from the picker.
// easemate: HTTP 200 + empty content on 5 models / 8 consecutive probes (2026-10-11).
// Re-enable when the gateway recovers (just delete the entry).
const DEAD_PROVIDERS: string[] = ["easemate"];

export function loadStoredModel(): { provider: string; model: string; display: string } {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as { provider: string; model: string; display: string };
  } catch {
    /* fall through to default */
  }
  return { ...DEFAULT_MODEL };
}

// Broadcasts the selected display name (chat header pill listens).
function announceModel(): void {
  let display = DEFAULT_MODEL.display;
  try {
    const sel = document.getElementById(SELECT_ID) as HTMLSelectElement | null;
    const v = sel ? (JSON.parse(sel.value) as { display?: string }) : null;
    if (v?.display) display = v.display;
  } catch {
    /* keep default */
  }
  document.dispatchEvent(new CustomEvent("pineapple:model", { detail: { display } }));
}

function providerOf(entry: { id: string; owned_by: string }): string {  if (entry.id === "gpt-ocr") return "darkps";
  if (entry.owned_by && entry.owned_by !== "easemate") return entry.owned_by;
  if (entry.id.includes("/")) {
    const head = entry.id.split("/")[0] ?? "";
    if (["freeai", "aichat", "rewind", "chatsmith", "darkps"].includes(head)) return head;
  }
  return entry.owned_by || "easemate";
}

export function initModels(): void {
  const sel = document.getElementById(SELECT_ID) as HTMLSelectElement | null;
  const status = document.getElementById(STATUS_ID);
  if (!sel) return;
  const stored = loadStoredModel();

  const render = (models: Array<{ id: string; display: string; owned_by: string }>): void => {
    sel.innerHTML = "";
    let matched = false;
    for (const m of models) {
      const opt = document.createElement("option");
      const provider = providerOf(m);
      // aichat copy of openai/gpt-4o-mini needs explicit provider — keep both entries distinct.
      opt.value = JSON.stringify({ provider, model: m.id, display: m.display });
      opt.textContent = m.display;
      const cur = JSON.stringify(stored);
      if (opt.value === cur || (stored.model === m.id && stored.provider === provider)) {
        opt.selected = true;
        matched = true;
      }
      sel.appendChild(opt);
    }
    if (!matched && sel.options.length > 0) {
      // Stored model is gone (e.g. its provider was filtered as dead) → fall back to default.
      const defVal = JSON.stringify({ ...DEFAULT_MODEL });
      const pick = [...sel.options].find((o) => o.value === defVal) ?? sel.options[0];
      if (pick) {
        pick.selected = true;
        try {
          localStorage.setItem(KEY, pick.value);
        } catch {
          /* storage full/blocked — ignore */
        }
      }
    }
    if (status) status.textContent = `عدد النماذج: ${models.length}`;
    announceModel();
  };

  sel.addEventListener("change", () => {
    try {
      localStorage.setItem(KEY, sel.value);
    } catch {
      /* storage full/blocked — ignore */
    }
    announceModel();
  });

  // Warm with stored value first (offline-safe), then refresh live.
  const warm = stored.display
    ? [{ id: stored.model, display: stored.display, owned_by: stored.provider }]
    : [];
  if (warm.length > 0) render(warm);

  listModels()
    .then((res) => {
      const live = res.data.filter((m) => !DEAD_PROVIDERS.includes(providerOf(m)));
      // Never brick the picker: if filtering empties the list, show everything.
      render(live.length > 0 ? live : res.data);
    })
    .catch((e: unknown) => {
      // Offline or gateway down — keep stored value, never wipe.
      if (status) status.textContent = !navigator.onLine ? "لا يوجد اتصال بالإنترنت." : "تعذر تحديث القائمة — تُستخدم القيمة المحفوظة.";
      console.log(JSON.stringify({ provider: "registry", model: "models", status: (e as { status?: number })?.status ?? 0, time: new Date().toISOString() }));
    });
}
