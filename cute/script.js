// 角色轮播
const roles = ['视觉设计师', '摄影师', 'AIGC 创作者', '品牌设计师', '可爱星球居民 🌸'];
const roleEl = document.getElementById('roles');
let roleIndex = 0;
setInterval(() => {
  roleIndex = (roleIndex + 1) % roles.length;
  const chip = roleEl.querySelector('.role-chip');
  chip.textContent = roles[roleIndex];
  chip.style.animation = 'none';
  void chip.offsetWidth;
  chip.style.animation = 'popIn .5s cubic-bezier(.2,1.4,.4,1)';
}, 2200);

// 漂浮小物
const sparkleChars = ['✨', '🎀', '🫧', '🌸', '⭐', '💖', '🍬', '🌈'];
const sparkles = document.getElementById('sparkles');
function spawnSparkle() {
  const s = document.createElement('span');
  s.className = 'spark';
  s.textContent = sparkleChars[Math.floor(Math.random() * sparkleChars.length)];
  s.style.left = Math.random() * 100 + 'vw';
  s.style.fontSize = (16 + Math.random() * 18) + 'px';
  s.style.animationDuration = (7 + Math.random() * 7) + 's';
  sparkles.appendChild(s);
  setTimeout(() => s.remove(), 15000);
}
setInterval(spawnSparkle, 900);

// 渲染作品集
const worksGrid = document.getElementById('worksGrid');
worksGrid.innerHTML = WORKS.map(w => `
  <article class="pf-card" data-id="${w.id}">
    <span class="pf-idx">${w.index}</span>
    <div class="pf-media"><img src="${w.cover}" alt="${w.title}" loading="lazy" decoding="async" /></div>
    <div class="pf-body">
      <h3>${w.title} <span class="pf-en">${w.titleEn}</span></h3>
      <p class="pf-meta">${w.category} · ${w.year}</p>
      <div class="pf-tags">${w.tags.map(t => `<span>${t}</span>`).join('')}</div>
    </div>
  </article>`).join('');

// 作品弹层
const modal = document.getElementById('workModal');
const modalImg = document.getElementById('modalImg');
const modalIdx = document.getElementById('modalIdx');
const modalTitle = document.getElementById('modalTitle');
const modalSub = document.getElementById('modalSub');
const modalThumbs = document.getElementById('modalThumbs');
const modalTags = document.getElementById('modalTags');
const modalDesc = document.getElementById('modalDesc');
let curSeries = 0, curImg = 0;

function allImages(w) { return [w.cover, ...w.gallery]; }

function renderModal() {
  const w = WORKS[curSeries];
  const all = allImages(w);
  curImg = (curImg + all.length) % all.length;
  modalIdx.textContent = w.index;
  modalTitle.textContent = w.title;
  modalSub.textContent = `${w.titleEn} · ${w.category} · ${w.year}`;
  modalImg.src = all[curImg];
  modalImg.alt = w.title;
  modalTags.innerHTML = w.tags.map(t => `<span>${t}</span>`).join('');
  modalDesc.textContent = w.desc;
  modalThumbs.innerHTML = all.map((src, i) =>
    `<img src="${src}" class="${i === curImg ? 'active' : ''}" data-i="${i}" alt="" loading="lazy" decoding="async" />`).join('');
}

function openModal(id) {
  curSeries = WORKS.findIndex(w => w.id === id);
  curImg = 0;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  renderModal();
}
function closeModal() {
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

worksGrid.addEventListener('click', (e) => {
  const card = e.target.closest('.pf-card');
  if (card) openModal(card.dataset.id);
});
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalBackdrop').addEventListener('click', closeModal);
document.getElementById('modalPrev').addEventListener('click', () => { curImg--; renderModal(); });
document.getElementById('modalNext').addEventListener('click', () => { curImg++; renderModal(); });
document.getElementById('modalPrevSeries').addEventListener('click', () => { curSeries = (curSeries - 1 + WORKS.length) % WORKS.length; curImg = 0; renderModal(); });
document.getElementById('modalNextSeries').addEventListener('click', () => { curSeries = (curSeries + 1) % WORKS.length; curImg = 0; renderModal(); });
modalThumbs.addEventListener('click', (e) => {
  const img = e.target.closest('img[data-i]');
  if (img) { curImg = Number(img.dataset.i); renderModal(); }
});
document.addEventListener('keydown', (e) => {
  if (!modal.classList.contains('open')) return;
  if (e.key === 'Escape') closeModal();
  if (e.key === 'ArrowLeft') curImg--, renderModal();
  if (e.key === 'ArrowRight') curImg++, renderModal();
});

// 滚动渐显
const revealEls = document.querySelectorAll('.reveal');
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: 0.12 });
revealEls.forEach(el => io.observe(el));

// 导航高亮
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a');
const nav = document.getElementById('nav');
const navObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
    }
  });
}, { rootMargin: '-45% 0px -50% 0px' });
sections.forEach(s => navObserver.observe(s));

// 移动端菜单
const menuBtn = document.getElementById('menuBtn');
menuBtn.addEventListener('click', () => nav.classList.toggle('open'));
navLinks.forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));
