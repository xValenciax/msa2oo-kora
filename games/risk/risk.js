// لعبة ريسك
//
// القواعد: تيمين وحكم معاه الموبايل.
// البورد فيه 4 كاتيجوري، وكل كاتيجوري فيها أسئلة بـ 5 و10 و20 و40 نقطة (كل ما النقط تزيد السؤال يصعب).
// الأسئلة مخفية. التيم اللي عليه الدور بيقول للحكم عايز أنهي كاتيجوري بكام نقطة، والحكم يفتح السؤال ويقراه.
// تيم الدور بس اللي يجاوب، وليه 30 ثانية. لو جاوب غلط أو الوقت خلص، نقط السؤال بتروح على الكل.
// في سؤال واحد بس في البورد كله «دابل» بضعف النقط. الحكم بيختاره في السر قبل اللعب.
//
// الكروت (كل تيم معاه كل كارت مرة واحدة في اللعبة):
// - السرقة: التيم التاني ياخد السؤال ويجاوب هو. صح = النقط ليه، غلط = مفيش خصم.
//   ده الكارت الوحيد اللي بيتلعب في دور التيم التاني.
// - وقت زيادة: تيم الدور ياخد EXTRA_SECONDS ثانية زيادة.
// - اختيارات: الحكم يقرا 4 اختيارات للإجابة.
//
// إزاي الكود شغال: زي باسورد بالظبط. كل حاجة في state، وأي زرار بيغيّره، وrender() بترسم state.screen وتحفظ.
// الشاشات: setup → double → board → question → result → (board تاني) ... → winner

import { save, load } from '../../storage.js';

const TURN_SECONDS = 30;
const EXTRA_SECONDS = 15;
const POINTS = [5, 10, 20, 40];
const CATEGORY_COUNT = 4;
// الـ v2: لما الأسئلة اتغيّرت كلها، عشان أي لعبة أو تاريخ قديم يتمسح ونبدأ على نضيف
const SAVE_KEY = 'risk-v2';
const SEEN_KEY = 'risk-seen-v2'; // الأسئلة اللي اتلعبت قبل كده، عشان ما تتكررش

const CARDS = {
  steal: 'سرقة',
  time: `+${EXTRA_SECONDS} ثانية`,
  choices: 'اختيارات',
};

let root;
let goHome;
let categories = [];  // من questions.json
let state;
let previous;         // لعبة قديمة لسه ما خلصتش
let ticker;

async function start(container, onExit) {
  root = container;
  goHome = onExit;
  root.onclick = handleClick;

  if (categories.length === 0) {
    const response = await fetch(new URL('questions.json', import.meta.url));
    categories = (await response.json()).categories;
  }

  const saved = load(SAVE_KEY);
  previous = saved && saved.screen !== 'winner' ? saved : null;

  state = {
    screen: 'setup',
    teams: saved
      ? saved.teams.map((t) => ({ name: t.name }))
      : [{ name: 'التيم الأول' }, { name: 'التيم التاني' }],
    picked: randomCategories(),
  };
  render();
}

// ---------- الأزرار ----------

