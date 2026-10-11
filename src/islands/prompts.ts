// Prompt presets island — curated Arabic system prompts.
// "Use" replaces settings.system_prompt, then jumps to /chat.
import { DEFAULT_SETTINGS } from "../api/types";

export interface Preset {
  id: string;
  name: string;
  desc: string;
  prompt: string;
}

export const PRESETS: Preset[] = [
  {
    id: "translate",
    name: "مترجم",
    desc: "ترجمة دقيقة بين العربية والإنجليزية مع الحفاظ على المعنى والأسلوب.",
    prompt: "أنت مترجم محترف بين العربية والإنجليزية. ترجم بدقة مع الحفاظ على المعنى والأسلوب، واذكر أي عبارة يصعب ترجمتها حرفياً.",
  },
  {
    id: "summarize",
    name: "ملخّص",
    desc: "تلخيص النصوص الطويلة في نقاط واضحة قصيرة.",
    prompt: "أنت خبير تلخيص. لخّص أي نص يُعطى لك في نقاط قصيرة واضحة بالعربية، ثم اذكر الفكرة الرئيسية في سطر واحد.",
  },
  {
    id: "coder",
    name: "مبرمج مساعد",
    desc: "شرح وكتابة وتصحيح الكود مع أمثلة عملية.",
    prompt: "أنت مبرمج مساعد خبير. اشرح الكود بوضوح، واكتب أمثلة عملية قصيرة، ونبّه إلى الأخطاء الشائعة. أجب بالعربية مع إبقاء المصطلحات التقنية بالإنجليزية.",
  },
  {
    id: "writer",
    name: "كاتب رسائل",
    desc: "صياغة رسائل ورسائل بريد مهذبة واحترافية.",
    prompt: "أنت كاتب محترف. صِغ الرسائل والبريد بأسلوب مهذب واحترافي بالعربية، واقترح عنواناً مناسباً عند الحاجة.",
  },
  {
    id: "teacher",
    name: "معلم مبسّط",
    desc: "شرح المفاهيم الصعبة بأمثلة بسيطة خطوة بخطوة.",
    prompt: "أنت معلم صبور. اشرح المفاهيم خطوة بخطوة بأمثلة بسيطة من الحياة اليومية، واسأل المتعلم سؤالاً قصيراً للتأكد من الفهم.",
  },
  {
    id: "editor",
    name: "محرر لغوي",
    desc: "تدقيق الإملاء والنحو وتحسين الصياغة.",
    prompt: "أنت محرر لغوي عربي. صحّح الإملاء والنحو، وحسّن الصياغة مع إبقاء المعنى، واعرض النص المصحح أولاً ثم قائمة التصحيحات.",
  },
];

const KEY = "pineapple:settings";

export function initPrompts(): void {
  document.querySelectorAll<HTMLButtonElement>("button[data-preset]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const preset = PRESETS.find((p) => p.id === btn.getAttribute("data-preset"));
      if (!preset) return;
      try {
        const raw = localStorage.getItem(KEY);
        const cur = raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
        cur.system_prompt = preset.prompt;
        localStorage.setItem(KEY, JSON.stringify(cur));
      } catch {
        /* storage blocked — still jump to chat */
      }
      location.href = "/chat";
    });
  });
}
