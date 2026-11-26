// Bandly server: saytni ochadi va AI so'rovlarini (Claude + Gemini) xavfsiz yuboradi
import 'dotenv/config';
import express from 'express';

const app = express();
app.set('trust proxy', 1); // Render/Railway orqasida haqiqiy IP ni ko'rish uchun
app.use(express.json({ limit: '8mb' }));
app.use(express.static('public'));

const { ANTHROPIC_API_KEY, GEMINI_API_KEY: RAW_GEMINI, AI_PROVIDER = 'auto', GEMINI_MODEL = 'gemini-3.6-flash' } = process.env;
const GEMINI_API_KEY = (RAW_GEMINI || '').trim().replace(/^["']|["']$/g, '');
console.log('Gemini kalit:', GEMINI_API_KEY ? GEMINI_API_KEY.slice(0, 3) + '... (' + GEMINI_API_KEY.length + ' belgi)' : 'YOQ');

async function askClaude(system, messages) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-5-5', max_tokens: 1800, system, messages })
  });
  const d = await r.json();
  if (!r.ok) throw new Error('Claude: ' + (d.error?.message || r.status));
  return d.content.map(c => c.text || '').join('');
}

async function askGemini(system, messages) {
  // Tezlik: o'ylash darajasi past; band bo'lsa 2 marta urinadi, keyin zaxira modelga o'tadi
  const models = [...new Set([GEMINI_MODEL, 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite'])];
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }, ...(m.image ? [{ inlineData: { mimeType: m.image.mime, data: m.image.data } }] : [])]
  }));
  let lastErr = 'Gemini xatosi';
  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const call = async fast => {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] }, contents,
          generationConfig: { maxOutputTokens: 1200, temperature: 0.6, ...(fast ? { thinkingConfig: { thinkingLevel: 'low' } } : {}) }
        })
      });
      return [r, await r.json()];
    };
    for (let i = 0; i < 2; i++) {
      let [r, d] = await call(true);
      if (r.status === 400) [r, d] = await call(false);      // model "thinkingLevel" ni bilmasa
      if (r.ok) return (d.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
      lastErr = 'Gemini: ' + (d.error?.message || r.status);
      if (![429, 500, 503].includes(r.status)) break;
      await new Promise(ok => setTimeout(ok, 800));
    }
  }
  throw new Error(lastErr);
}

// Qaysi AI'lar tayyor: kaliti borlari. AI_PROVIDER=claude yoki gemini bo'lsa, o'sha birinchi.
function providers() {
  const list = [];
  if (GEMINI_API_KEY) list.push(['gemini', askGemini]);
  if (ANTHROPIC_API_KEY) list.push(['claude', askClaude]);
  if (AI_PROVIDER === 'claude') list.sort(a => (a[0] === 'claude' ? -1 : 1));
  if (AI_PROVIDER === 'gemini') list.sort(a => (a[0] === 'gemini' ? -1 : 1));
  return list;
}

app.get('/api/status', (req, res) => res.json({ ok: true, providers: providers().map(p => p[0]) }));

// Oddiy himoya: bitta IP daqiqasiga 20 ta so'rov
const hits = new Map();
setInterval(() => hits.clear(), 60_000);
let today = 0; const DAILY = +(process.env.DAILY_LIMIT || 1000);
setInterval(() => { today = 0; }, 86_400_000);

app.post('/api/ai', async (req, res) => {
  hits.set(req.ip, (hits.get(req.ip) || 0) + 1);
  if (hits.get(req.ip) > 40) return res.status(429).json({ error: "Juda tez-tez so'rov. 1 daqiqa kuting." });

  if (++today > DAILY) return res.status(429).json({ error: "Bugungi limit tugadi. Ertaga qayta keling." });
  const system = String(req.body.system || '').slice(0, 3000);
  const messages = (req.body.messages || []).slice(-20).map(m => {
    const o = { role: m.role, content: String(m.content).slice(0, 6000) };
    const im = m.image;
    if (m.role === 'user' && im && /^image\//.test(im.mime || '') && typeof im.data === 'string' && im.data.length < 4_000_000) o.image = { mime: im.mime, data: im.data };
    return o;
  });
  const list = providers();
  if (!list.length) return res.status(500).json({ error: ".env faylida GEMINI_API_KEY yoki ANTHROPIC_API_KEY yo'q" });

  const errors = [];
  for (const [name, fn] of list) {            // birinchisi xato bersa, ikkinchisiga o'tadi
    try { return res.json({ text: await fn(system, messages), provider: name }); }
    catch (e) { errors.push(e.message); }
  }
  res.status(500).json({ error: errors.join(' | ') });
});

// Gemini ovozi (o'zbekcha, his-tuyg'u bilan). PCM ni WAV ga o'raymiz.
function wav(pcm) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(24000, 24); h.writeUInt32LE(48000, 28);
  h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}
app.post('/api/tts', async (req, res) => {
  if (!GEMINI_API_KEY) return res.status(400).json({ error: 'GEMINI_API_KEY yoq' });
  const { text = '', style = 'Say warmly', voice = 'Kore', lang = '' } = req.body;
  const model = process.env.GEMINI_TTS_MODEL || 'gemini-3.1-flash-tts-preview';
  const prompt = `${String(style).slice(0, 200)}: ${String(text).slice(0, 700)}`;
  let lastErr = 'Ovoz chiqmadi';
  // avval til kodi bilan, bo'lmasa tilni o'zi aniqlasin
  for (const code of [lang, '']) {
    try {
      const speechConfig = { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } };
      if (code) speechConfig.languageCode = code;
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ['AUDIO'], speechConfig } })
      });
      const d = await r.json();
      const b64 = d.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (b64) return res.type('audio/wav').send(wav(Buffer.from(b64, 'base64')));
      lastErr = d.error?.message || 'Ovoz chiqmadi';
      console.log('TTS xato (' + (code || 'auto') + '):', lastErr);
    } catch (e) { lastErr = e.message; console.log('TTS xato:', e.message); }
    if (!lang) break;
  }
  res.status(500).json({ error: lastErr });
});

app.listen(process.env.PORT || 3000, () => console.log('Bandly ishga tushdi: http://localhost:' + (process.env.PORT || 3000)));
