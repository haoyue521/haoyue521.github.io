/* ============================================================
 * 彩色站 · Living Green — 交互脚本
 * 作品马赛克 / 弹层 / 入场 is-ready / 指针视差 / 滚动显现
 * ============================================================ */
(function () {
  'use strict';

  var W = '../cute/assets/works/';

  /* ── 作品数据（沿用） ── */
  var WORKS = [
    { t: '唐凤',          n: '01', img: W + 'tangfeng/work-1.jpeg' },
    { t: '惊鸿',          n: '02', img: W + 'jinghong/work-1.jpeg' },
    { t: '裂缝',          n: '03', img: W + 'liefeng/work-1.jpeg' },
    { t: '千户苗疆',      n: '04', img: W + 'qianhu/work-1.jpeg' },
    { t: '观',            n: '05', img: W + 'guan/work-1.png' },
    { t: '古典摄影',      n: '06', img: W + 'classic/classic-1.jpg' },
    { t: '杀青',          n: '07', img: W + 'shaqing/shaqing-1.jpg' },
    { t: '唐凤·贰',       n: '01', img: W + 'tangfeng/work-2.jpeg' },
    { t: '惊鸿·贰',       n: '02', img: W + 'jinghong/work-2.jpeg' },
    { t: '苗疆·贰',       n: '04', img: W + 'qianhu/work-2.jpeg' },
    { t: '观·贰',         n: '05', img: W + 'guan/work-2.png' },
    { t: '古典·贰',       n: '06', img: W + 'classic/classic-2.jpg' }
  ];

  /* ── 作品马赛克 ── */
  var mo = document.getElementById('mosaic');
  if (mo) {
    mo.innerHTML = WORKS.map(function (w) {
      return '<div class="t" data-img="' + w.img + '" data-t="' + w.t + '">' +
        '<img src="' + w.img + '" alt="' + w.t + '" loading="lazy" decoding="async"/>' +
        '<span class="n">' + w.n + '</span>' +
        '<span class="cap">' + w.t + '</span></div>';
    }).join('');
  }

  /* ── 弹层 ── */
  var modal = document.getElementById('modal');
  var mimg = document.getElementById('mimg');
  var mcap = document.getElementById('mcap');
  if (mo && modal) {
    mo.addEventListener('click', function (e) {
      var t = e.target.closest('.t');
      if (!t) return;
      mimg.src = t.getAttribute('data-img');
      mcap.textContent = t.getAttribute('data-t');
      modal.classList.add('open');
    });
  }
  function closeModal() { if (modal) modal.classList.remove('open'); }
  if (document.getElementById('mclose')) document.getElementById('mclose').onclick = closeModal;
  if (document.getElementById('mback')) document.getElementById('mback').onclick = closeModal;
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

  /* ── 入场：is-ready ── */
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      document.body.classList.add('is-ready');
    });
  });

  /* ── 指针视差（写入 .hero 的 --px/--py，CSS 端计算） ── */
  var hero = document.getElementById('top');
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mx = 0, my = 0, sx = 0, sy = 0, has = false, ticking = false;

  function onMove(e) {
    if (e.pointerType === 'touch' || !hero) return;
    mx = (e.clientX / window.innerWidth) * 2 - 1;
    my = (e.clientY / window.innerHeight) * 2 - 1;
    has = true;
    if (!ticking) { ticking = true; requestAnimationFrame(tick); }
  }
  function tick() {
    ticking = false;
    if (!hero) return;
    sx += (mx - sx) * 0.06;
    sy += (my - sy) * 0.06;
    hero.style.setProperty('--px', sx.toFixed(3));
    hero.style.setProperty('--py', sy.toFixed(3));
    if (has) { ticking = true; requestAnimationFrame(tick); }
  }
  if (!reduced && hero && window.PointerEvent) {
    window.addEventListener('pointermove', onMove, { passive: true });
  }

  /* ── 滚动显现 ── */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }
})();
