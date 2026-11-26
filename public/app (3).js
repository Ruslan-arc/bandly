const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

/* ---------- Yordamchilar ---------- */
async function ai(system, messages) {
  let r, raw = '';
  try {
    r = await fetch('/api/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ system, messages }) });
    raw = await r.text();
  } catch (e) { throw new Error("Serverga ulanib bo'lmadi. Terminalda npm start qiling."); }
  let d;
  try { d = JSON.parse(raw); }
  catch (e) { throw new Error("Server javob bermadi. Saytni Live Server bilan emas, http://localhost:3000 orqali oching (terminalda npm start)."); }
  if (d.error) throw new Error(d.error);
  return d.text;
}
const UZ = "Tushuntirishlarni oddiy o'zbek tilida yoz, inglizcha misollarni inglizcha qoldir.";
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

/* ---------- XP va streak (brauzer xotirasida) ---------- */
let prog = { xp: 0, streak: 0, last: '' };
try { prog = { ...prog, ...JSON.parse(localStorage.getItem('bandly') || '{}') }; } catch (e) {}
function showProg() { $('#streak').textContent = prog.streak + ' kun'; $('#xp').textContent = prog.xp + ' XP'; }
function addXP(n) {
  const today = new Date().toDateString();
  if (prog.last !== today) {
    const y = new Date(Date.now() - 864e5).toDateString();
    prog.streak = prog.last === y ? prog.streak + 1 : 1;
    prog.last = today;
  }
  prog.xp += n;
  try { localStorage.setItem('bandly', JSON.stringify(prog)); } catch (e) {}
  showProg();
}
showProg();

/* ---------- Tablar ---------- */
function go(tab) {
  $$('.pane').forEach(p => p.classList.toggle('on', p.id === tab));
  $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  location.hash = tab;
  speechSynthesis.cancel();
}
$$('#tabs button').forEach(b => b.onclick = () => go(b.dataset.tab));
$$('[data-go]').forEach(b => b.onclick = () => go(b.dataset.go));
if (location.hash.length > 1 && $(location.hash)) go(location.hash.slice(1));

/* ---------- Test yaratish (Reading va Listening uchun umumiy) ---------- */
const SAMPLE = {
  title: 'Sleep and Memory',
  passage: 'Scientists have long known that sleep is essential, but only recently have they understood how it shapes memory. During deep sleep, the brain replays the events of the day, moving information from the hippocampus, a short-term store, to the cortex, where it can be kept for years. Students who sleep after studying remember up to 40 percent more than those who stay awake. Researchers also found that even a twenty-minute nap can improve recall of new vocabulary. However, sleeping pills may weaken this process, because they reduce the amount of deep sleep. Experts therefore advise a regular bedtime and a dark, quiet room.',
  questions: [
    { q: 'Where is information stored for the long term?', options: ['Hippocampus', 'Cortex', 'Muscles', 'Eyes'], answer: 1, why: 'Matnda: "to the cortex, where it can be kept for years".' },
    { q: 'How much more do students who sleep after studying remember?', options: ['Up to 4 percent', 'Up to 14 percent', 'Up to 40 percent', 'Up to 100 percent'], answer: 2, why: '"up to 40 percent more".' },
    { q: 'What can a twenty-minute nap improve?', options: ['Eyesight', 'Vocabulary recall', 'Muscle size', 'Appetite'], answer: 1, why: '"improve recall of new vocabulary".' },
    { q: 'Why may sleeping pills be harmful for memory?', options: ['They cause nightmares', 'They reduce deep sleep', 'They make people tired', 'They raise body temperature'], answer: 1, why: '"they reduce the amount of deep sleep".' }
  ]
};

async function makeTest(kind, topic) {
  const t = topic || 'a random interesting academic topic';
  const type = kind === 'listening' ? 'a spoken monologue (a lecture or radio talk, about 220 words, written to be heard, no headings)' : 'an IELTS Academic reading passage (about 280 words)';
  const txt = await ai('You write IELTS practice material. Reply with ONLY valid JSON, no markdown.',
    [{ role: 'user', content: `Create ${type} about "${t}", plus 5 multiple-choice questions with 4 options each. In "why", explain the answer in simple Uzbek. JSON shape: {"title":"","passage":"","questions":[{"q":"","options":["","","",""],"answer":0,"why":""}]}` }]);
  return JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
}

function quizHTML(t, id) {
  return t.questions.map((q, i) => `<div class="q" id="${id}q${i}"><p>${i + 1}. ${esc(q.q)}</p>` +
    q.options.map((o, j) => `<label><input type="radio" name="${id}${i}" value="${j}"> ${esc(o)}</label>`).join('') +
    `<div class="why" hidden>${esc(q.why)}</div></div>`).join('') +
    `<button class="btn" id="${id}check">Tekshirish</button><div class="result" id="${id}res"></div>`;
}
function wireQuiz(t, id, after) {
  $('#' + id + 'check').onclick = () => {
    let score = 0;
    t.questions.forEach((q, i) => {
      const sel = document.querySelector(`input[name="${id}${i}"]:checked`);
      const ok = sel && +sel.value === q.answer;
      if (ok) score++;
      const box = $('#' + id + 'q' + i);
      box.className = 'q ' + (ok ? 'right' : 'wrong');
      box.querySelector('.why').hidden = false;
      box.querySelector('.why').textContent = (ok ? "To'g'ri. " : "To'g'ri javob: " + q.options[q.answer] + '. ') + q.why;
    });
    $('#' + id + 'res').textContent = `Natija: ${score}/${t.questions.length}`;
    addXP(score * 10);
    if (after) after();
  };
}

/* ---------- Reading ---------- */
function showReading(t) {
  $('#r-box').innerHTML = `<div class="passage"><h3>${esc(t.title)}</h3>${esc(t.passage)}</div><div>${quizHTML(t, 'r')}</div>`;
  wireQuiz(t, 'r');
}
showReading(SAMPLE);
$('#r-new').onclick = async e => {
  const b = e.target; b.disabled = true; $('#r-box').innerHTML = '<p class="loading">AI matn yozmoqda...</p>';
  try { showReading(await makeTest('reading', $('#r-topic').value)); }
  catch (err) { $('#r-box').innerHTML = '<p>Xato: ' + esc(err.message) + '</p>'; }
  b.disabled = false;
};

/* ---------- Listening ---------- */
let curL = SAMPLE;
function speak(text, rate, onend) {
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-GB'; u.rate = rate;
  const v = speechSynthesis.getVoices().find(v => v.lang.startsWith('en-GB')) || speechSynthesis.getVoices().find(v => v.lang.startsWith('en'));
  if (v) u.voice = v;
  if (onend) u.onend = onend;
  speechSynthesis.speak(u);
}
function showListening(t) {
  curL = t;
  $('#l-box').innerHTML = `<div class="audio"><button class="btn" id="l-play">Tinglash</button><button class="btn ghost" id="l-stop">To'xtatish</button><span class="hint">Matn yashirin. Avval tinglang, keyin savollarga javob bering.</span></div>${quizHTML(t, 'l')}<details><summary>Transkriptni ko'rsatish</summary><div class="passage" id="l-tr" hidden></div></details>`;
  const qs = $$('#l-box .q'); let k = 0;
  const st = document.createElement('div'); st.className = 'stepper';
  st.innerHTML = '<button class="btn ghost" id="l-p">Oldingi</button><b id="l-n"></b><button class="btn ghost" id="l-x">Keyingi</button>';
  qs[0].before(st);
  const sh = () => { qs.forEach((q, i) => q.hidden = i !== k); $('#l-n').textContent = (k + 1) + ' / ' + qs.length; };
  $('#l-p').onclick = () => { k = Math.max(0, k - 1); sh(); };
  $('#l-x').onclick = () => { k = Math.min(qs.length - 1, k + 1); sh(); };
  sh();
  $('#l-play').onclick = () => speak(t.passage, +$('#l-rate').value);
  $('#l-stop').onclick = () => speechSynthesis.cancel();
  wireQuiz(t, 'l', () => { $$('#l-box .q').forEach(q => q.hidden = false); $('.stepper').hidden = true; $('#l-tr').hidden = false; $('#l-tr').textContent = t.passage; });
}
showListening(SAMPLE);
$('#l-new').onclick = async e => {
  const b = e.target; b.disabled = true; $('#l-box').innerHTML = '<p class="loading">AI audio matn yozmoqda...</p>';
  try { showListening(await makeTest('listening', $('#l-topic').value)); }
  catch (err) { $('#l-box').innerHTML = '<p>Xato: ' + esc(err.message) + '</p>'; }
  b.disabled = false;
};

/* ---------- Speaking ---------- */
let sMsgs = [];
const SPK = part => `You are a friendly, professional IELTS Speaking examiner running Part ${part}. ` +
  (part == 1 ? 'Ask one short everyday question at a time (home, work, hobbies, food). ' :
   part == 2 ? 'First give a cue card (topic + 4 bullet points) and tell the candidate to speak for 1-2 minutes. Then ask 1 short follow-up. ' :
   'Ask one abstract, discussion-style question at a time linked to a theme, and follow up on their answers. ') +
  'Speak English only, keep each turn under 60 words, never give feedback during the test.';
function bubble(text, who) {
  const d = document.createElement('div'); d.className = 'msg ' + who; d.textContent = text;
  $('#s-chat').append(d); $('#s-chat').scrollTop = 1e6;
}
async function turn() {
  try {
    const r = await ai(SPK($('#s-part').value), sMsgs);
    sMsgs.push({ role: 'assistant', content: r }); bubble(r, 'ai'); speak(r, 1);
  } catch (err) { bubble('Xato: ' + err.message, 'ai'); }
}
$('#s-start').onclick = () => {
  sMsgs = [{ role: 'user', content: 'Hello, I am ready to start.' }];
  $('#s-chat').innerHTML = ''; turn();
};
function send() {
  const v = $('#s-in').value.trim();
  if (!v || !sMsgs.length) return;
  $('#s-in').value = ''; sMsgs.push({ role: 'user', content: v }); bubble(v, 'me'); addXP(5); turn();
}
$('#s-send').onclick = send;
$('#s-in').onkeydown = e => { if (e.key === 'Enter') send(); };
$('#s-end').onclick = async () => {
  if (sMsgs.length < 3) return;
  bubble('Natija hisoblanmoqda...', 'ai');
  try {
    const r = await ai(`You are an IELTS examiner. ${UZ} Score the candidate's answers: Fluency, Vocabulary, Grammar, Pronunciation (guess from text), each 1-9, then overall band. Give 3 concrete improvements with better example sentences.`,
      [{ role: 'user', content: sMsgs.filter(m => m.role === 'user').map(m => m.content).join('\n') }]);
    bubble(r, 'ai'); addXP(20);
  } catch (err) { bubble('Xato: ' + err.message, 'ai'); }
};
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
$('#s-mic').onclick = e => {
  if (!SR) return alert('Brauzeringiz mikrofonni qo\'llamaydi. Chrome yoki Edge ishlating.');
  const rec = new SR(); rec.lang = 'en-GB'; rec.interimResults = false;
  e.target.textContent = 'Eshitaman'; e.target.classList.add('live');
  rec.onresult = ev => { $('#s-in').value = ev.results[0][0].transcript; };
  rec.onend = () => { e.target.textContent = 'Gapir'; e.target.classList.remove('live'); };
  rec.start();
};

/* ---------- Writing ---------- */
const WQ = [
  'Some people think that governments should spend money on public transport rather than building new roads. To what extent do you agree or disagree?',
  'Many young people now spend more time online than with friends. Discuss the causes and suggest solutions.',
  'Some believe university education should be free for everyone. Others think students should pay. Discuss both views and give your opinion.',
  'Remote work is becoming common. Do the advantages outweigh the disadvantages?'
];
const newQ = () => { $('#w-q').textContent = WQ[Math.floor(Math.random() * WQ.length)]; };
newQ();
$('#w-new').onclick = newQ;
$('#w-text').oninput = () => { const n = ($('#w-text').value.match(/\S+/g) || []).length; $('#w-count').textContent = n + " so'z"; };
$('#w-send').onclick = async e => {
  const text = $('#w-text').value.trim();
  if (text.split(/\s+/).length < 50) return alert("Kamida 50 so'z yozing.");
  const out = $('#w-out'); out.className = 'out show'; out.innerHTML = '<span class="loading">Examiner tekshirmoqda...</span>';
  e.target.disabled = true;
  try {
    const r = await ai(`You are a strict IELTS Writing examiner. ${UZ} Score: Task Response, Coherence and Cohesion, Lexical Resource, Grammatical Range (each 1-9) and overall band. Then list the 3 biggest mistakes with corrected versions, and give 5 stronger vocabulary alternatives. Finish with one rewritten better paragraph.`,
      [{ role: 'user', content: 'Question: ' + $('#w-q').textContent + '\n\nEssay:\n' + text }]);
    out.textContent = r; addXP(30);
  } catch (err) { out.textContent = 'Xato: ' + err.message; }
  e.target.disabled = false;
};

/* ---------- Vocabulary (kartochkalar) ---------- */
let words = [
  { w: 'mitigate', uz: 'yumshatmoq', ex: 'Trees help mitigate the effects of pollution.' },
  { w: 'substantial', uz: 'sezilarli, katta', ex: 'There was a substantial increase in prices.' },
  { w: 'detrimental', uz: 'zararli', ex: 'Lack of sleep is detrimental to health.' },
  { w: 'advocate', uz: 'qo\'llab-quvvatlamoq', ex: 'Many experts advocate for shorter working weeks.' },
  { w: 'inevitable', uz: 'muqarrar', ex: 'Change is inevitable in a growing city.' },
  { w: 'sustainable', uz: 'barqaror', ex: 'We need sustainable sources of energy.' }
];
let wi = 0, flipped = false;
function showWord() {
  const x = words[wi];
  $('#v-card').innerHTML = flipped
    ? `<b>${esc(x.uz)}</b><p><i>${esc(x.ex)}</i></p>`
    : `<b>${esc(x.w)}</b><p class="hint">Javobni ko'rish uchun bosing</p>`;
  $('#v-pos').textContent = (wi + 1) + ' / ' + words.length;
}
$('#v-card').onclick = () => { flipped = !flipped; showWord(); if (flipped) { addXP(2); speak(words[wi].w, 0.9); } };
$('#v-next').onclick = () => { wi = (wi + 1) % words.length; flipped = false; showWord(); };
$('#v-prev').onclick = () => { wi = (wi - 1 + words.length) % words.length; flipped = false; showWord(); };
$('#v-new').onclick = async e => {
  e.target.disabled = true;
  try {
    const t = await ai('Reply with ONLY a JSON array, no markdown.', [{ role: 'user', content: `Give 10 IELTS band 8-9 level academic words about "${$('#v-topic').value || 'general topics'}". JSON: [{"w":"","uz":"uzbek translation","ex":"example sentence"}]` }]);
    words = JSON.parse(t.slice(t.indexOf('['), t.lastIndexOf(']') + 1)); wi = 0; flipped = false; showWord();
  } catch (err) { alert('Xato: ' + err.message); }
  e.target.disabled = false;
};
showWord();

let wt = null, wLeft = 2400;
$('#w-text').addEventListener('input', () => {
  if (wt) return;
  wt = setInterval(() => {
    wLeft = Math.max(0, wLeft - 1);
    $('#w-time').textContent = String(Math.floor(wLeft / 60)).padStart(2, '0') + ':' + String(wLeft % 60).padStart(2, '0');
    if (!wLeft) clearInterval(wt);
  }, 1000);
});
$('#w-new').addEventListener('click', () => { clearInterval(wt); wt = null; wLeft = 2400; $('#w-time').textContent = '40:00'; });

/* ---------- Ustoz: o'zbekcha, his-tuyg'uli Gemini ---------- */
const MOODS = {
  friend:   { tone: "iliq, do'stona, hazil bilan", style: 'Say in a friendly, warm tone', voice: 'Puck' },
  angry:    { tone: "qattiqqo'l va jahldor ohang (qat'iy, ba'zan koyiydi), LEKIN har doim so'ralgan yordamni to'liq va aniq beradi", style: 'Say in an angry, strict, raised-voice tone', voice: 'Kore' },
  guilty:   { tone: "aybdor: avvalgi qattiq gapi uchun pushaymon, kechirim so'raydi, ovozi past va uyatchan, keyin yumshoq o'rgatadi", style: 'Say in a guilty, apologetic, quiet tone', voice: 'Sulafat' },
  romantic: { tone: "romantik: shirin, mayin, she'riy so'zlar bilan ruhlantiradi (odobli, faqat motivatsiya)", style: 'Say in a soft, romantic, tender whisper', voice: 'Achernar' },
  happy:    { tone: "juda xursand, hayajonli, ko'p nido belgisi bilan", style: 'Say in an excited, joyful tone', voice: 'Puck' },
  sad:      { tone: "xafa, ozgina o'pkalagan, lekin o'quvchiga g'amxo'rlik qiladi", style: 'Say in a sad, sighing tone', voice: 'Charon' }
};
let mMsgs = [];
function mBubble(t, who) { const d = document.createElement('div'); d.className = 'msg ' + who; d.textContent = t; $('#m-chat').append(d); $('#m-chat').scrollTop = 1e6; return d; }
let ttsWarned = false, curAudio = null;
async function ttsBlob(text, style, voice, lang) {
  try {
    const r = await fetch('/api/tts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, style, voice, lang }) });
    if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || r.status); }
    return await r.blob();
  } catch (e) {
    console.log('Ovoz xatosi:', e.message);   // chatda ko'rsatilmaydi
    return null;
  }
}
function playBlob(b) {
  return new Promise(ok => {
    if (curAudio) curAudio.pause();
    curAudio = new Audio(URL.createObjectURL(b));
    curAudio.onended = curAudio.onerror = ok;
    curAudio.play().catch(ok);
  });
}
async function tts(text, style, voice, lang) { const b = await ttsBlob(text, style, voice, lang); if (!b) return false; await playBlob(b); return true; }
// Tez gapirish: birinchi gap alohida va darhol, qolgani parallel tayyorlanadi
async function say(text, mood, force) {
  if (!force && !$('#m-voice').checked) return;
  await tts(text, mood.style, mood.voice, 'uz-UZ');   // bitta so'rov: kunlik limitni tejaymiz
}
let mImg = null;
async function shrink(f) {
  const bmp = await createImageBitmap(f), k = Math.min(1, 1024 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return { mime: 'image/jpeg', data: c.toDataURL('image/jpeg', 0.8).split(',')[1] };
}
const setPic = t => { const x = $('#m-pic'); if (x) x.textContent = t; };
if ($('#m-img')) $('#m-img').onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  try { mImg = await shrink(f); setPic('Rasm tayyor: ' + f.name); } catch (err) { setPic("Rasmni o'qib bo'lmadi"); }
  e.target.value = '';
};
async function mSend() {
  let v = $('#m-in').value.trim();
  if (!v && !mImg) return;
  if (!v) v = 'Bu rasmda nima bor? Menga IELTS uchun foydali qilib tushuntir.';
  const mood = MOODS[$('#m-mood').value];
  const img = mImg; mImg = null; setPic('');
  $('#m-in').value = ''; mMsgs.push({ role: 'user', content: v, image: img || undefined }); mBubble((img ? '[rasm] ' : '') + v, 'me'); addXP(3);
  const t = document.createElement('div'); t.className = 'msg ai typing'; t.innerHTML = '<i></i><i></i><i></i>';
  $('#m-chat').append(t); $('#m-chat').scrollTop = 1e6;
  try {
    const hist = mMsgs.map((m, i) => i === mMsgs.length - 1 ? m : { role: m.role, content: m.content });
    const r = await ai(`Sen Bandly saytidagi IELTS ustozisan va o'zbek tilida gapirasan. BIRINCHI QOIDA: foydalanuvchi nimani so'rasa (lug'at, tushuntirish, misol, tuzatish, reja), uni DARHOL va TO'LIQ bajar. Hech qachon "o'zing qil" deb rad etma. Hozirgi his-tuyg'ung: ${mood.tone}. His-tuyg'u faqat ohangga ta'sir qiladi, yordamning sifatiga emas. Oddiy savolga 2-3 jumla, lug'at yoki ro'yxat yoki tushuntirish so'ralsa kerakli hajmda to'liq yoz (ro'yxat bo'lsa har so'z uchun tarjima va qisqa inglizcha misol bilan). O'zbek tilini lotin yozuvida, sodda va grammatik to'g'ri yoz. Inglizcha so'zni faqat IELTS atamalari va o'rgatilayotgan so'z/misollar uchun ishlat; oddiy so'zlarni o'zbekcha ayt va o'zbekcha so'zga inglizcha qo'shimcha ('ni, 'ingiz) qo'shma. Bilmagan o'zbekcha so'zni o'ylab topma. Emoji ishlatma.`, hist);
    t.remove(); mMsgs.push({ role: 'assistant', content: r }); const el = mBubble(r, 'ai');
    const sp = document.createElement('button'); sp.className = 'btn ghost spk'; sp.textContent = 'Tinglash'; sp.onclick = () => say(r, mood, true); el.append(sp);
    say(r, mood);
  } catch (err) { t.remove(); mBubble('Xato: ' + err.message, 'ai'); }
}
$('#m-send').onclick = mSend;
$('#m-in').onkeydown = e => { if (e.key === 'Enter') mSend(); };
$('#m-mic').onclick = e => {
  if (!SR) return alert('Chrome yoki Edge ishlating.');
  const rec = new SR(); rec.lang = 'uz-UZ';
  e.target.classList.add('live');
  rec.onresult = ev => { $('#m-in').value = ev.results[0][0].transcript; mSend(); };
  rec.onend = () => e.target.classList.remove('live');
  rec.start();
};
mBubble("Salom! Men sening IELTS ustozingman. Kayfiyatni tanla va yoz: bugun nimani mashq qilamiz?", 'ai');
