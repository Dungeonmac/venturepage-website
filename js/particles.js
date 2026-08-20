/* ============================================================
   VenturePage — ambient dot-field engine
   - One small pool of dots — the same dots the whole time, nothing
     extra idling in the background. At rest they drift as a loose,
     slow scatter (warm cream, one rare red accent, sizes varied);
     near an .icon-slot they gather into that shape, then let go
     again as you keep scrolling. Background and icon are the same
     dots, not two separate effects.
   - Shape point-clouds are sampled on an even grid sized to roughly
     match the particle count, not a random subset — with few dots
     to work with, even coverage is what keeps a shape (especially
     the logo) reading clearly instead of clumping in some areas
     and leaving gaps in others.
   - Motion is intentionally slow (small easing values) — everything
     eases in over many frames rather than snapping.
   - Drawn behind all page content (see #dot-canvas z-index in CSS).
   ============================================================ */

(function () {
  'use strict';

  var canvas = document.getElementById('dot-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var width = window.innerWidth;
  var height = window.innerHeight;

  function sizeCanvas() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * DPR);
    canvas.height = Math.floor(height * DPR);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  sizeCanvas();

  var CREAM = [240, 230, 198];
  var ACCENT = [194, 64, 47];

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function frac(v) { return v - Math.floor(v); }
  function smoothstep(e0, e1, x) {
    var t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  // ---------------------------------------------------------------
  // Shape point-clouds: hand-drawn icons (canvas primitives) plus the
  // real logo mark (rasterized from assets/mark.png once it loads).
  // Points are sampled on an even grid tuned to land close to a
  // target count, so a small dot budget still covers the whole shape.
  // ---------------------------------------------------------------
  function sampleEven(off, w, h, targetCount) {
    var octx = off.getContext('2d');
    var data = octx.getImageData(0, 0, w, h).data;
    var full = [];
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > 120) full.push([x, y]);
      }
    }
    if (!full.length) return [];
    var stride = Math.max(1, Math.round(Math.sqrt(full.length / targetCount)));
    var pts = [];
    for (var i = 0; i < full.length; i++) {
      if (full[i][0] % stride === 0 && full[i][1] % stride === 0) pts.push(full[i]);
    }
    return pts.map(function (p) { return [(p[0] / w) - 0.5, (p[1] / h) - 0.5]; });
  }

  function rasterizeDraw(drawFn, w, h, targetCount) {
    var off = document.createElement('canvas');
    off.width = w; off.height = h;
    var octx = off.getContext('2d');
    octx.fillStyle = '#fff';
    octx.strokeStyle = '#fff';
    drawFn(octx, w, h);
    return sampleEven(off, w, h, targetCount);
  }

  var ICON_SIZE = 140;

  var ICON_DRAWERS = {
    dollar: function (c, s) {
      var cx = s / 2, cy = s / 2, r = s * 0.34;
      c.lineWidth = s * 0.05;
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.beginPath();
      c.moveTo(cx + r * 0.62, cy - r * 0.82);
      c.bezierCurveTo(cx - r * 0.75, cy - r * 0.82, cx - r * 0.75, cy - r * 0.05, cx, cy - r * 0.05);
      c.bezierCurveTo(cx + r * 0.75, cy - r * 0.05, cx + r * 0.75, cy + r * 0.72, cx - r * 0.62, cy + r * 0.72);
      c.stroke();
      c.beginPath();
      c.moveTo(cx, cy - r * 1.08);
      c.lineTo(cx, cy + r * 1.08);
      c.stroke();
    },
    code: function (c, s) {
      var cx = s / 2, cy = s / 2, w = s * 0.92, h = s * 0.46, gap = s * 0.09;
      c.lineWidth = s * 0.075;
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.beginPath();
      c.moveTo(cx - gap, cy - h / 2);
      c.lineTo(cx - w / 2, cy);
      c.lineTo(cx - gap, cy + h / 2);
      c.stroke();
      c.beginPath();
      c.moveTo(cx + gap, cy - h / 2);
      c.lineTo(cx + w / 2, cy);
      c.lineTo(cx + gap, cy + h / 2);
      c.stroke();
      c.lineWidth = s * 0.06;
      c.beginPath();
      c.moveTo(cx - gap * 0.45, cy + h * 0.55);
      c.lineTo(cx + gap * 0.45, cy - h * 0.55);
      c.stroke();
    },
    clock: function (c, s) {
      var cx = s / 2, cy = s / 2, r = s * 0.36;
      c.lineWidth = s * 0.065;
      c.lineCap = 'round';
      c.beginPath();
      c.arc(cx, cy, r, 0, Math.PI * 2);
      c.stroke();
      c.beginPath();
      c.moveTo(cx, cy);
      c.lineTo(cx, cy - r * 0.62);
      c.moveTo(cx, cy);
      c.lineTo(cx + r * 0.48, cy + r * 0.12);
      c.stroke();
    },
    check: function (c, s) {
      var cx = s / 2, cy = s / 2, r = s * 0.38;
      c.lineWidth = s * 0.07;
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.beginPath();
      c.arc(cx, cy, r, 0, Math.PI * 2);
      c.stroke();
      c.beginPath();
      c.moveTo(cx - r * 0.42, cy + r * 0.02);
      c.lineTo(cx - r * 0.08, cy + r * 0.38);
      c.lineTo(cx + r * 0.5, cy - r * 0.35);
      c.stroke();
    },
    chat: function (c, s) {
      var w = s * 0.62, h = s * 0.42, x = (s - w) / 2, y = s * 0.26, rad = s * 0.09;
      c.lineWidth = s * 0.065;
      c.lineJoin = 'round';
      c.beginPath();
      c.moveTo(x + rad, y);
      c.arcTo(x + w, y, x + w, y + h, rad);
      c.arcTo(x + w, y + h, x, y + h, rad);
      c.arcTo(x, y + h, x, y, rad);
      c.arcTo(x, y, x + w, y, rad);
      c.closePath();
      c.stroke();
      c.beginPath();
      c.moveTo(x + w * 0.26, y + h - 1);
      c.lineTo(x + w * 0.16, y + h + s * 0.14);
      c.lineTo(x + w * 0.44, y + h - 1);
      c.stroke();
    },
    phone: function (c, s) {
      // A simple cell phone: rounded rectangle body, speaker slot, home button.
      var w = s * 0.42, h = s * 0.74, x = (s - w) / 2, y = (s - h) / 2, rad = s * 0.09;
      c.lineWidth = s * 0.055;
      c.lineJoin = 'round';
      c.beginPath();
      c.moveTo(x + rad, y);
      c.arcTo(x + w, y, x + w, y + h, rad);
      c.arcTo(x + w, y + h, x, y + h, rad);
      c.arcTo(x, y + h, x, y, rad);
      c.arcTo(x, y, x + w, y, rad);
      c.closePath();
      c.stroke();
      c.beginPath();
      c.moveTo(s / 2 - w * 0.18, y + h * 0.1);
      c.lineTo(s / 2 + w * 0.18, y + h * 0.1);
      c.stroke();
      c.beginPath();
      c.arc(s / 2, y + h * 0.9, s * 0.032, 0, Math.PI * 2);
      c.stroke();
    },
    grid: function (c, s) {
      var pad = s * 0.16, gap = s * 0.12, cell = (s - 2 * pad - gap) / 2;
      c.lineWidth = s * 0.065;
      for (var row = 0; row < 2; row++) {
        for (var col = 0; col < 2; col++) {
          c.strokeRect(pad + col * (cell + gap), pad + row * (cell + gap), cell, cell);
        }
      }
    }
  };

  var shapeCache = {};
  function getShapePoints(name, targetCount) {
    if (name === 'logo') return shapeCache.logo || null;
    if (!ICON_DRAWERS[name]) return null;
    var key = name + ':' + targetCount;
    if (!shapeCache[key]) shapeCache[key] = rasterizeDraw(ICON_DRAWERS[name], ICON_SIZE, ICON_SIZE, targetCount);
    return shapeCache[key];
  }

  // ---------------------------------------------------------------
  // Particles — a single small pool, shared between "forming a
  // shape" and "drifting as loose background dots."
  // ---------------------------------------------------------------
  var PARTICLE_COUNT = width < 700 ? 34 : (width < 1100 ? 46 : 58);

  (function loadLogoShape() {
    var img = new Image();
    img.onload = function () {
      var w = 260;
      var h = Math.max(1, Math.round(w * (img.naturalHeight / img.naturalWidth)));
      var off = document.createElement('canvas');
      off.width = w; off.height = h;
      off.getContext('2d').drawImage(img, 0, 0, w, h);
      shapeCache.logo = sampleEven(off, w, h, PARTICLE_COUNT);
    };
    img.src = 'assets/mark.png';
  })();

  var particles = [];
  (function initParticles() {
    for (var i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        baseX: Math.random(),
        baseY: Math.random(),
        freqX: 0.09 + Math.random() * 0.14,
        freqY: 0.08 + Math.random() * 0.13,
        phase: Math.random() * Math.PI * 2,
        isAccent: Math.random() < 0.07,
        size: 1.5 + Math.random() * 3.4,
        x: width * Math.random(),
        y: height * Math.random()
      });
    }
  })();

  var scrollY = window.scrollY || 0;
  window.addEventListener('scroll', function () {
    scrollY = window.scrollY || 0;
  }, { passive: true });

  window.addEventListener('resize', function () {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    sizeCanvas();
  });

  var mouseX = -9999, mouseY = -9999, mouseActive = false;
  window.addEventListener('mousemove', function (e) {
    mouseX = e.clientX; mouseY = e.clientY; mouseActive = true;
  }, { passive: true });
  window.addEventListener('mouseleave', function () { mouseActive = false; });

  // ---------------------------------------------------------------
  // Hover-excite: elements marked .contact-cta make their icon's
  // dots shake noticeably harder while the pointer is over them.
  // ---------------------------------------------------------------
  var excitedIcon = null;
  Array.prototype.forEach.call(document.querySelectorAll('.contact-cta'), function (el) {
    var slot = el.querySelector('.icon-slot');
    var name = slot && slot.getAttribute('data-icon');
    if (!name) return;
    el.addEventListener('mouseenter', function () { excitedIcon = name; });
    el.addEventListener('mouseleave', function () { if (excitedIcon === name) excitedIcon = null; });
  });

  // ---------------------------------------------------------------
  // Active-shape detection, recomputed every frame directly from
  // layout. "Shape-ness" toward each .icon-slot is a continuous
  // value (0..1, smoothstepped by distance from an activation line),
  // held at full strength across most of a slot's visible range and
  // only tapering at the edges, so forming/dispersing is gradual
  // without dots dragging in from far away at odd in-between states.
  // ---------------------------------------------------------------
  var slots = Array.prototype.slice.call(document.querySelectorAll('.icon-slot'));
  var dominantName = null;
  var dominantRect = null;
  var dominantAssignment = null;
  var dominantT = 0;

  function updateActiveShape() {
    var activationY = height * 0.4;
    var innerR = height * 0.22;
    var outerR = height * 0.3;

    var best = null, bestT = 0, bestRect = null;
    for (var i = 0; i < slots.length; i++) {
      var rect = slots[i].getBoundingClientRect();
      if (rect.bottom < -50 || rect.top > height + 50) continue;
      var c = rect.top + rect.height / 2;
      var d = Math.abs(c - activationY);
      var t = 1 - smoothstep(innerR, outerR, d);
      if (t > bestT) { bestT = t; best = slots[i]; bestRect = rect; }
    }

    var name = best ? best.getAttribute('data-icon') : null;
    if (name !== dominantName || (name && !dominantAssignment)) {
      dominantName = name;
      var pts = name ? getShapePoints(name, PARTICLE_COUNT) : null;
      dominantAssignment = (pts && pts.length) ? pts : null;
    }
    dominantRect = bestRect;
    dominantT = dominantAssignment ? bestT : 0;
  }

  // ---------------------------------------------------------------
  // Animation loop
  // ---------------------------------------------------------------
  var t0 = performance.now();

  function frame(now) {
    var t = (now - t0) / 1000;

    updateActiveShape();

    ctx.clearRect(0, 0, width, height);

    var driftPhase = scrollY / Math.max(height, 1);
    var n = dominantAssignment ? Math.min(particles.length, dominantAssignment.length) : 0;
    var rw = 0, rh = 0, rcx = 0, rcy = 0;
    if (n) {
      rw = dominantRect.width * 0.88;
      rh = dominantRect.height * 0.88;
      rcx = dominantRect.left + dominantRect.width / 2;
      rcy = dominantRect.top + dominantRect.height / 2;
    }

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];

      var ambX = width * frac(p.baseX + driftPhase * 0.1);
      var ambY = height * frac(p.baseY + driftPhase * 0.55);
      var ambJitter = 16;

      var targetX = ambX;
      var targetY = ambY;
      var shapeT = 0;

      if (i < n) {
        shapeT = dominantT;
        var pt = dominantAssignment[i];
        var shapeX = rcx + pt[0] * rw;
        var shapeY = rcy + pt[1] * rh;
        targetX = lerp(ambX, shapeX, shapeT);
        targetY = lerp(ambY, shapeY, shapeT);
      }

      var excited = shapeT > 0.5 && dominantName && dominantName === excitedIcon;
      var jitterAmp = lerp(ambJitter, excited ? 9 : 1.2, shapeT);
      var jitterFreqMul = excited ? 5.5 : 1;
      var jx = Math.sin(t * p.freqX * jitterFreqMul + p.phase) * jitterAmp;
      var jy = Math.cos(t * p.freqY * jitterFreqMul + p.phase * 1.3) * jitterAmp;
      targetX += jx;
      targetY += jy;

      if (mouseActive) {
        var dx = p.x - mouseX, dy = p.y - mouseY;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var repelRadius = 110;
        if (dist < repelRadius && dist > 0.01) {
          var force = (1 - dist / repelRadius) * lerp(1, 0.2, shapeT);
          targetX += (dx / dist) * force * 34;
          targetY += (dy / dist) * force * 34;
        }
      }

      var ease = lerp(0.022, 0.11, shapeT * shapeT);
      p.x += (targetX - p.x) * ease;
      p.y += (targetY - p.y) * ease;

      var r = lerp(p.size, p.size * 1.15, shapeT);
      var color = p.isAccent ? ACCENT : CREAM;
      var glowColor = 'rgb(' + color[0] + ',' + color[1] + ',' + color[2] + ')';
      ctx.beginPath();
      ctx.fillStyle = glowColor;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = lerp(5, 3, shapeT);
      ctx.globalAlpha = lerp(0.55, 0.9, shapeT);
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    if (!reduceMotion) requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