const actions = {
  toggleCategory(value) {
    keepNames();
    const index = Number(value);
    const picked = state.picked;
    if (picked.includes(index)) state.picked = picked.filter((i) => i !== index);
    else if (picked.length < CATEGORY_COUNT) picked.push(index);
  },

  shuffleCategories() {
    keepNames();
    state.picked = randomCategories();
  },

  newGame() {
    if (state.picked.length !== CATEGORY_COUNT) return;
    const name0 = document.getElementById('team0').value.trim() || 'التيم الأول';
    const name1 = document.getElementById('team1').value.trim() || 'التيم التاني';
    const fullCards = () => ({ steal: true, time: true, choices: true });

    state = {
      screen: 'double',
      teams: [
        { name: name0, score: 0, cards: fullCards() },
        { name: name1, score: 0, cards: fullCards() },
      ],
      cats: state.picked.slice().sort((a, b) => a - b),
      done: [],      // الخانات اللي اتلعبت، زي "0-20"
      double: null,  // الخانة الدابل
      turn: 0,       // التيم اللي عليه الدور
      q: null,       // السؤال المفتوح دلوقتي
      last: null,    // نتيجة آخر سؤال
    };
  },

  resume() {
    state = previous;
  },

  // الحكم بيختار الخانة الدابل في السر
  pickDouble(cell) {
    state.double = cell;
    state.screen = 'board';
  },

  randomDouble() {
    const c = Math.floor(Math.random() * CATEGORY_COUNT);
    const p = POINTS[Math.floor(Math.random() * POINTS.length)];
    state.double = `${c}-${p}`;
    state.screen = 'board';
  },

  openCell(cell) {
    if (state.done.includes(cell)) return;
    const [c, p] = cell.split('-').map(Number);
    const item = pickQuestion(state.cats[c], p);
    state.q = {
      cell,
      cat: c,
      points: p,
      double: cell === state.double,
      text: item.q,
      answer: item.a,
      choices: shuffle([item.a, ...item.wrong]),
      showChoices: false,
      showAnswer: false,
      answering: state.turn,
      stolen: false,
      endsAt: null,  // null = الوقت لسه ما بدأش
    };
    state.screen = 'question';
  },

  startTimer() {
    state.q.endsAt = Date.now() + TURN_SECONDS * 1000;
  },

  useSteal() {
    const thief = 1 - state.turn;
    if (!state.teams[thief].cards.steal || state.q.stolen) return;
    state.teams[thief].cards.steal = false;
    state.q.stolen = true;
    state.q.answering = thief;
    // التيم اللي سرق ياخد 30 ثانية جديدة لو الوقت كان شغال
    if (state.q.endsAt) state.q.endsAt = Date.now() + TURN_SECONDS * 1000;
  },

  useTime() {
    const team = state.teams[state.turn];
    if (!team.cards.time || state.q.stolen || !state.q.endsAt || timeUp()) return;
    team.cards.time = false;
    state.q.endsAt += EXTRA_SECONDS * 1000;
  },

  useChoices() {
    const team = state.teams[state.turn];
    if (!team.cards.choices || state.q.stolen) return;
    team.cards.choices = false;
    state.q.showChoices = true;
  },

  toggleAnswer() {
    state.q.showAnswer = !state.q.showAnswer;
  },

  judge(value) {
    const correct = value === 'yes';
    const q = state.q;
    const points = questionValue(q);
    if (correct) state.teams[q.answering].score += points;
    state.last = { correct, team: q.answering, points, answer: q.answer, stolen: q.stolen, double: q.double };
    state.done.push(q.cell);
    state.q = null;
    state.turn = 1 - state.turn; // الدور يتقلب حتى لو السؤال اتسرق
    state.screen = 'result';
  },

  next() {
    state.screen = state.done.length === CATEGORY_COUNT * POINTS.length ? 'winner' : 'board';
  },

  playAgain() {
    previous = null;
    state = {
      screen: 'setup',
      teams: state.teams.map((t) => ({ name: t.name })),
      picked: randomCategories(),
    };
  },

  home() {
    clearInterval(ticker);
    goHome();
  },
};

function handleClick(event) {
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  const action = button.dataset.action;
  actions[action](button.dataset.value);
  if (action !== 'home') render();
}

// ---------- لوجيك مساعد ----------

// عشان الأسامي اللي اتكتبت ما تضيعش لما الشاشة تترسم تاني
function keepNames() {
  state.teams[0].name = document.getElementById('team0').value;
  state.teams[1].name = document.getElementById('team1').value;
}

function randomCategories() {
  return shuffle(categories.map((_, i) => i)).slice(0, CATEGORY_COUNT);
}

