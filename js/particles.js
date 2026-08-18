/* ============================================================
   VenturePage — ambient dot-field engine
   - Fixed full-viewport canvas of glowing particles.
   - At page load, dots gather into the actual logo mark shape,
     large and centered in the hero — rasterized from assets/mark.png,
     not a generic ring. They keep a small continuous jitter even
     while "locked" into a shape, so nothing ever looks frozen.
   - As you scroll, whichever .icon-slot is nearest the read-band
     (checked fresh every frame, no IntersectionObserver lag) pulls
     nearby dots into its icon's shape; everywhere else, dots disperse
     into an ambient flow whose base position drifts with scrollY, so
     the scatter actually changes as you move down the page instead of
     sitting frozen in one viewport-relative pattern.
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

  function mixColor(t) {
    return 'rgb(' +
      Math.round(lerp(COLOR_A[0], COLOR_B[0], t)) + ',' +
      Math.round(lerp(COLOR_A[1], COLOR_B[1], t)) + ',' +
      Math.round(lerp(COLOR_A[2], COLOR_B[2], t)) + ')';
  }

  // ---------------------------------------------------------------
  // Shape point-clouds: hand-drawn icons (canvas primitives) plus the
  // real logo mark (rasterized from assets/mark.png once it loads).
  // ---------------------------------------------------------------
  function rasterizeCanvas(off, w, h) {
    var octx = off.getContext('2d');
    var data = octx.getImageData(0, 0, w, h).data;
    var pts = [];
    var stride = 5;
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

  function rasterizeDraw(drawFn, w, h) {
    var off = document.createElement('canvas');
    off.width = w; off.height = h;
    var octx = off.getContext('2d');
    octx.fillStyle = '#fff';
    octx.strokeStyle = '#fff';
    drawFn(octx, w, h);
    return rasterizeCanvas(off, w, h);
  }

  var ICON_SIZE = 140;

  var ICON_DRAWERS = {
    dollar: function (c, s) {
      c.font = '700 ' + Math.round(s * 0.72) + 'px Arial, sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('$', s / 2, s / 2 + s * 0.03);
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
      var w = s * 0.66, h = s * 0.46, x = (s - w) / 2, y = s * 0.24, rad = s * 0.09;
      c.beginPath();
      c.moveTo(x + rad, y);
      c.arcTo(x + w, y, x + w, y + h, rad);
      c.arcTo(x + w, y + h, x, y + h, rad);
      c.arcTo(x, y + h, x, y, rad);
      c.arcTo(x, y, x + w, y, rad);
      c.closePath();
      c.fill();
      c.beginPath();
      c.moveTo(x + w * 0.28, y + h);
      c.lineTo(x + w * 0.18, y + h + s * 0.14);
      c.lineTo(x + w * 0.46, y + h);
      c.closePath();
      c.fill();
    },
    arrow: function (c, s) {
      var cx = s / 2;
      c.beginPath();
      c.moveTo(cx, s * 0.16);
      c.lineTo(cx + s * 0.26, s * 0.46);
      c.lineTo(cx + s * 0.11, s * 0.46);
      c.lineTo(cx + s * 0.11, s * 0.82);
      c.lineTo(cx - s * 0.11, s * 0.82);
      c.lineTo(cx - s * 0.11, s * 0.46);
      c.lineTo(cx - s * 0.26, s * 0.46);
      c.closePath();
      c.fill();
    }
  };

  var shapeCache = {};
  function getShapePoints(name) {
    if (name === 'logo') return shapeCache.logo || null;
    if (!ICON_DRAWERS[name]) return null;
    if (!shapeCache[name]) shapeCache[name] = rasterizeDraw(ICON_DRAWERS[name], ICON_SIZE, ICON_SIZE);
    return shapeCache[name];
  }

  (function loadLogoShape() {
    var img = new Image();
    img.onload = function () {
      var w = 200;
      var h = Math.max(1, Math.round(w * (img.naturalHeight / img.naturalWidth)));
      var off = document.createElement('canvas');
      off.width = w; off.height = h;
      off.getContext('2d').drawImage(img, 0, 0, w, h);
      shapeCache.logo = rasterizeCanvas(off, w, h);
    };
    img.src = 'assets/mark.png';
  })();

  // ---------------------------------------------------------------
  // Particles
  // ---------------------------------------------------------------
  var PARTICLE_COUNT = width < 700 ? 90 : (width < 1100 ? 140 : 190);
  var SHAPE_CAP = Math.min(90, Math.round(PARTICLE_COUNT * 0.65));

  var particles = [];
  (function initParticles() {
    for (var i = 0; i < PARTICLE_COUNT; i++) {
      var seed = i / PARTICLE_COUNT;
      particles.push({
        seed: seed,
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
  var lastScrollY = scrollY;
  var scrollKick = 0;

  window.addEventListener('scroll', function () {
    scrollY = window.scrollY || 0;
  }, { passive: true });

  window.addEventListener('resize', function () {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    sizeCanvas();
  });

  // ---------------------------------------------------------------
  // Active-shape detection, recomputed every frame directly from
  // layout — whichever .icon-slot sits nearest the "read band" (upper-
  // middle of the viewport) wins; none if nothing qualifies. This is
  // deterministic and frame-accurate, unlike IntersectionObserver's
  // threshold-crossing callbacks, which could fire late or on the
  // wrong element when scrolling fast.
  // ---------------------------------------------------------------
  var slots = Array.prototype.slice.call(document.querySelectorAll('.icon-slot'));
  var activeName = null;
  var activeRect = null;
  var activeAssignment = null;

  function updateActiveShape() {
    var bandCenter = height * 0.38;
    var bandHalf = height * 0.38;
    var best = null, bestDist = Infinity;
    for (var i = 0; i < slots.length; i++) {
      var rect = slots[i].getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > height) continue;
      var c = rect.top + rect.height / 2;
      var dist = Math.abs(c - bandCenter);
      if (dist < bandHalf && dist < bestDist) {
        best = slots[i];
        bestDist = dist;
      }
    }
    var name = best ? best.getAttribute('data-icon') : null;

    if (name !== activeName || (name && !activeAssignment)) {
      activeName = name;
      var pts = name ? getShapePoints(name) : null;
      if (pts && pts.length) {
        var n = Math.min(particles.length, pts.length, SHAPE_CAP);
        activeAssignment = pts.slice(0, n);
      } else {
        activeAssignment = null;
      }
    }
    if (best) activeRect = best.getBoundingClientRect();
  }

  // ---------------------------------------------------------------
  // Animation loop
  // ---------------------------------------------------------------
  var t0 = performance.now();

  function frame(now) {
    var t = (now - t0) / 1000;
    var dScroll = scrollY - lastScrollY;
    lastScrollY = scrollY;
    scrollKick = clamp(scrollKick * 0.9 + Math.abs(dScroll) * 0.5, 0, 40);

    updateActiveShape();

    ctx.clearRect(0, 0, width, height);

    var driftPhase = scrollY / Math.max(height, 1);
    var assignedCount = activeAssignment ? activeAssignment.length : 0;
    var rw = 0, rh = 0, rcx = 0, rcy = 0;
    if (assignedCount) {
      rw = activeRect.width * 0.85;
      rh = activeRect.height * 0.85;
      rcx = activeRect.left + activeRect.width / 2;
      rcy = activeRect.top + activeRect.height / 2;
    }

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var inShape = i < assignedCount;

      var targetX, targetY, jitterAmp;

      if (inShape) {
        var pt = activeAssignment[i];
        targetX = rcx + pt[0] * rw;
        targetY = rcy + pt[1] * rh;
        jitterAmp = 3.5;
      } else {
        targetX = width * (0.1 + 0.78 * frac(p.seed * 2.3 + driftPhase * 0.55));
        targetY = height * (0.08 + 0.82 * frac(p.seed * 3.7 + driftPhase * 0.8 + 0.15));
        jitterAmp = 22 + scrollKick * 0.6;
      }

      var jx = Math.sin(t * p.freqX + p.phase) * jitterAmp;
      var jy = Math.cos(t * p.freqY + p.phase * 1.3) * jitterAmp;

      var ease = inShape ? 0.13 : 0.07;
      p.x += (targetX + jx - p.x) * ease;
      p.y += (targetY + jy - p.y) * ease;

      var r = inShape ? p.size * 1.25 : p.size;
      var glowColor = mixColor(p.colorT);
      ctx.beginPath();
      ctx.fillStyle = glowColor;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = inShape ? 4 : 6;
      ctx.globalAlpha = inShape ? 0.95 : 0.75;
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    if (!reduceMotion) requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
