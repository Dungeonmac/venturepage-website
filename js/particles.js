/* ============================================================
   VenturePage — ambient dot-field engine
   - Fixed full-viewport canvas of glowing particles.
   - At the top of the page they ring the logo; as you scroll they
     break off (staggered) into an ambient flowing field.
   - When a section's .icon-slot scrolls into view, nearby particles
     morph into that section's icon (rasterized from canvas drawing,
     not an external asset) and hold the shape while it's in view.
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

  function mixColor(t) {
    return 'rgb(' +
      Math.round(lerp(COLOR_A[0], COLOR_B[0], t)) + ',' +
      Math.round(lerp(COLOR_A[1], COLOR_B[1], t)) + ',' +
      Math.round(lerp(COLOR_A[2], COLOR_B[2], t)) + ')';
  }

  // ---------------------------------------------------------------
  // Icon point-cloud generation (all hand-drawn, no external assets)
  // ---------------------------------------------------------------
  var ICON_SIZE = 140;

  function rasterize(drawFn) {
    var off = document.createElement('canvas');
    off.width = ICON_SIZE;
    off.height = ICON_SIZE;
    var octx = off.getContext('2d');
    octx.fillStyle = '#fff';
    octx.strokeStyle = '#fff';
    drawFn(octx, ICON_SIZE);
    var data = octx.getImageData(0, 0, ICON_SIZE, ICON_SIZE).data;
    var pts = [];
    var stride = 5; // spacing between sampled points — wide enough to read as distinct dots, not a filled blob
    for (var y = 0; y < ICON_SIZE; y += stride) {
      for (var x = 0; x < ICON_SIZE; x += stride) {
        var alpha = data[(y * ICON_SIZE + x) * 4 + 3];
        if (alpha > 120) {
          pts.push([(x / ICON_SIZE) - 0.5, (y / ICON_SIZE) - 0.5]);
        }
      }
    }
    // shuffle for even distribution when later truncated
    for (var i = pts.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = pts[i]; pts[i] = pts[j]; pts[j] = tmp;
    }
    return pts;
  }

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

  var iconPointCache = {};
  function getIconPoints(name) {
    if (!ICON_DRAWERS[name]) return [];
    if (!iconPointCache[name]) {
      iconPointCache[name] = rasterize(ICON_DRAWERS[name]);
    }
    return iconPointCache[name];
  }

  // ---------------------------------------------------------------
  // Particles
  // ---------------------------------------------------------------
  var PARTICLE_COUNT = width < 700 ? 90 : (width < 1100 ? 140 : 190);

  var particles = [];
  (function initParticles() {
    for (var i = 0; i < PARTICLE_COUNT; i++) {
      var seed = i / PARTICLE_COUNT;
      particles.push({
        seed: seed,
        angle: Math.random() * Math.PI * 2,
        radius: 40 + Math.random() * 60,
        freqX: 0.15 + Math.random() * 0.25,
        freqY: 0.12 + Math.random() * 0.22,
        phase: Math.random() * Math.PI * 2,
        colorT: Math.random(),
        size: 1.6 + Math.random() * 2.6,
        x: width / 2,
        y: height / 2,
        breakThreshold: 0.05 + seed * 0.55 + Math.random() * 0.1
      });
    }
  })();

  var scrollY = window.scrollY || 0;
  var lastScrollY = scrollY;
  var scrollKick = 0; // brief extra jitter energy from scroll deltas

  window.addEventListener('scroll', function () {
    scrollY = window.scrollY || 0;
  }, { passive: true });

  window.addEventListener('resize', function () {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    sizeCanvas();
  });

  // ---------------------------------------------------------------
  // Icon-slot intersection tracking
  // ---------------------------------------------------------------
  var activeIconEl = null;
  var activeIconName = null;
  var iconAssignCache = null; // points assigned to first N particles for the active icon

  function refreshIconAssignment() {
    if (!activeIconName) { iconAssignCache = null; return; }
    var pts = getIconPoints(activeIconName);
    if (!pts.length) { iconAssignCache = null; return; }
    var n = Math.min(particles.length, pts.length, 90);
    var chosen = [];
    for (var i = 0; i < n; i++) chosen.push(pts[i]);
    iconAssignCache = chosen;
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      var best = null, bestRatio = 0;
      entries.forEach(function (entry) {
        if (entry.isIntersecting && entry.intersectionRatio > bestRatio) {
          best = entry.target;
          bestRatio = entry.intersectionRatio;
        }
      });
      if (best) {
        if (best !== activeIconEl) {
          activeIconEl = best;
          activeIconName = best.getAttribute('data-icon');
          refreshIconAssignment();
        }
      } else {
        // nothing from this batch intersecting enough; check if the
        // currently active one dropped out entirely
        var stillVisible = false;
        document.querySelectorAll('.icon-slot').forEach(function (el) {
          if (el === activeIconEl) {
            var r = el.getBoundingClientRect();
            if (r.top < height && r.bottom > 0) stillVisible = true;
          }
        });
        if (!stillVisible) {
          activeIconEl = null;
          activeIconName = null;
          iconAssignCache = null;
        }
      }
    }, { threshold: [0.35, 0.5, 0.65] });

    document.querySelectorAll('.icon-slot').forEach(function (el) { io.observe(el); });
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

    ctx.clearRect(0, 0, width, height);

    var logoEl = document.querySelector('[data-nav-home]');
    var logoRect = logoEl ? logoEl.getBoundingClientRect() : null;
    var heroT = clamp(scrollY / Math.max(height * 0.8, 1), 0, 1);

    var iconRect = activeIconEl ? activeIconEl.getBoundingClientRect() : null;
    var iconScale = iconRect ? Math.max(Math.min(iconRect.width, iconRect.height, 220), 60) : 0;
    var iconCx = iconRect ? iconRect.left + iconRect.width / 2 : 0;
    var iconCy = iconRect ? iconRect.top + iconRect.height / 2 : 0;

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];

      // ambient flow target (viewport space, animates with time + scroll kick)
      var ax = width * (0.15 + 0.7 * ((p.seed * 2.3) % 1));
      var ay = height * (0.12 + 0.76 * ((p.seed * 3.7 + 0.15) % 1));
      var wobbleX = Math.sin(t * p.freqX + p.phase) * (26 + scrollKick * 0.6);
      var wobbleY = Math.cos(t * p.freqY + p.phase * 1.3) * (26 + scrollKick * 0.6);
      var flowX = ax + wobbleX;
      var flowY = ay + wobbleY;

      // hero ring target (around logo)
      var ringX = flowX, ringY = flowY;
      if (logoRect) {
        var rcx = logoRect.left + logoRect.width / 2;
        var rcy = logoRect.top + logoRect.height / 2;
        ringX = rcx + Math.cos(p.angle + t * 0.4) * (logoRect.width * 0.7 + p.radius);
        ringY = rcy + Math.sin(p.angle + t * 0.4) * (logoRect.height * 1.8 + p.radius * 0.6);
      }

      var pT = clamp((heroT - 0) / Math.max(p.breakThreshold, 0.01), 0, 1);
      pT = pT * pT * (3 - 2 * pT); // smoothstep
      var targetX = lerp(ringX, flowX, pT);
      var targetY = lerp(ringY, flowY, pT);

      // icon morph overrides target for the first N assigned particles
      var inIconSet = iconAssignCache && i < iconAssignCache.length;
      if (inIconSet) {
        var pt = iconAssignCache[i];
        targetX = iconCx + pt[0] * iconScale;
        targetY = iconCy + pt[1] * iconScale;
      }

      var ease = inIconSet ? 0.14 : 0.06;
      p.x += (targetX - p.x) * ease;
      p.y += (targetY - p.y) * ease;

      var r = inIconSet ? p.size * 1.25 : p.size;
      var glowColor = mixColor(p.colorT);
      ctx.beginPath();
      ctx.fillStyle = glowColor;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = inIconSet ? 4 : 6;
      ctx.globalAlpha = inIconSet ? 0.95 : 0.75;
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    if (!reduceMotion) requestAnimationFrame(frame);
  }

  if (reduceMotion) {
    // draw a single calm static frame, no animation loop
    requestAnimationFrame(frame);
  } else {
    requestAnimationFrame(frame);
  }
})();
