// TTS island — POST /v1/audio/speech, input <=1000 chars, default WAV bytes; format:json returns URL.
import { ERR_STRINGS } from "../api/types";
import { textToSpeech } from "../api/client";

export function initTts(): void {
  const form = document.getElementById("tts-form") as HTMLFormElement | null;
  const input = document.getElementById("tts-input") as HTMLTextAreaElement | null;
  const audio = document.getElementById("tts-audio") as HTMLAudioElement | null;
  const out = document.getElementById("tts-out") as HTMLElement | null;
  const btn = document.getElementById("tts-send") as HTMLButtonElement | null;
  if (!form || !input || !audio || !out || !btn) return;

  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const text = input.value.trim();
    if (text.length === 0) {
      out.textContent = ERR_STRINGS.empty400;
      return;
    }
    if (text.length > 1000) {
      out.textContent = "النص أطول من 1000 حرف — قصّره ثم حاول مجدداً.";
      return;
    }
    btn.disabled = true;
    out.textContent = "…";
    void textToSpeech(text)
      .then((blob) => {
        if (blob instanceof Blob) {
          const url = URL.createObjectURL(blob);
          audio.src = url;
          void audio.play().catch(() => undefined);
          out.textContent = "";
        }
      })
      .catch(() => {
        out.textContent = ERR_STRINGS.upstream502;
      })
      .finally(() => {
        btn.disabled = false;
      });
  });
}
