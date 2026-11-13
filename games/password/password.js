// لعبة باسورد
//
// القواعد: تيمين. الحكم معاه الموبايل وبيوري اسم اللاعب لواحد من كل تيم.
// كل تيم في دوره بيدّي هنت واحد لفرقته وليه 30 ثانية. الوقت يخلص = الدور للتيم التاني.
// لما حد يجيبه صح الحكم يدوس "صح" ويختار النقطة لأنهي تيم.
//
// إزاي الكود شغال: كل حاجة في object واحد اسمه state.
// أي زرار بيغيّر الـ state، وبعدين render() بترسم الشاشة من جديد حسب state.screen وتحفظ.
// الشاشات: setup → reveal → turn → award → point → (reveal تاني) ... → winner

import { save, load } from '../../storage.js';

const TURN_SECONDS = 30;
const SAVE_KEY = 'password';

let root;          // الـ div اللي بنرسم فيه
let goHome;        // function بترجع للرئيسية
let players = [];  // من players.json
let state;         // كل حالة اللعبة
let previous;      // لعبة قديمة لسه ما خلصتش (عشان زرار "كمّل")
let ticker;        // الـ interval بتاع العدّاد

async function start(container, onExit) {
  root = container;
  goHome = onExit;
  root.onclick = handleClick;

  if (players.length === 0) {
    const response = await fetch(new URL('players.json', import.meta.url));
    players = await response.json();
  }

  const saved = load(SAVE_KEY);
  previous = saved && saved.screen !== 'winner' ? saved : null;

  state = {
    screen: 'setup',
    teams: saved
      ? saved.teams.map((t) => ({ name: t.name, score: 0 }))
      : [{ name: 'التيم الأول', score: 0 }, { name: 'التيم التاني', score: 0 }],
    target: saved ? saved.target : 5,
  };
  render();
}

// ---------- الأزرار ----------
// كل زرار في الـ HTML عليه data-action باسم function من هنا.

const actions = {
  newGame() {
    const name0 = document.getElementById('team0').value.trim() || 'التيم الأول';
    const name1 = document.getElementById('team1').value.trim() || 'التيم التاني';
    const target = Math.max(1, parseInt(document.getElementById('target').value) || 5);

    state = {
      screen: 'reveal',
      teams: [{ name: name0, score: 0 }, { name: name1, score: 0 }],
      target,
      starter: 0,      // التيم اللي بيبدأ اللاعب الحالي
      turn: 0,         // التيم اللي عليه الدور دلوقتي
      player: null,
      revealed: false, // الاسم ظاهر في شاشة reveal ولا لأ
      used: [],        // أسامي اتلعبت
      turnEndsAt: 0,   // الوقت اللي الدور بيخلص فيه (timestamp)
      lastScorer: null,
    };
    newPlayer();
  },

  resume() {
    state = previous;
    if (state.screen === 'turn' && Date.now() > state.turnEndsAt) passTurn();
  },

  reveal() {
    state.revealed = true;
  },

  startTimer() {
    state.screen = 'turn';
    state.turn = state.starter;
    state.turnEndsAt = Date.now() + TURN_SECONDS * 1000;
  },

  changePlayer() {
    newPlayer(); // من غير نقط لحد
  },

  correct() {
    state.screen = 'award';
  },

  backToTurn() {
    state.screen = 'turn';
  },

  award(teamIndex) {
    const team = state.teams[Number(teamIndex)];
    team.score++;
    state.lastScorer = Number(teamIndex);
    state.screen = team.score >= state.target ? 'winner' : 'point';
  },

  nextPlayer() {
    state.starter = 1 - state.starter; // اللاعب الجديد يبدأه التيم التاني
    newPlayer();
  },

  playAgain() {
    previous = null;
    state = {
      screen: 'setup',
      teams: state.teams.map((t) => ({ name: t.name, score: 0 })),
      target: state.target,
    };
  },

  home() {
    clearInterval(ticker);
    goHome();
  },
};

function handleClick(event) {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  actions[action](button.dataset.value);
  if (action !== 'home') render();
}

// ---------- لوجيك مساعد ----------

function newPlayer() {
  let available = players.filter((p) => !state.used.includes(p.name));
  if (available.length === 0) {
    state.used = []; // خلصنا كل الأسامي، نبدأ من الأول
    available = players;
  }
  const player = available[Math.floor(Math.random() * available.length)];
  state.player = player.name;
  state.used.push(player.name);
  state.revealed = false;
  state.screen = 'reveal';
}

function passTurn() {
  state.turn = 1 - state.turn;
  state.turnEndsAt = Date.now() + TURN_SECONDS * 1000;
  if (navigator.vibrate) navigator.vibrate(300);
}

