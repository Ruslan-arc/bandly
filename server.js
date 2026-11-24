// Bandly server: saytni ochadi va AI so'rovlarini (Claude + Gemini) xavfsiz yuboradi
import 'dotenv/config';
import express from 'express';

const app = express();
app.use(express.json({ limit: '100kb' }));
app.use(express.static('public'));

const { ANTHROPIC_API_KEY, GEMINI_API_KEY, AI_PROVIDER = 'auto', GEMINI_MODEL = 'gemini-2.5-flash' } = process.env;

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
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      generationConfig: { maxOutputTokens: 4000 }
    })
  });
  const d = await r.json();
  if (!r.ok) throw new Error('Gemini: ' + (d.error?.message || r.status));
  return (d.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
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

app.post('/api/ai', async (req, res) => {
  hits.set(req.ip, (hits.get(req.ip) || 0) + 1);
  if (hits.get(req.ip) > 40) return res.status(429).json({ error: "Juda tez-tez so'rov. 1 daqiqa kuting." });

  const system = String(req.body.system || '').slice(0, 3000);
  const messages = (req.body.messages || []).slice(-20).map(m => ({ role: m.role, content: String(m.content).slice(0, 6000) }));
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
  const { text = '', style = 'Say warmly', voice = 'Kore' } = req.body;
  try {
    const model = process.env.GEMINI_TTS_MODEL || 'gemini-2.5-flash-preview-tts';
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${String(style).slice(0, 200)} (in Uzbek): ${String(text).slice(0, 700)}` }] }],
        generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } }
      })
    });
    const d = await r.json();
    const b64 = d.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!b64) return res.status(500).json({ error: d.error?.message || 'Ovoz chiqmadi' });
    res.type('audio/wav').send(wav(Buffer.from(b64, 'base64')));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(process.env.PORT || 3000, () => console.log('Bandly ishga tushdi: http://localhost:' + (process.env.PORT || 3000)));
