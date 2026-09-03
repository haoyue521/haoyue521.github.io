/* ============================================================
 * field.js — 共享"粒子流场 + 流体光斑 + 鼠标跟随"全站背景引擎
 * ------------------------------------------------------------
 * - 零第三方依赖，纯 Canvas 2D，ES5 风格（兼容旧版 Chromium）
 * - 用法：在页面放 <canvas data-field="moss" data-blend="glow">
 *   引擎自动扫描初始化；主题由 data-field 指定，也可用
 *   data-colors="#hex,#hex,#hex" 直接给色板
 * - data-dens: auto | low | high（粒子密度档）
 * - data-blend: glow(深色站·滤色光效) | soft(浅色站·柔和)
 * - 遵循 prefers-reduced-motion；标签页不可见时自动暂停
 * - 全局 API: window.SiteField.mount(canvas) / unmount(canvas)
 *   画布被移出 DOM 时引擎自动停止对应实例
 * ============================================================ */
(function () {
  'use strict';

  var THEMES = {
    /* 彩色站 · Living Green 森林系（深底发光） */
    moss: {
      colors: ['#dff3c4', '#b7e09a', '#82bd66', '#f0f4e4', '#5f8f43'],
      blend: 'glow'
    },
    /* 暗黑站 · 电光绿霓虹系 */
    aurora: {
      colors: ['#d9ff4b', '#8dff9a', '#43e6c9', '#7aa2ff', '#e6f1ff'],
      blend: 'glow'
    },
    /* 可爱站 · 奶油粉彩系 */
    pastel: {
      colors: ['#ffd3ea', '#ffb3d9', '#c9b8ff', '#a6d9ff', '#ffe3a8', '#bff3d6'],
      blend: 'soft'
    }
  };

  var PREFERS = (typeof window.matchMedia === 'function')
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;

  var running = [];   // 活动实例

  /* ---------- 工具 ---------- */
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  function hexToRgb(hex) {
    var m = /^#?([\da-f]{6})$/i.exec(hex);
    if (!m) return [255, 255, 255];
    var n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function parseColors(str, fallback) {
    var list = str ? str.split(',').map(function (s) { return s.trim(); }) : [];
    for (var i = 0; i < list.length; i++) {
      if (!/^#[\da-f]{6}$/i.test(list[i])) return fallback.slice();
    }
    return list.length ? list : fallback.slice();
  }

  /* 价值噪声（可平移、可做流场） */
  function makeNoise(seed) {
    var s = seed || 7;
    function hash(x, y) {
      var h = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453123;
      return h - Math.floor(h);
    }
    return function (x, y) {
      var ix = Math.floor(x), iy = Math.floor(y);
      var fx = x - ix, fy = y - iy;
      var ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
      var a = hash(ix, iy), b = hash(ix + 1, iy);
      var c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
      return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy; // 0..1
    };
  }

  function makeSprite(size, rgb, soft) {
    var c = document.createElement('canvas');
    c.width = c.height = size;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    if (soft) {
      grad.addColorStop(0, 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0.85)');
      grad.addColorStop(0.4, 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0.32)');
      grad.addColorStop(1, 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0)');
    } else {
      grad.addColorStop(0, 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0.5)');
      grad.addColorStop(0.6, 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0.12)');
      grad.addColorStop(1, 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0)');
    }
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    return c;
  }

  /* ---------- 单个实例 ---------- */
  function mount(canvas) {
    var i;
    for (i = 0; i < running.length; i++) {
      if (running[i].canvas === canvas) return running[i]; // 已挂载
    }

    var themeName = canvas.getAttribute('data-field') || 'aurora';
    var theme = THEMES[themeName];
    if (!theme) theme = THEMES.aurora;

    var colors = parseColors(canvas.getAttribute('data-colors'), theme.colors);
    var rgbList = colors.map(hexToRgb);
    var blend = (canvas.getAttribute('data-blend') || theme.blend || 'glow');
    var isGlow = blend === 'glow';
    var density = canvas.getAttribute('data-dens') || 'auto';

    var ctx = canvas.getContext('2d');
    if (!ctx) return null;

    var W = 0, H = 0, DPR = 1;
    var items = [];      // {dust|orb}
    var reduced = PREFERS ? PREFERS.matches : false;
    var rafId = 0, last = 0, t = 0;
    var mouse = { x: -9999, y: -9999, sx: -9999, sy: -9999, nx: 0, ny: 0 };
    var alive = true;

    var dustSprite = null, orbSprite = [];
    var orbSpriteRgb = [];
    var i2, c2;

    /* ---- 尺寸 ---- */
    function resize() {
      var w = Math.max(2, window.innerWidth);
      var h = Math.max(2, window.innerHeight);
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.round(w * DPR);
      H = Math.round(h * DPR);
      canvas.width = W;
      canvas.height = H;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      build(w, h);
    }

    /* ---- 重建粒子 ---- */
    function build(w, h) {
      var area = w * h;
      var scale = Math.min(2, DPR);
      var nDust;
      if (density === 'low') nDust = Math.round(area / 22000);
      else if (density === 'high') nDust = Math.round(area / 7500);
      else nDust = Math.round(area / 11000);
      nDust = clamp(nDust, 46, 320);

      var nOrb;
      if (density === 'high') nOrb = Math.round(area / 150000);
      else nOrb = Math.round(area / 260000);
      nOrb = clamp(nOrb, 5, 15);

      var noise = makeNoise(Math.floor(Math.random() * 1000));

      items = [];
      var k, m = Math.min(nDust, 900);

      for (k = 0; k < nDust; k++) {
        var depth = 0.22 + Math.random() * 0.78;     // 0.22..1 → 3D 纵深
        var colorIdx = Math.floor(Math.random() * rgbList.length);
        items.push({
          type: 'dust',
          x: Math.random() * w, y: Math.random() * h,
          px: 0, py: 0,
          z: depth,
          r: (0.7 + Math.random() * 1.9) * depth,
          ci: colorIdx,
          ph: Math.random() * Math.PI * 2,
          vx: 0, vy: 0,
          noise: noise
        });
      }
      for (k = 0; k < nOrb; k++) {
        var big = Math.random() < 0.35;
        items.push({
          type: 'orb',
          x: Math.random() * w, y: Math.random() * h,
          px: 0, py: 0,
          z: big ? 0.9 : 0.5,
          r: (big ? 120 : 60) + Math.random() * (big ? 170 : 110),
          ci: Math.floor(Math.random() * rgbList.length),
          ph: Math.random() * Math.PI * 2,
          vx: 0, vy: 0,
          noise: noise
        });
      }

      /* 预渲染圆点/光斑精灵 */
      dustSprite = [];
      orbSprite = [];
      orbSpriteRgb = [];
      var size = Math.max(2, Math.round(14 * scale));
      for (c2 = 0; c2 < rgbList.length; c2++) {
        dustSprite.push(makeSprite(size, rgbList[c2], true));
      }
      var os = Math.round(140 * scale);
      for (c2 = 0; c2 < rgbList.length; c2++) {
        var spr = makeSprite(os, rgbList[c2], isGlow);
        orbSprite.push(spr);
        orbSpriteRgb.push(rgbList[c2]);
      }
      void m;
    }

    /* ---- 鼠标 ---- */
    function onMove(e) {
      var p = e.touches ? e.touches[0] : e;
      if (!p) return;
      mouse.x = p.clientX;
      mouse.y = p.clientY;
    }
    function onLeave() {
      mouse.x = -9999;
      mouse.y = -9999;
    }

    /* ---- 逐帧 ---- */
    function frame(now) {
      if (!alive) return;
      if (!canvas.isConnected) { unmount(canvas); return; }

      rafId = requestAnimationFrame(frame);
      if (reduced) return;

      if (!last) last = now;
      var dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;
      t += dt;

      /* 平滑鼠标（缓动） */
      if (mouse.x > -9000) {
        var kk = 1 - Math.pow(0.0006, dt);
        mouse.sx += (mouse.x - mouse.sx) * kk;
        mouse.sy += (mouse.y - mouse.sy) * kk;
        mouse.nx += ((mouse.x / Math.max(1, window.innerWidth)) * 2 - 1 - mouse.nx) * kk;
        mouse.ny += ((mouse.y / Math.max(1, window.innerHeight)) * 2 - 1 - mouse.ny) * kk;
      }

      var i, it;
      var w = W / DPR, h = H / DPR;
      var mouseR = Math.max(150, Math.min(w, h) * 0.22);

      /* —— 更新 —— */
      for (i = 0; i < items.length; i++) {
        it = items[i];
        var f = it.noise(it.x * 0.0016, it.y * 0.0016 + t * 0.05 + it.ph) * 2 - 1; // -1..1
        var drift = it.type === 'orb' ? 0.014 : 0.05;
        var ang = f * Math.PI * (it.type === 'orb' ? 1.1 : 1.8) + Math.sin(t * 0.2 + it.ph) * 0.6;

        it.vx += Math.cos(ang) * drift * (0.4 + it.z);
        it.vy += Math.sin(ang) * drift * (0.4 + it.z);

        /* 鼠标流体涡旋：切向扰动 + 轻微吸引 */
        if (mouse.x > -9000 && !reduced) {
          var dx = it.x - mouse.sx, dy = it.y - mouse.sy;
          var d2 = dx * dx + dy * dy;
          var d = Math.sqrt(d2);
          if (d < mouseR && d > 0.001) {
            var pull = 1 - d / mouseR;
            pull *= pull * 0.9;
            var px = dx / d, py = dy / d;
            var swirl = Math.sin(t * 1.1 + it.ph) > 0 ? 1 : -1;
            var str = it.type === 'orb' ? 0.05 : 0.16;
            it.vx += (-px * str + py * str * 1.6 * swirl) * pull;
            it.vy += (-py * str - px * str * 1.6 * swirl) * pull;
          }
        }

        /* 阻尼 + 限速 */
        var damp = it.type === 'orb' ? 0.012 : 0.045;
        it.vx *= (1 - damp);
        it.vy *= (1 - damp);
        var maxV = it.type === 'orb' ? 0.5 : 1.1;
        var sp = Math.sqrt(it.vx * it.vx + it.vy * it.vy);
        if (sp > maxV) { it.vx *= maxV / sp; it.vy *= maxV / sp; }

        /* 深度视差跟随鼠标（3D 手感） */
        var par = it.type === 'orb' ? 26 : 14;
        var ox = (mouse.x > -9000 ? mouse.nx : 0) * par * it.z;
        var oy = (mouse.x > -9000 ? mouse.ny : 0) * par * it.z * 0.7;

        it.px = it.x + ox;
        it.py = it.y + oy;

        it.x += it.vx;
        it.y += it.vy;

        /* 边缘回绕（留边） */
        var m2 = it.type === 'orb' ? -it.r : -60;
        if (it.x < m2) it.x = w - m2;
        if (it.x > w - m2) it.x = m2;
        if (it.y < m2) it.y = h - m2;
        if (it.y > h - m2) it.y = m2;
      }

      /* —— 绘制 —— */
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, w, h);

      /* 光斑层（流体色团） */
      ctx.globalCompositeOperation = isGlow ? 'lighter' : 'source-over';
      for (i = 0; i < items.length; i++) {
        it = items[i];
        if (it.type !== 'orb') continue;
        var pulse = 1 + Math.sin(t * 0.5 + it.ph * 3) * 0.06;
        var spr = orbSprite[it.ci];
        var alpha = (isGlow ? 0.05 + it.z * 0.05 : 0.05 + it.z * 0.05);
        var rr = it.r * pulse;
        ctx.globalAlpha = clamp(alpha, 0.01, 0.12);
        ctx.drawImage(spr, it.px - rr, it.py - rr, rr * 2, rr * 2);
      }

      /* 粒子层 */
      ctx.globalCompositeOperation = isGlow ? 'lighter' : 'source-over';
      for (i = 0; i < items.length; i++) {
        it = items[i];
        if (it.type !== 'dust') continue;
        var s = it.r * 3.2;
        ctx.globalAlpha = clamp(0.18 + it.z * 0.5, 0.05, 0.9);
        ctx.drawImage(dustSprite[it.ci], it.px - s / 2, it.py - s / 2, s, s);
      }

      /* 连线（近距离粘连，流体感） */
      if (items.length <= 420 && !reduced) {
        ctx.globalAlpha = 1;
        ctx.lineWidth = 1;
        var maxLink = 88;
        var n = items.length;
        for (i = 0; i < n; i++) {
          it = items[i];
          if (it.type !== 'dust') continue;
          for (var j = i + 1; j < n; j++) {
            var ot = items[j];
            if (ot.type !== 'dust') continue;
            var ldx = it.px - ot.px, ldy = it.py - ot.py;
            var ld2 = ldx * ldx + ldy * ldy;
            if (ld2 < maxLink * maxLink) {
              var a = (1 - Math.sqrt(ld2) / maxLink) * 0.10 * it.z * ot.z;
              if (a > 0.012) {
                var r1 = orbSpriteRgb[it.ci], r2 = orbSpriteRgb[ot.ci];
                ctx.strokeStyle = 'rgba(' + Math.round((r1[0] + r2[0]) / 2) + ',' +
                  Math.round((r1[1] + r2[1]) / 2) + ',' +
                  Math.round((r1[2] + r2[2]) / 2) + ',' + a.toFixed(3) + ')';
                ctx.beginPath();
                ctx.moveTo(it.px, it.py);
                ctx.lineTo(ot.px, ot.py);
                ctx.stroke();
              }
            }
          }
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    function onVisibility() {
      if (document.hidden) {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = 0;
        last = 0;
      } else if (alive && !rafId) {
        rafId = requestAnimationFrame(frame);
      }
    }

    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerleave', onLeave);
    window.addEventListener('visibilitychange', onVisibility);

    resize();
    if (!reduced) {
      /* 首帧静态画面 + 开始动画 */
      rafId = requestAnimationFrame(function (now) { last = now; rafId = requestAnimationFrame(frame); });
    }

    var inst = {
      canvas: canvas,
      kill: function () {
        alive = false;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = 0;
        window.removeEventListener('resize', resize);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerleave', onLeave);
        window.removeEventListener('visibilitychange', onVisibility);
        var idx = running.indexOf(inst);
        if (idx >= 0) running.splice(idx, 1);
      }
    };
    running.push(inst);
    return inst;
  }

  function unmount(canvas) {
    var i;
    for (i = 0; i < running.length; i++) {
      if (running[i].canvas === canvas) { running[i].kill(); return; }
    }
  }

  function autoScan() {
    var list = document.querySelectorAll('canvas[data-field]');
    for (var i = 0; i < list.length; i++) mount(list[i]);
  }

  /* 文档就绪扫描 */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoScan);
  } else {
    autoScan();
  }

  window.SiteField = {
    mount: mount,
    unmount: unmount,
    refresh: autoScan
  };
})();
