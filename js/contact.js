/* ============================================================
   VenturePage — contact page: rotating 3D cube form.

   The cube's four faces sit at fixed local orientations on a true
   cube (all using --cube-depth as the half-extent on every axis).
   .cube's own transform is a *world-space* rotation string built by
   prepending each step's turn (up / left / up), so the browser's
   transition between states reads as one continuous turn rather
   than snapping through a diagonal. Each face's local transform is
   the algebraic inverse of the world rotation that reveals it,
   which is why they're hardcoded in CSS as rotateX/rotateY chains
   rather than derived at runtime.
   ============================================================ */

(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var scene = document.getElementById('cube-scene');
  var cube = document.getElementById('contact-cube');
  var dotCanvas = document.getElementById('dot-canvas');
  if (!scene || !cube) return;

  var STATES = [
    '',
    'rotateX(-90deg)',
    'rotateY(-90deg) rotateX(-90deg)',
    'rotateX(-90deg) rotateY(-90deg) rotateX(-90deg)'
  ];
  // The ambient background dots drift along with each turn of the cube —
  // up on step 1, left on step 2, up again on step 3 — so the whole scene
  // feels like it's turning together, not just the cube in isolation.
  var BG_OFFSETS = [
    'translate(0px, 0px)',
    'translate(0px, -70px)',
    'translate(-70px, -70px)',
    'translate(-70px, -140px)'
  ];
  var step = 0;

  function goTo(n) {
    step = Math.max(0, Math.min(STATES.length - 1, n));
    cube.style.transform = STATES[step];
    if (dotCanvas) dotCanvas.style.transform = BG_OFFSETS[step];
  }

  // ---------------------------------------------------------------
  // Next / back
  // ---------------------------------------------------------------
  function validateStep(n) {
    if (n !== 0) return true;
    var email = document.getElementById('cf-email');
    var phone = document.getElementById('cf-phone');
    if (!email.checkValidity()) { email.reportValidity(); return false; }
    if (!phone.checkValidity()) { phone.reportValidity(); return false; }
    return true;
  }

  Array.prototype.forEach.call(cube.querySelectorAll('[data-next]'), function (btn) {
    btn.addEventListener('click', function () {
      if (!validateStep(step)) return;
      goTo(step + 1);
    });
  });
  Array.prototype.forEach.call(cube.querySelectorAll('.cube-back'), function (btn) {
    btn.addEventListener('click', function () { goTo(step - 1); });
  });

  // ---------------------------------------------------------------
  // Custom dropdowns — hover-highlighted option list, since native
  // <select> options can't be reliably styled on hover.
  // ---------------------------------------------------------------
  var selectValues = {};
  function closeAllSelects(except) {
    Array.prototype.forEach.call(document.querySelectorAll('.cf-select.is-open'), function (s) {
      if (s !== except) s.classList.remove('is-open');
    });
  }
  Array.prototype.forEach.call(document.querySelectorAll('.cf-select'), function (sel) {
    var trigger = sel.querySelector('.cf-select-trigger');
    var options = Array.prototype.slice.call(sel.querySelectorAll('.cf-select-option'));
    trigger.textContent = trigger.getAttribute('data-placeholder');
    selectValues[sel.id] = '';

    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      var willOpen = !sel.classList.contains('is-open');
      closeAllSelects(sel);
      sel.classList.toggle('is-open', willOpen);
    });

    options.forEach(function (opt) {
      opt.addEventListener('click', function () {
        var value = opt.getAttribute('data-value');
        selectValues[sel.id] = value;
        trigger.textContent = opt.textContent;
        trigger.classList.add('has-value');
        options.forEach(function (o) { o.classList.toggle('is-selected', o === opt); });
        sel.classList.remove('is-open');
        onSelectChange(sel.id, value);
      });
    });
  });
  document.addEventListener('click', function () { closeAllSelects(null); });

  function onSelectChange(id, value) {
    if (id === 'cf-need-select') {
      document.getElementById('cf-need-other-row').classList.toggle('is-visible', value === 'Other');
    }
    if (id === 'cf-biztype-select') {
      document.getElementById('cf-biztype-other-row').classList.toggle('is-visible', value === 'Other');
    }
  }

  // ---------------------------------------------------------------
  // Build the mailto link from everything typed in.
  // ---------------------------------------------------------------
  function val(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  function buildMailto() {
    var name = val('cf-name');
    var email = val('cf-email');
    var phone = val('cf-phone');
    var need = selectValues['cf-need-select'] || '';
    if (need === 'Other') need = val('cf-need-other') || 'Other';
    var bizType = selectValues['cf-biztype-select'] || '';
    if (bizType === 'Other') bizType = val('cf-biztype-other') || 'Other';
    var project = val('cf-project');

    var lines = [
      'Name: ' + (name || '—'),
      'Email: ' + (email || '—'),
      'Phone: ' + (phone || '—'),
      'Need: ' + (need || '—'),
      'Business type: ' + (bizType || '—'),
      '',
      'Project details:',
      project || '—'
    ];
    var subject = 'New project inquiry' + (name ? ' from ' + name : '');
    return 'mailto:sitesmithmail@gmail.com?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(lines.join('\n'));
  }

  // ---------------------------------------------------------------
  // Send: text/buttons fade → cube shakes → dots explode → reform
  // into a paper airplane → fly off screen → open the email client.
  // ---------------------------------------------------------------
  var sendBtn = document.getElementById('cf-send');
  var note = document.getElementById('contact-page-note');
  var sending = false;

  function sample(drawFn, w, h, targetCount) {
    var off = document.createElement('canvas');
    off.width = w; off.height = h;
    var octx = off.getContext('2d');
    octx.fillStyle = '#fff'; octx.strokeStyle = '#fff';
    drawFn(octx, w, h);
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

  function paperAirplanePoints(targetCount) {
    return sample(function (c, s) {
      // A classic "send" paper airplane, outline only (like the phone
      // icon, a filled shape reads as a diffuse blob at sparse dot
      // counts — an outline traces cleanly instead).
      c.lineWidth = s * 0.035;
      c.lineJoin = 'round';
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(s * 0.95, s * 0.5);
      c.lineTo(s * 0.12, s * 0.22);
      c.lineTo(s * 0.52, s * 0.5);
      c.lineTo(s * 0.06, s * 0.88);
      c.closePath();
      c.stroke();
      c.beginPath();
      c.moveTo(s * 0.95, s * 0.5);
      c.lineTo(s * 0.52, s * 0.5);
      c.stroke();
    }, 140, 140, targetCount);
  }

  // ---------------------------------------------------------------
  // Explosion origin points: sampled fresh from the cube's own
  // bounding-box perimeter at send time (the cube itself has no
  // permanent dot outline — these dots exist only for this effect).
  // ---------------------------------------------------------------
  function rectPerimeterPoints(rect, count) {
    var w = rect.width, h = rect.height;
    var perimeter = 2 * (w + h);
    var pts = [];
    for (var i = 0; i < count; i++) {
      var d = (i / count) * perimeter;
      var x, y;
      if (d < w) { x = rect.left + d; y = rect.top; }
      else if (d < w + h) { x = rect.left + w; y = rect.top + (d - w); }
      else if (d < 2 * w + h) { x = rect.left + w - (d - w - h); y = rect.top + h; }
      else { x = rect.left; y = rect.top + h - (d - 2 * w - h); }
      pts.push({ x: x, y: y });
    }
    return pts;
  }

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInCubic(t) { return t * t * t; }

  function tween(points, targetsFn, duration, easing, onFrame) {
    return new Promise(function (resolve) {
      var start = points.map(function (p) { return { x: p.x, y: p.y, a: p.a }; });
      var targets = targetsFn();
      var t0 = performance.now();
      function step() {
        var now = performance.now();
        var t = Math.min(1, (now - t0) / duration);
        var e = easing(t);
        for (var i = 0; i < points.length; i++) {
          points[i].x = start[i].x + (targets[i].x - start[i].x) * e;
          points[i].y = start[i].y + (targets[i].y - start[i].y) * e;
          if (targets[i].a !== undefined) {
            points[i].a = start[i].a + (targets[i].a - start[i].a) * e;
          }
        }
        onFrame();
        if (t < 1) requestAnimationFrame(step); else resolve();
      }
      requestAnimationFrame(step);
    });
  }

  function runExplodeSequence() {
    var sceneRect = scene.getBoundingClientRect();
    var origins = rectPerimeterPoints(sceneRect, 72);

    var canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.left = '0'; canvas.style.top = '0';
    canvas.style.width = '100vw'; canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '80';
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    document.body.appendChild(canvas);

    var centerX = sceneRect.left + sceneRect.width / 2;
    var centerY = sceneRect.top + sceneRect.height / 2;

    var points = origins.map(function (o) {
      return { x: o.x, y: o.y, a: 1 };
    });

    function draw() {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      points.forEach(function (p) {
        if (p.a <= 0.01) return;
        ctx.beginPath();
        ctx.fillStyle = 'rgba(224, 169, 154, ' + p.a + ')';
        ctx.shadowColor = 'rgba(224, 169, 154, ' + p.a + ')';
        ctx.shadowBlur = 5;
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    var explodeTargets = points.map(function () {
      var angle = Math.random() * Math.PI * 2;
      var dist = 70 + Math.random() * 200;
      return { x: centerX + Math.cos(angle) * dist, y: centerY + Math.sin(angle) * dist, a: 1 };
    });

    var airplane = paperAirplanePoints(points.length);
    var planeScale = 170;
    var reformTargets = points.map(function (_, i) {
      var pt = airplane[i % airplane.length];
      return { x: centerX + pt[0] * planeScale, y: centerY + pt[1] * planeScale, a: 1 };
    });

    var flyDx = Math.max(window.innerWidth, window.innerHeight) * 1.1;

    return tween(points, function () { return explodeTargets; }, 550, easeOutCubic, draw)
      .then(function () {
        return tween(points, function () { return reformTargets; }, 650, function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }, draw);
      })
      .then(function () {
        return new Promise(function (resolve) { setTimeout(resolve, 180); });
      })
      .then(function () {
        var away = points.map(function (p) {
          return { x: p.x + flyDx * 0.85, y: p.y - flyDx * 0.55, a: 0 };
        });
        return tween(points, function () { return away; }, 700, easeInCubic, draw);
      })
      .then(function () {
        canvas.remove();
      });
  }

  sendBtn.addEventListener('click', function () {
    if (sending) return;
    sending = true;
    sendBtn.disabled = true;

    if (reduceMotion) {
      window.location.href = buildMailto();
      return;
    }

    if (note) note.style.opacity = '0';
    scene.classList.add('is-sending');

    setTimeout(function () {
      scene.classList.add('is-shaking');
      setTimeout(function () {
        scene.classList.remove('is-shaking');
        runExplodeSequence().then(function () {
          window.location.href = buildMailto();
        });
      }, 550);
    }, 260);
  });
})();
