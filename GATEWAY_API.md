# free-ai-gateway — توثيق API الكامل

> القاعدة الحية: `https://free-ai-gateway.img-api.workers.dev` (إصدار متحقق `cda31087`)
> الكود: `/home/ymwn131/ease-cf-worker/worker.js` (ملف واحد، صفر اعتماديات)
> كل endpoint أدناه **مُتحقق حي بتاريخ 2026-10-11** (43 موديل، 6 مزودات نشطة).
> ملاحظة الحافة: طلبات بلا `User-Agent` متصفح تُرفض من Cloudflare بـ `403 error code: 1010` — استخدم UA متصفح دائماً.

## 1. المصادقة

- افتراضياً **مفتوحة** (لا مفتاح).
- إن ضُبط secret `PROXY_KEY` (`wrangler secret put PROXY_KEY`): كل الطلبات تحتاج `Authorization: Bearer <key>` وإلا `401 {"error":{"message":"Invalid API key","code":"invalid_api_key"}}`.
- CORS مفتوح (`*`, `GET,POST,OPTIONS`).

## 2. الجذر والكتالوج

### `GET /`
→ 200: `{name:"free-ai-gateway", providers:{...}, routes:["GET /v1/models","POST /v1/chat/completions"], docs:"See README.md"}`.
جدول المزودات الحي (الستة النشطة فقط — حُذف المعطّل من الكود بتاريخ 2026-10-11، والسجل التاريخي في `AGENTS.md`):

| provider | active | الملاحظة |
|---|---|---|
| easemate | ✅ | رصيد مجهول 50k token |
| freeai | ✅ | 6000 token/يوم/IP |
| darkps | ✅ | GPT-OCR مجهول |
| aichat | ✅ | كوكيز جلسة + CSRF حي |
| rewind | ✅ | `X-Anon-Token` لكل طلب |
| chatsmith | ✅ | JWT مجهول + إثبات RSA |

### `GET /v1/models`
→ 200 `{object:"list", data:[{id, object:"model", owned_by, display, ease_model_id?}]}`.
الحي: **43** = easemate 28 (تُجلب حياً من `query_config` — غيابها لا يحجب البقية) + freeai 7 + darkps 1 (`gpt-ocr`) + aichat 5 + rewind 1 + chatsmith 1. المزود المعطّل تُحجب موديلاته تلقائياً (`PROVIDERS.free2gpt.active` مثال).

## 3. المحادثة — `POST /v1/chat/completions`

```json
{
  "model": "openai/gpt-4o-mini",
  "messages": [{"role": "user", "content": "..."}],
  "stream": false,
  "temperature": 0.7,
  "provider": "freeai",
  "file_urls": ["https://..."],
  "system_prompt": "..."
}
```
- `messages` بلا مستخدم → `400 messages with a user prompt required` (مُتحقق).
- `provider` أو `model` غير معروف → يسقط على easemate الافتراضي (لا 502 — المزودات المعطلة حُذفت من الكود).
- مسار مجهول → `404 not found` (مُتحقق).

### قواعد التوجيه (بالترتيب)
1. `provider` الصريح يفوز.
2. مطابقة id الموديل: freeai → `gpt-ocr`=darkps → aichat (عدا الافتراضي) → rewind → free2gpt (إن نشط) → chatsmith.
3. الافتراضي = easemate. ملاحظة: `openai/gpt-4o-mini` موجود في easemate وaichat — الافتراضي easemate، ونسخة aichat تحتاج `provider:"aichat"` صريحاً.

### شكل الرد
- غير stream: `{id:"chatcmpl-<tag>-*", object:"chat.completion", model, choices:[{index:0, message:{role,content}, finish_reason:"stop"}], usage:{prompt_tokens:-1,...}}` (العدادات -1: غير متاحة).
- stream: قطعة واحدة بالمحتوى الكامل + قطعة `finish_reason:"stop"` + `data: [DONE]` (تخزين مؤقت ثم بث؛ الاستثناء: rewind يمرر upstream خاماً).

### المزودات النشطة (التدفق + الحدود + الحالة الحية)

