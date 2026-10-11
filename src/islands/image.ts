// Image island — generation via the gateway horde provider (Stable Horde, anonymous).
// POST /v1/images/generations {prompt, model:"stable-diffusion", size, response_format:"url"}.
import { ERR_STRINGS, type GatewayErrorShape } from "../api/types";
import { generateImage } from "../api/client";

export function initImage(): void {
  const form = document.getElementById("image-form") as HTMLFormElement | null;
  const prompt = document.getElementById("image-prompt") as HTMLInputElement | null;
  const size = document.getElementById("image-size") as HTMLSelectElement | null;
  const out = document.getElementById("image-out") as HTMLElement | null;
  const img = document.getElementById("image-result") as HTMLImageElement | null;
  const dl = document.getElementById("image-dl") as HTMLAnchorElement | null;
  const btn = document.getElementById("image-send") as HTMLButtonElement | null;
  if (!form || !prompt || !size || !out || !img || !dl || !btn) return;

  let ctrl: AbortController | null = null;

  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const text = prompt.value.trim();
    if (text.length === 0) {
      out.textContent = ERR_STRINGS.empty400;
      return;
    }
    ctrl?.abort();
    ctrl = new AbortController();
    const signal = ctrl.signal;
    btn.disabled = true;
    out.textContent = "… جارٍ التوليد (قد يستغرق دقيقة أو أكثر)";
    img.hidden = true;
    dl.hidden = true;
    void generateImage(text, size.value, "url", signal)
      .then(({ url }) => {
        btn.disabled = false;
        if (!url) {
          out.textContent = ERR_STRINGS.empty200;
          return;
        }
        out.textContent = "";
        img.src = url;
        img.alt = text.slice(0, 120);
        img.hidden = false;
        dl.hidden = false;
        dl.href = url;
      })
      .catch((e: unknown) => {
        btn.disabled = false;
        const g = e as GatewayErrorShape & { name?: string };
        if (g?.code === "aborted" || g?.name === "AbortError") {
          out.textContent = "";
          return;
        }
        out.textContent = g?.userMessage || ERR_STRINGS.upstream502;
      });
  });
}
