/* ============================================================
 * splash.js — 三站风格化「入场拉开屏」
 * 每个站按自身风格显示短暂的开场屏（品牌标识 + 加载条），
 * 页面就绪后整屏向上拉开退场，露出站点。
 * 用法：<body data-splash="dark|cute|green"> + 引入本脚本
 * - 遵循 prefers-reduced-motion（无动画，快速淡出）
 * - 无第三方依赖；样式由脚本注入，不改动各站 CSS
 * ============================================================ */
(function () {
  'use strict';

  var THEMES = {
    dark: {
      bg1: '#07090c', bg2: '#0b0e14',
      accent: '#d9ff4b', accent2: '#43e6c9',
      ink: '#f2f5ff', dim: '#8f9bb3',
      mark: 'HAOWEN', sub: 'HAOWEN LI',
      label: 'PERSONAL PORTFOLIO · 2026',
      tip: 'LOADING · 影像与设计',
      emoji: false
    },
    cute: {
      bg1: '#fff0f6', bg2: '#ffe7ef',
      accent: '#ff7ba9', accent2: '#cdb4f6',
      ink: '#45304f', dim: '#a38aa9',
      mark: '🌸', sub: '可爱星球',
      label: 'CUTE PLANET · HAOWEN LI',
      tip: 'LOADING · 保持可爱',
      emoji: true
    },
    green: {
      bg1: '#0d120b', bg2: '#131b0d',
      accent: '#c6ea7e', accent2: '#8fbe53',
      ink: '#f1f5e7', dim: '#9fae8f',
      mark: '🌿', sub: 'LIVING GREEN',
      label: 'GREENERY · 绿意站',
      tip: 'LOADING · 把世界拍绿一点',
      emoji: true
    }
  };

  function getTheme() {
    var name = (document.body && document.body.getAttribute('data-splash')) || 'dark';
    return THEMES[name] || THEMES.dark;
  }

  function build(t) {
    var css =
      'body.sp-open{overflow:hidden!important}' +
      '#sp{position:fixed;inset:0;z-index:2147480000;display:flex;align-items:center;justify-content:center;' +
      'background:linear-gradient(150deg,' + t.bg1 + ' 0%,' + t.bg2 + ' 78%);overflow:hidden;' +
      'transition:transform .9s cubic-bezier(.76,0,.24,1),opacity .5s ease;will-change:transform}' +
      '#sp.sp-leave{transform:translate3d(0,-101%,0);opacity:.92}' +
      '#sp .sp-b1{position:absolute;width:560px;height:560px;border-radius:50%;left:-180px;top:-160px;' +
      'background:radial-gradient(circle at 35% 35%,rgba(255,255,255,.06),transparent 62%);pointer-events:none}' +
      '#sp .sp-b2{position:absolute;width:480px;height:480px;border-radius:50%;right:-160px;bottom:-140px;' +
      'background:radial-gradient(circle at 60% 40%,' + t.accent + '22,transparent 65%);pointer-events:none}' +
      '#sp .sp-hair{position:absolute;left:0;right:0;top:0;height:3px;background:' + t.accent + ';' +
      'box-shadow:0 0 14px ' + t.accent + ';transform-origin:0 50%;animation:spLoad 1.15s ease-in-out infinite}' +
      '@keyframes spLoad{0%{transform:scaleX(.02)}55%{transform:scaleX(.85)}100%{transform:scaleX(.02)}}' +
      '#sp .sp-mark{position:relative;text-align:center;color:' + t.ink + ';user-select:none}' +
      '#sp .sp-emoji{font-size:92px;line-height:1;animation:spPulse 1.6s ease-in-out infinite;display:block}' +
      '#sp .sp-word{font-family:Consolas,"JetBrains Mono","PingFang SC","Microsoft YaHei",sans-serif;' +
      'font-weight:700;letter-spacing:.14em;font-size:26px;line-height:1.25}' +
      '#sp .sp-word--lg{font-size:44px;letter-spacing:.2em}' +
      '#sp .sp-sub{letter-spacing:.34em;color:' + t.accent + ';font-size:13px;margin-top:8px;' +
      'font-family:Consolas,"JetBrains Mono",monospace}' +
      '#sp .sp-label{position:absolute;left:26px;top:24px;font-size:11px;letter-spacing:.3em;color:' + t.dim + ';' +
      'font-family:Consolas,"JetBrains Mono",monospace}' +
      '#sp .sp-tip{position:absolute;right:26px;top:24px;font-size:11px;letter-spacing:.24em;color:' + t.dim + ';' +
      'font-family:Consolas,"JetBrains Mono",monospace}' +
      '#sp .sp-foot{position:absolute;left:0;right:0;bottom:22px;text-align:center;color:' + t.dim + ';' +
      'font-size:11px;letter-spacing:.3em}' +
      '@keyframes spPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.08);opacity:.78}}';

    var st = document.createElement('style');
    st.id = 'sp-style';
    st.textContent = css;
    document.head.appendChild(st);

    var el = document.createElement('div');
    el.id = 'sp';
    el.setAttribute('aria-hidden', 'true');
    var emojiBlock = t.emoji
      ? '<span class="sp-emoji">' + t.mark + '</span>'
      : '';
    var wordBlock = t.emoji
      ? '<div class="sp-word">' + t.sub + '</div>'
      : '<div class="sp-word sp-word--lg">' + t.mark + '</div>';
    el.innerHTML =
      '<div class="sp-b1"></div><div class="sp-b2"></div>' +
      '<div class="sp-hair"></div>' +
      '<div class="sp-label">' + t.label + '</div>' +
      '<div class="sp-tip">' + t.tip + '</div>' +
      '<div class="sp-mark">' + emojiBlock + wordBlock +
      '<div class="sp-sub">' + (t.emoji ? '' : t.sub) + '</div></div>' +
      '<div class="sp-foot">' + (t.emoji ? '正在为你准备' : 'PORTFOLIO') + ' · PLEASE WAIT</div>';
    document.body.appendChild(el);
    return el;
  }

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function run() {
    var body = document.body;
    if (!body) { setTimeout(run, 60); return; }
    if (body.getAttribute('data-splash') === 'off') return;
    var t = getTheme();
    var el = build(t);
    body.classList.add('sp-open');
    var started = Date.now();
    var hidden = false;

    function hide() {
      if (hidden) return;
      hidden = true;
      body.classList.remove('sp-open');
      el.classList.add('sp-leave');
      setTimeout(function () {
        if (el && el.parentNode) el.parentNode.removeChild(el);
        var st2 = document.getElementById('sp-style');
        if (st2 && st2.parentNode) st2.parentNode.removeChild(st2);
      }, reduced ? 120 : 950);
    }
    function maybe() {
      if (document.readyState === 'complete' && Date.now() - started > (reduced ? 60 : 850)) { hide(); return; }
      if (Date.now() - started > (reduced ? 700 : 2600)) { hide(); return; }
      setTimeout(maybe, 130);
    }
    window.addEventListener('load', function () {
      setTimeout(function () { maybe(); }, reduced ? 40 : 400);
    });
    setTimeout(maybe, 300);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