**easemate** (الافتراضي، 28 موديل): `identity_id → query_config → create_pure_session → stream/exec_operation` + توقيع WASM تلقائي (جهاز جديد لكل طلب). حد 50k token مجهول، الحصة حسب IP (`6101` = نفاد حصة الـ egress). **ملاحظة مُتحققة:** يرد فارغاً أحياناً (200 + content فارغ) — flake معروف من upstream.
**freeai** (7 موديلات: `qwen3-8b` افتراضي، `qwen7b`, `deepseek-r1`, `deepseek-r1-7b`, `mistral`, `qwen3-coder`, `qwen-coder`): `POST api.free.ai/v1/chat/` مجهول تماماً. الحد 6000 token/يوم/IP → `429 quota_exhausted`. الحي: `200 g-free`.
**darkps** (`gpt-ocr`): `POST dark.ps/v2/gpt-ocr/completions {prompt, system_prompt, file_urls[]≤10}` → SSE. تُمرَّر `file_urls` و`system_prompt` من الطلب. الحي: `200 g-dark`.
**aichat** (5: `openai/gpt-4o-mini`, `anthropic/claude-haiku-4-5`, `deepseek/deepseek-chat-v3-0324`, `perplexity/sonar`, `qwen/qwen-2.5-72b-instruct`): كوكيز جلسة + CSRF يُحصد حياً من `/chat`. انتهاء الجلسة (401/419) → `502 AUTH_EXPIRED` (أعد الحصاد). الحي: `200 g-aichat`.
**rewind** (1: `qwen/qwen-2.5-7b-instruct`): سكب `hi` لمنح `X-Anon-Token` ثم الطلب الحقيقي. موديلات أخرى ترد `REQUIRES_USER` → 502. الحي: `200 g-rewind`.
**chatsmith** (1: `chatsmith-gpt-4o-mini`): JWT مجهول لكل طلب (`tier:free`) + إثبات RSA خالص بـ BigInt (WebCrypto لا يدعم `RSAES-PKCS1-v1_5`). رد OpenAI جاهز. `424` upstream تُترجم 502. الحي: `200 g-smith` + stream 200.

## 4. الصوت — `POST /v1/audio/speech`
```json
{"input": "نص ≤1000 حرف", "format": "json (اختياري)"}
```
- افتراضي: `200 audio/wav` (بايتات مباشرة — مُتحقق 76844 بايت).
- `"format":"json"` → `{audio_url}`.
- بلا نص → `400 input/text with text required`. فشل upstream → `502 tts failed` (مُتحقق مرة واحدة — الخدمة متقطعة).

## 5. بوت تيليغرام (`@Pineapple_aibot`)

- Webhook: `POST /tg/hook/<TG_BOT_TOKEN>` (stateless؛ يُضبط مرة واحدة عبر Bot API `setWebhook`). الـ token **سر** (`wrangler secret put TG_BOT_TOKEN`) — أبداً في الكود.
- الأوامر: `/start` (أزرار: تغيير الموديل/صوت/صورة)، `/models` (قائمة مسطحة تُبنى من `gatewayModels()` تلقائياً — 43 حالياً)، `/status` (الموديل الحالي)، أي نص آخر = محادثة، أي صورة = OCR.
- قاعدة المزامنة: كل مزود/موديل جديد في الـ gateway **يجب** إضافته للبوت (القائمة + التوجيه). الأسماء المعروضة محايدة (لا أسماء مصادر).
- التفضيلات في KV `PREFS` (`tg:<chatId>` → `{provider,model,display,mode}`؛ الافتراضي freeai/qwen3-8b).
- خاص: محادثة نصية متدفقة (stream) لمزودات `freeai/aichat/darkps` في الخاص عبر `sendMessageDraft` (زر إيقاف أصلي → flag في KV يُجهض الحلقة)؛ البقية (rewind/chatsmith/easemate) غير-stream. الصور → `darkpsChat` مع `file_urls`. وضع الصوت (`mode:voice`) → `/v1/audio/speech` ثم `sendAudio`.
- `callback_data` ≤64 حرف (`m:<provider>:<model>`)؛ الرسائل تُقطع 4000 حرف.

## 6. جدول الأخطاء

| الحالة | code | المعنى |
|---|---|---|
| 400 | `bad_request` | JSON معطوب / رسائل فارغة / نص صوتي مفقود |
| 401 | `invalid_api_key` | مفتاح `PROXY_KEY` خطأ (إن فُعّل) |
| 404 | `not_found` | مسار مجهول / ميديا معدومة |
| 429 | `quota_exhausted` | حصة freeai اليومية |
| 502 | `upstream_error` | upstream ميت/مرفوض (الرسالة تُفصّل) |
| 502 | `AUTH_EXPIRED` | جلسة aichat انتهت — أعد حصاد الكوكيز |
| 403 | `1010` (الحافة) | UA غير متصفح — ليست من الكود |

## 7. المصفوفة الحية (2026-10-11)
`models` 43 (28+7+1+5+1+1) ✅ | صدى 200 لكل المزودات الستة ✅ (easemate فارغ أحياناً — flake) | stream ✅ | صوت WAV ✅ | `400` فارغ ✅ | `404` ✅ | `1010` بدون UA ✅.
