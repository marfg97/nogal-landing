/* =============================================================================
   NOGAL — Interacciones de la página
   Navbar (scroll + menú móvil), reveal on scroll, widget flotante,
   botón de acceso al ERP y formulario de contacto.
   ========================================================================== */
(function () {
  "use strict";
  var CFG = window.NOGAL_CONFIG || {};

  /* ---------- Navbar: sombra al hacer scroll ------------------------------ */
  var nav = document.getElementById("nav");
  function onScroll() {
    if (window.scrollY > 8) nav.classList.add("scrolled");
    else nav.classList.remove("scrolled");
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Menú móvil --------------------------------------------------- */
  var toggle = document.getElementById("navToggle");
  var menu = document.getElementById("mobileMenu");
  toggle.addEventListener("click", function () {
    var open = menu.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  // Cierra al pulsar un enlace del menú.
  menu.addEventListener("click", function (e) {
    if (e.target.tagName === "A") {
      menu.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });

  /* ---------- Reveal on scroll (IntersectionObserver) --------------------- */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (r) { io.observe(r); });
  } else {
    reveals.forEach(function (r) { r.classList.add("in"); });
  }

  /* ---------- Widget flotante de chat ------------------------------------- */
  var fab = document.getElementById("fab");
  var panel = document.getElementById("fabPanel");
  var fabClose = document.getElementById("fabClose");
  var badge = fab.querySelector(".badge");

  function setPanel(open) {
    panel.classList.toggle("open", open);
    fab.setAttribute("aria-expanded", String(open));
    if (open) {
      if (badge) badge.style.display = "none";
      var inp = document.getElementById("fabInput");
      if (inp) setTimeout(function () { inp.focus(); }, 150);
    }
  }
  fab.addEventListener("click", function () { setPanel(!panel.classList.contains("open")); });
  fabClose.addEventListener("click", function () { setPanel(false); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && panel.classList.contains("open")) setPanel(false);
  });

  /* ---------- Botón de acceso al ERP -------------------------------------- */
  /* Si hay endpoint de auto-login configurado, lo usamos (la Lambda mantiene
     las credenciales como variables de entorno y redirige con la sesión).
     Si no, el href por defecto lleva a la página de login del ERP. */
  var erpBtn = document.getElementById("erpLoginBtn");
  if (erpBtn) {
    var endpoint = CFG.erpLoginEndpoint || erpBtn.getAttribute("data-login-endpoint");
    if (endpoint) {
      erpBtn.setAttribute("href", endpoint);
      erpBtn.removeAttribute("target"); // navegación directa para recibir la cookie de sesión
    }
  }

  /* ---------- Formulario de contacto -------------------------------------- */
  var form = document.getElementById("contactForm");
  var status = document.getElementById("contactStatus");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = document.getElementById("cName");
      var email = document.getElementById("cEmail");

      // Validación mínima en cliente.
      if (!name.value.trim() || !email.value.trim() || !/^\S+@\S+\.\S+$/.test(email.value)) {
        status.style.color = "#B4532E";
        status.textContent = "Por favor completa tu nombre y un correo válido.";
        return;
      }

      var payload = {
        name: name.value.trim(),
        email: email.value.trim(),
        interest: document.getElementById("cInterest").value,
        message: document.getElementById("cMsg").value.trim()
      };

      if (CFG.contactEndpoint) {
        status.style.color = "var(--c-taupe)";
        status.textContent = "Enviando…";
        fetch(CFG.contactEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })
          .then(function (r) { if (!r.ok) throw new Error(r.status); return r; })
          .then(function () { ok(); })
          .catch(function () {
            status.style.color = "#B4532E";
            status.textContent = "No se pudo enviar. Escríbenos a ventas@nogal-muebles.com.";
          });
      } else {
        // Sin backend: confirmación local (modo demo estático).
        ok();
      }

      function ok() {
        form.reset();
        status.style.color = "#3fae6b";
        status.textContent = "¡Gracias, " + payload.name.split(" ")[0] + "! Recibimos tu solicitud y te contactaremos pronto.";
      }
    });
  }
})();