function shuffle(list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// بيختار سؤال ما اتلعبش قبل كده. لو أسئلة الخانة دي خلصت، نبدأ من الأول.
function pickQuestion(catIndex, points) {
  const list = categories[catIndex].questions[points];
  const seen = load(SEEN_KEY) || [];
  const id = (i) => `${categories[catIndex].name}|${points}|${list[i].q}`;
  let options = list.map((_, i) => i).filter((i) => !seen.includes(id(i)));
  let kept = seen;
  if (options.length === 0) {
    kept = seen.filter((s) => !s.startsWith(`${categories[catIndex].name}|${points}|`));
    options = list.map((_, i) => i);
  }
  const pick = options[Math.floor(Math.random() * options.length)];
  save(SEEN_KEY, [...kept, id(pick)]);
  return list[pick];
}

function questionValue(q) {
  return q.double ? q.points * 2 : q.points;
}

function secondsLeft() {
  return Math.max(0, Math.ceil((state.q.endsAt - Date.now()) / 1000));
}

function timeUp() {
  return state.q.endsAt !== null && Date.now() >= state.q.endsAt;
}

// بيحدّث العدّاد بس، ولما الوقت يخلص يرسم الشاشة تاني
function startTicker() {
  ticker = setInterval(() => {
    if (timeUp()) {
      if (navigator.vibrate) navigator.vibrate(300);
      render();
      return;
    }
    const left = secondsLeft();
    const timer = document.getElementById('timer');
    timer.textContent = left;
    timer.classList.toggle('danger', left <= 5);
  }, 250);
}

// ---------- الرسم ----------

function render() {
  clearInterval(ticker);
  root.innerHTML = header() + screens[state.screen]();
  if (state.screen === 'question' && state.q.endsAt && !timeUp()) startTicker();
  if (state.screen !== 'setup') save(SAVE_KEY, state);
}

function header() {
  const score = ['setup', 'double'].includes(state.screen) ? '' : `
    <div class="score">
      <span>${esc(teamName(0))} <b>${state.teams[0].score}</b></span>
      <span><b>${state.teams[1].score}</b> ${esc(teamName(1))}</span>
    </div>`;
  return `<header class="bar"><button class="link" data-action="home">الرئيسية</button>${score}</header>`;
}

// شبكة البورد. clickable = الأكشن اللي بيتنفّذ لما خانة تتداس
function grid(action, { hideDone = true } = {}) {
  const heads = state.cats.map((c) => `<div class="cat">${esc(categories[c].name)}</div>`).join('');
  const cells = POINTS.map((p) => state.cats.map((_, c) => {
    const cell = `${c}-${p}`;
    const done = hideDone && state.done.includes(cell);
    return done
      ? '<div class="cell done"></div>'
      : `<button class="cell" data-action="${action}" data-value="${cell}">${p}</button>`;
  }).join('')).join('');
  return `<div class="board">${heads}${cells}</div>`;
}

function cardsRow(teamIndex) {
  const cards = state.teams[teamIndex].cards;
  return `
    <div class="cards-row">
      <span>${esc(teamName(teamIndex))}</span>
      ${Object.keys(CARDS).map((k) => `<span class="chip ${cards[k] ? '' : 'used'}">${CARDS[k]}</span>`).join('')}
    </div>`;
}

const screens = {
  setup: () => `
    <main class="screen">
      <h1>ريسك</h1>
      <p class="muted">
        4 كاتيجوري، وكل واحدة فيها أسئلة بـ 5 و10 و20 و40 نقطة.
        التيم اللي عليه الدور يختار، والحكم يقرا السؤال، ولتيم الدور ${TURN_SECONDS} ثانية يجاوب.
        كل تيم معاه 3 كروت: سرقة، وقت زيادة، اختيارات.
      </p>
      <label>التيم الأول <input id="team0" maxlength="20" value="${esc(teamName(0))}"></label>
      <label>التيم التاني <input id="team1" maxlength="20" value="${esc(teamName(1))}"></label>
      <div class="field">
        <div class="field-head">
          <strong>اختار ${CATEGORY_COUNT} كاتيجوري (${state.picked.length}/${CATEGORY_COUNT})</strong>
          <button class="link" data-action="shuffleCategories">عشوائي</button>
        </div>
        <div class="chips scroll">
          ${categories.map((c, i) => `
            <button class="chip pick ${state.picked.includes(i) ? 'on' : ''}" data-action="toggleCategory" data-value="${i}">${esc(c.name)}</button>
          `).join('')}
        </div>
      </div>
      <div class="actions">
        <button class="primary" data-action="newGame" ${state.picked.length === CATEGORY_COUNT ? '' : 'disabled'}>ابدأ</button>
        ${previous ? '<button class="secondary" data-action="resume">كمّل اللعبة اللي فاتت</button>' : ''}
      </div>
    </main>`,

  double: () => `
    <main class="screen">
      <p class="title">للحكم بس 🤫</p>
      <p class="muted">اختار السؤال الدابل (بضعف النقط). محدش يشوف الشاشة دي غيرك.</p>
      ${grid('pickDouble', { hideDone: false })}
      <div class="actions">
        <button class="secondary" data-action="randomDouble">اختار عشوائي</button>
      </div>
    </main>`,

  board: () => `
    <main class="screen">
      <p class="title center-text">الدور على ${esc(teamName(state.turn))}</p>
      <p class="muted center-text">التيم يقول للحكم الكاتيجوري والنقط</p>
      ${grid('openCell')}
      <div class="cards-box">
        ${cardsRow(0)}
        ${cardsRow(1)}
      </div>
    </main>`,

  question: () => {
    const q = state.q;
    const turnTeam = state.teams[state.turn];
    const thief = state.teams[1 - state.turn];
    const started = q.endsAt !== null;
    const over = timeUp();
    const canUse = (card) => turnTeam.cards[card] && !q.stolen;

    return `
    <main class="screen">
      <div class="q-meta">
        <span>${esc(categories[state.cats[q.cat]].name)}</span>
        <span>${questionValue(q)} نقطة</span>
      </div>
      ${q.double ? `<p class="banner">سؤال دابل! بقى بـ ${questionValue(q)} نقطة بدل ${q.points}</p>` : ''}
      ${q.stolen ? `<p class="banner steal">${esc(teamName(q.answering))} سرق السؤال</p>` : ''}
      <p class="question">${esc(q.text)}</p>

      ${q.showChoices ? `<ol class="choices">${q.choices.map((c) => `<li>${esc(c)}</li>`).join('')}</ol>` : ''}

      <div class="answer-box">
        <button class="link" data-action="toggleAnswer">${q.showAnswer ? 'اخفي الإجابة' : 'اظهر الإجابة (للحكم)'}</button>
        ${q.showAnswer ? `<p class="answer">${esc(q.answer)}</p>` : ''}
      </div>

      <div class="center-text">
        <p class="muted">بيجاوب: ${esc(teamName(q.answering))}</p>
        ${!started
          ? `<button class="primary" data-action="startTimer">ابدأ الـ ${TURN_SECONDS} ثانية</button>`
          : over
            ? '<p class="timer small danger">الوقت خلص</p>'
            : `<p id="timer" class="timer small">${secondsLeft()}</p>`}
      </div>

      <div class="card-buttons">
        <button class="secondary" data-action="useChoices" ${canUse('choices') ? '' : 'disabled'}>اختيارات</button>
        <button class="secondary" data-action="useTime" ${canUse('time') && started && !over ? '' : 'disabled'}>+${EXTRA_SECONDS} ثانية</button>
        <button class="secondary steal-btn" data-action="useSteal" ${thief.cards.steal && !q.stolen ? '' : 'disabled'}>سرقة (${esc(thief.name)})</button>
      </div>

      <div class="judge">
        <button class="primary" data-action="judge" data-value="yes">صح ✓</button>
        <button class="secondary danger-btn" data-action="judge" data-value="no">غلط ✗</button>
      </div>
    </main>`;
  },

  result: () => {
    const r = state.last;
    const title = r.correct
      ? `+${r.points} لـ ${esc(teamName(r.team))}`
      : r.stolen ? 'السرقة فشلت، مفيش نقط' : `النقط راحت على ${esc(teamName(r.team))}`;
    return `
    <main class="screen center">
      <p class="title">${title}</p>
      <p class="muted">الإجابة</p>
      <p class="big">${esc(r.answer)}</p>
      <div class="actions">
        <button class="primary" data-action="next">${state.done.length === CATEGORY_COUNT * POINTS.length ? 'النتيجة' : `الدور على ${esc(teamName(state.turn))}`}</button>
      </div>
    </main>`;
  },

  winner: () => {
    const [a, b] = state.teams;
    const text = a.score === b.score ? 'تعادل 🤝' : `${esc(a.score > b.score ? a.name : b.name)} 🏆`;
    return `
    <main class="screen center">
      <p class="muted">${a.score === b.score ? 'النتيجة' : 'الفايز'}</p>
      <p class="big">${text}</p>
      <p class="title">${a.score} - ${b.score}</p>
      <div class="actions">
        <button class="primary" data-action="playAgain">العب تاني</button>
        <button class="secondary" data-action="home">الرئيسية</button>
      </div>
    </main>`;
  },
};

function teamName(index) {
  return state.teams[index].name;
}

function esc(text) {
  return String(text).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

export default {
  title: 'ريسك',
  description: 'اختار الكاتيجوري والنقط، وجاوب في 30 ثانية',
  start,
};
