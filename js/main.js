/* ============================================================
   VenturePage — page interactions (nav, contact form)
   ============================================================ */

(function () {
  'use strict';

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

  // ---- contact form (client-side only, opens mail client) ----------------
  var form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.name.value.trim();
      var email = form.email.value.trim();
      var project = form.project.value.trim();

      var subject = encodeURIComponent('New project inquiry from ' + (name || 'website visitor'));
      var body = encodeURIComponent(
        'Name: ' + name + '\n' +
        'Email: ' + email + '\n\n' +
        project
      );
      window.location.href = 'mailto:sitesmithmail@gmail.com?subject=' + subject + '&body=' + body;
    });
  }
})();