function secondsLeft() {
  return Math.ceil((state.turnEndsAt - Date.now()) / 1000);
}

// بيحدّث رقم العدّاد بس من غير ما يرسم الشاشة كلها
function startTicker() {
  ticker = setInterval(() => {
    const left = secondsLeft();
    if (left <= 0) {
      passTurn();
      render();
      return;
    }
    const timer = document.getElementById('timer');
    timer.textContent = left;
    timer.classList.toggle('danger', left <= 5);
  }, 250);
}

// ---------- الرسم ----------

function render() {
  clearInterval(ticker);
  root.innerHTML = header() + screens[state.screen]();
  if (state.screen === 'turn') startTicker();
  if (state.screen !== 'setup') save(SAVE_KEY, state);
}

function header() {
  const [a, b] = state.teams;
  const score = state.screen === 'setup' ? '' : `
    <div class="score">
      <span>${esc(a.name)} <b>${a.score}</b></span>
      <span class="muted">من ${state.target}</span>
      <span><b>${b.score}</b> ${esc(b.name)}</span>
    </div>`;
  return `<header class="bar"><button class="link" data-action="home">الرئيسية</button>${score}</header>`;
}

const screens = {
  setup: () => `
    <main class="screen">
      <h1>باسورد</h1>
      <p class="muted">
        الحكم معاه الموبايل وبيوري اسم اللاعب لواحد من كل تيم.
        كل تيم في دوره بيدّي هنت واحد لفرقته وليه ${TURN_SECONDS} ثانية.
      </p>
      <label>التيم الأول <input id="team0" maxlength="20" value="${esc(state.teams[0].name)}"></label>
      <label>التيم التاني <input id="team1" maxlength="20" value="${esc(state.teams[1].name)}"></label>
      <label>النقط اللازمة للفوز <input id="target" type="number" inputmode="numeric" min="1" max="50" value="${state.target}"></label>
      <div class="actions">
        <button class="primary" data-action="newGame">ابدأ</button>
        ${previous ? '<button class="secondary" data-action="resume">كمّل اللعبة اللي فاتت</button>' : ''}
      </div>
    </main>`,

  reveal: () => state.revealed ? `
    <main class="screen center">
      <p class="muted">اللاعب</p>
      <p class="big">${esc(state.player)}</p>
      <div class="actions">
        <button class="primary" data-action="startTimer">ابدأ الوقت</button>
        <button class="secondary" data-action="changePlayer">غيّر اللاعب</button>
      </div>
    </main>` : `
    <main class="screen center">
      <p class="title">ورّي الاسم للي بيدّوا الهنت بس</p>
      <p class="muted">${esc(teamName(state.starter))} هيبدأ</p>
      <div class="actions">
        <button class="primary" data-action="reveal">اظهر اللاعب</button>
      </div>
    </main>`,

  turn: () => `
    <main class="screen center">
      <p class="title">دور ${esc(teamName(state.turn))}</p>
      <p id="timer" class="timer">${Math.max(0, secondsLeft())}</p>
      <p class="muted">${esc(state.player)}</p>
      <div class="actions">
        <button class="primary huge" data-action="correct">صح ✓</button>
        <button class="link" data-action="changePlayer">غيّر اللاعب</button>
      </div>
    </main>`,

  award: () => `
    <main class="screen center">
      <p class="title">النقطة لمين؟</p>
      <div class="actions">
        <button class="primary" data-action="award" data-value="0">${esc(teamName(0))}</button>
        <button class="primary" data-action="award" data-value="1">${esc(teamName(1))}</button>
        <button class="link" data-action="backToTurn">رجوع</button>
      </div>
    </main>`,

  point: () => `
    <main class="screen center">
      <p class="title">نقطة لـ ${esc(teamName(state.lastScorer))}</p>
      <p class="big">${esc(state.player)}</p>
      <div class="actions">
        <button class="primary" data-action="nextPlayer">اللاعب اللي بعده</button>
      </div>
    </main>`,

  winner: () => `
    <main class="screen center">
      <p class="muted">الفايز</p>
      <p class="big">${esc(teamName(state.lastScorer))} 🏆</p>
      <div class="actions">
        <button class="primary" data-action="playAgain">العب تاني</button>
        <button class="secondary" data-action="home">الرئيسية</button>
      </div>
    </main>`,
};

function teamName(index) {
  return state.teams[index].name;
}

// عشان أسامي التيمات اللي بيكتبها المستخدم ما تكسرش الـ HTML
function esc(text) {
  return String(text).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

export default {
  title: 'باسورد',
  description: 'هنت واحد في الدور، و30 ثانية للتخمين',
  start,
};
