// Image island — keyless generation via Pollinations (direct <img>, no backend).
// GET image.pollinations.ai/prompt/{text}?width=&height=&nologo=true&private=true&seed=
import { ERR_STRINGS } from "../api/types";

export const IMAGE_BASE = "https://image.pollinations.ai/prompt";

export function buildImageUrl(prompt: string, size: string, seed: number): string {
  const [width, height] = size.split("x").map(Number);
  const params = new URLSearchParams({
    width: String(width || 512),
    height: String(height || 512),
    nologo: "true",
    private: "true",
    seed: String(seed),
  });
  return `${IMAGE_BASE}/${encodeURIComponent(prompt)}?${params.toString()}`;
}

export function initImage(): void {
  const form = document.getElementById("image-form") as HTMLFormElement | null;
  const prompt = document.getElementById("image-prompt") as HTMLInputElement | null;
  const size = document.getElementById("image-size") as HTMLSelectElement | null;
  const out = document.getElementById("image-out") as HTMLElement | null;
  const img = document.getElementById("image-result") as HTMLImageElement | null;
  const dl = document.getElementById("image-dl") as HTMLAnchorElement | null;
  const btn = document.getElementById("image-send") as HTMLButtonElement | null;
  if (!form || !prompt || !size || !out || !img || !dl || !btn) return;

  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const text = prompt.value.trim();
    if (text.length === 0) {
      out.textContent = ERR_STRINGS.empty400;
      return;
    }
    btn.disabled = true;
    out.textContent = "… جارٍ التوليد";
    img.hidden = true;
    dl.hidden = true;
    const url = buildImageUrl(text, size.value, Math.floor(Math.random() * 1000000));
    img.onload = () => {
      btn.disabled = false;
      out.textContent = "";
      img.hidden = false;
      dl.hidden = false;
      dl.href = url;
    };
    img.onerror = () => {
      btn.disabled = false;
      out.textContent = ERR_STRINGS.upstream502;
    };
    img.src = url;
    img.alt = text.slice(0, 120);
  });
}
