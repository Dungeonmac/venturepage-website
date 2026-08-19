/* ============================================================
   VenturePage — shared page interactions (mobile nav toggle).
   Used on every page; contact.html has its own js/contact.js
   for the multi-step form.
   ============================================================ */

(function () {
  'use strict';

  // ---- logo always scrolls back to top -----------------------------------
  Array.prototype.forEach.call(document.querySelectorAll('[data-nav-home]'), function (link) {
    var href = link.getAttribute('href') || '';
    if (href.charAt(0) === '#') {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  });

  // ---- mobile nav toggle -------------------------------------------------
  var toggle = document.getElementById('nav-toggle');
  var nav = document.getElementById('main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }
})();
