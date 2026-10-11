// OCR island — provider:darkps + file_urls (<=10 public URLs) + system_prompt.
// Private URLs 502 by design — surface neutral upstream string only.
import { ERR_STRINGS, type GatewayErrorShape } from "../api/types";
import { chatOnce } from "../api/client";
import { loadSettings } from "./settings";

export function initOcr(): void {
  const form = document.getElementById("ocr-form") as HTMLFormElement | null;
  const urls = document.getElementById("ocr-urls") as HTMLTextAreaElement | null;
  const sys = document.getElementById("ocr-sys") as HTMLInputElement | null;
  const out = document.getElementById("ocr-out") as HTMLElement | null;
  const btn = document.getElementById("ocr-send") as HTMLButtonElement | null;
  if (!form || !urls || !out || !btn) return;

  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const list = urls.value.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 10);
    if (list.length === 0) {
      out.textContent = ERR_STRINGS.empty400;
      return;
    }
    btn.disabled = true;
    out.textContent = "…";
    const settings = loadSettings();
    void chatOnce(
      {
        model: "gpt-ocr",
        provider: "darkps",
        messages: [{ role: "user", content: "استخرج النص من الصور." }],
        file_urls: list,
        system_prompt: sys?.value || settings.system_prompt || undefined,
      },
    )
      .then((text) => {
        out.textContent = text.trim().length > 0 ? text : ERR_STRINGS.empty200;
      })
      .catch((e: unknown) => {
        out.textContent = (e as GatewayErrorShape)?.userMessage || ERR_STRINGS.upstream502;
      })
      .finally(() => {
        btn.disabled = false;
      });
  });
}
