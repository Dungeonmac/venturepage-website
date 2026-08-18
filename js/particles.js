/* ============================================================
   VenturePage — ambient dot-field engine
   - One pool of dots, drawn behind the page content (never on top
     of text). At page load they gather into the actual logo mark
     (rasterized from assets/mark.png), large and centered in the
     hero, with a small continuous jitter so nothing looks frozen.
   - As you scroll, "shape-ness" toward whichever .icon-slot is
     nearest an activation line is a continuous 0..1 value (smoothed
     with smoothstep, recomputed every frame) rather than an on/off
     flag, so gathering and dispersing is gradual, not a snap.
   - Away from any icon, dots settle into a genuine 2D random
     scatter (independent x/y per dot) that drifts slowly with
     scroll — earlier versions derived x and y from the same
     formula, which produced diagonal streak artifacts instead of
     an even star field.
   - Dots gently move out of the way of the mouse cursor.
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

  var COLOR_A = [108, 99, 255];   // indigo
  var COLOR_B = [34, 211, 238];   // cyan

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function frac(v) { return v - Math.floor(v); }
  function smoothstep(e0, e1, x) {
    var t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function mixColor(t) {
    return 'rgb(' +
      Math.round(lerp(COLOR_A[0], COLOR_B[0], t)) + ',' +
      Math.round(lerp(COLOR_A[1], COLOR_B[1], t)) + ',' +
      Math.round(lerp(COLOR_A[2], COLOR_B[2], t)) + ')';
  }

  // ---------------------------------------------------------------
  // Shape point-clouds: hand-drawn icons (canvas primitives) plus the
  // real logo mark (rasterized from assets/mark.png once it loads).
  // Icons that read as solid blobs when filled (dollar, chat) are
  // drawn as thin strokes instead, same as the clock/check, so the
  // sampled points fall along a legible outline with real gaps.
  // ---------------------------------------------------------------
  function rasterizeCanvas(off, w, h, stride) {
    var octx = off.getContext('2d');
    var data = octx.getImageData(0, 0, w, h).data;
    var pts = [];
    for (var y = 0; y < h; y += stride) {
      for (var x = 0; x < w; x += stride) {
        var alpha = data[(y * w + x) * 4 + 3];
        if (alpha > 120) pts.push([(x / w) - 0.5, (y / h) - 0.5]);
      }
    }
    for (var i = pts.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = pts[i]; pts[i] = pts[j]; pts[j] = tmp;
    }
    return pts;
  }

  function rasterizeDraw(drawFn, w, h, stride) {
    var off = document.createElement('canvas');
    off.width = w; off.height = h;
    var octx = off.getContext('2d');
    octx.fillStyle = '#fff';
    octx.strokeStyle = '#fff';
    drawFn(octx, w, h);
    return rasterizeCanvas(off, w, h, stride);
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
      c.font = '700 ' + Math.round(s * 0.5) + 'px Arial, sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('</>', s / 2, s / 2);
    },
    clock: function (c, s) {
      var cx = s / 2, cy = s / 2, r = s * 0.36;
      c.lineWidth = s * 0.045;
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
      c.lineWidth = s * 0.05;
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
      c.lineWidth = s * 0.045;
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
    arrow: function (c, s) {
      var cx = s / 2;
      c.beginPath();
      c.moveTo(cx, s * 0.84);
      c.lineTo(cx + s * 0.26, s * 0.54);
      c.lineTo(cx + s * 0.11, s * 0.54);
      c.lineTo(cx + s * 0.11, s * 0.18);
      c.lineTo(cx - s * 0.11, s * 0.18);
      c.lineTo(cx - s * 0.11, s * 0.54);
      c.lineTo(cx - s * 0.26, s * 0.54);
      c.closePath();
      c.fill();
    }
  };

  var shapeCache = {};
  function getShapePoints(name) {
    if (name === 'logo') return shapeCache.logo || null;
    if (!ICON_DRAWERS[name]) return null;
    if (!shapeCache[name]) shapeCache[name] = rasterizeDraw(ICON_DRAWERS[name], ICON_SIZE, ICON_SIZE, 3);
    return shapeCache[name];
  }

  (function loadLogoShape() {
    var img = new Image();
    img.onload = function () {
      var w = 280;
      var h = Math.max(1, Math.round(w * (img.naturalHeight / img.naturalWidth)));
      var off = document.createElement('canvas');
      off.width = w; off.height = h;
      off.getContext('2d').drawImage(img, 0, 0, w, h);
      shapeCache.logo = rasterizeCanvas(off, w, h, 2);
    };
    img.src = 'assets/mark.png';
  })();

  // ---------------------------------------------------------------
  // Particles — one pool, shared between "forming a shape" and
  // "drifting as stars." No separate always-on ambient crowd.
  // ---------------------------------------------------------------
  var PARTICLE_COUNT = width < 700 ? 65 : (width < 1100 ? 95 : 130);
  var SHAPE_CAP = 90;

  var particles = [];
  (function initParticles() {
    for (var i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        baseX: Math.random(),
        baseY: Math.random(),
        freqX: 0.15 + Math.random() * 0.25,
        freqY: 0.12 + Math.random() * 0.22,
        phase: Math.random() * Math.PI * 2,
        colorT: Math.random(),
        size: 1.6 + Math.random() * 2.6,
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
  // Active-shape detection, recomputed every frame directly from
  // layout. "Shape-ness" toward each .icon-slot is a continuous
  // value (0..1, smoothstepped by distance from an activation line),
  // not a hard on/off band, so forming and dispersing is gradual.
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
      var pts = name ? getShapePoints(name) : null;
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
    var n = dominantAssignment ? Math.min(particles.length, dominantAssignment.length, SHAPE_CAP) : 0;
    var rw = 0, rh = 0, rcx = 0, rcy = 0;
    if (n) {
      rw = dominantRect.width * 0.85;
      rh = dominantRect.height * 0.85;
      rcx = dominantRect.left + dominantRect.width / 2;
      rcy = dominantRect.top + dominantRect.height / 2;
    }

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];

      var ambX = width * frac(p.baseX + driftPhase * 0.12);
      var ambY = height * frac(p.baseY + driftPhase * 0.6);
      var ambJitter = 20;

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

      var jitterAmp = lerp(ambJitter, 3, shapeT);
      var jx = Math.sin(t * p.freqX + p.phase) * jitterAmp;
      var jy = Math.cos(t * p.freqY + p.phase * 1.3) * jitterAmp;
      targetX += jx;
      targetY += jy;

      if (mouseActive) {
        var dx = p.x - mouseX, dy = p.y - mouseY;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var repelRadius = 60;
        if (dist < repelRadius && dist > 0.01) {
          var force = (1 - dist / repelRadius) * lerp(1, 0.35, shapeT);
          targetX += (dx / dist) * force * 22;
          targetY += (dy / dist) * force * 22;
        }
      }

      var ease = lerp(0.06, 0.14, shapeT);
      p.x += (targetX - p.x) * ease;
      p.y += (targetY - p.y) * ease;

      var r = lerp(p.size, p.size * 1.25, shapeT);
      var glowColor = mixColor(p.colorT);
      ctx.beginPath();
      ctx.fillStyle = glowColor;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = lerp(6, 4, shapeT);
      ctx.globalAlpha = lerp(0.65, 0.95, shapeT);
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    if (!reduceMotion) requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
