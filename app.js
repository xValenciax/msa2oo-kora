// الشاشة الرئيسية: list بالألعاب.
// كل لعبة بتصدّر { title, description, start(root, goHome) }.
// عشان تضيف لعبة جديدة: اعمل import ليها وضيفها في games.

import password from './games/password/password.js';

const games = [password];

const root = document.getElementById('app');

function showHome() {
  root.innerHTML = `
    <main class="screen">
      <h1>مساءو كورة</h1>
      <p class="muted">اختار اللعبة وابدأ على طول</p>
      <div class="list">
        ${games.map((game, i) => `
          <button class="card" data-game="${i}">
            <strong>${game.title}</strong>
            <span>${game.description}</span>
          </button>
        `).join('')}
        <div class="card disabled">
          <strong>ألعاب تانية</strong>
          <span>قريبًا</span>
        </div>
      </div>
    </main>
  `;

  root.onclick = (event) => {
    const button = event.target.closest('[data-game]');
    if (button) games[button.dataset.game].start(root, showHome);
  };
}

showHome();

// عشان الأبليكشن يشتغل أوفلاين ويتنزل على الموبايل
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}
