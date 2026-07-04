/* =============================================================================
   NOGAL — Lógica del asistente de inventario
   ---------------------------------------------------------------------------
   Controla tanto la ventana de chat de la sección "Asistente" como el widget
   flotante. Si NOGAL_CONFIG.chatWebhookUrl está definido, envía la pregunta al
   webhook de n8n; si no, responde con un mock local realista (modo demo).
   ========================================================================== */
(function () {
  "use strict";

  var CFG = window.NOGAL_CONFIG || {};
  // sessionId estable por pestaña: permite a n8n mantener contexto de conversación.
  var SESSION_ID = "nogal-" + Math.random().toString(36).slice(2, 10);

  /* ---------- Respuestas simuladas (modo demo, sin backend) ---------------- */
  var MOCK = [
    { rx: /tabl[oó]n|madera|materia/i, a: "Tablón de madera (TAB-STD, materia prima): quedan <strong>1,240 pies tabla</strong> en almacén. Reposición estimada en 6 días." },
    { rx: /mesa/i,              a: "Mesa de comedor · Nogal (MES-NOG): <strong>42 unidades</strong> disponibles. 3 en producción y 5 reservadas para despacho." },
    { rx: /silla/i,             a: "Silla de comedor · Roble (SIL-ROB): <strong>260 unidades</strong> en stock. Es tu producto de mayor rotación este mes. 🪑" },
    { rx: /c[oó]moda|cajoner/i,  a: "Cómoda · Cedro (COM-CED): <strong>38 unidades</strong> disponibles. Stock medio: puedes programar un lote si esperas pedidos grandes." },
    { rx: /estanter|librero/i,   a: "Estantería · Nogal (EST-NOG): <strong>54 unidades</strong> disponibles. Demanda al alza por temporada escolar/oficina." },
    { rx: /escritorio/i,         a: "Escritorio · Roble (ESC-ROB): <strong>71 unidades</strong>. Próxima reposición programada en la quincena." },
    { rx: /pedido|orden|despach/i, a: "Hoy tienes <strong>7 pedidos</strong>: 4 listos para despacho, 2 en producción y 1 pendiente de material (nogal)." },
    { rx: /rota|m[aá]s vende|top/i, a: "Los 3 productos de mayor rotación (últimos 30 días): 1) Sillas de roble, 2) Mesas de nogal, 3) Escritorios de roble." },
    { rx: /acabado|barniz|aceite/i, a: "Por acabado, el stock combinado es: aceite natural 46%, barniz mate 31%, laca 15%, otros 8%. ¿Quieres el detalle de un producto?" }
  ];

  function mockAnswer(q) {
    for (var i = 0; i < MOCK.length; i++) {
      if (MOCK[i].rx.test(q)) return MOCK[i].a;
    }
    return "En modo demo solo tengo datos de ejemplo. Conéctame al agente de n8n para consultar el inventario real del ERP. Prueba: <em>“¿cuántos tablones de madera quedan?”</em>";
  }

  /* ---------- Utilidades de UI -------------------------------------------- */
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function addMsg(log, who, html) {
    var m = el("div", "msg " + who, html);
    log.appendChild(m);
    log.scrollTop = log.scrollHeight;
    return m;
  }

  function extractReply(data) {
    if (data == null) return null;
    if (typeof data === "string") return data;
    var paths = CFG.chatResponsePaths || ["reply", "output", "text"];
    for (var i = 0; i < paths.length; i++) {
      var v = data[paths[i]];
      if (typeof v === "string" && v.trim()) return v;
    }
    // n8n a veces envía [{ json: {...} }] o { data: {...} }
    if (Array.isArray(data) && data.length) return extractReply(data[0].json || data[0]);
    if (data.data) return extractReply(data.data);
    return null;
  }

  /* ---------- Llamada al agente (n8n) o mock ------------------------------ */
  function ask(question) {
    var url = CFG.chatWebhookUrl;
    if (!url) {
      // Modo demo: simula latencia de red.
      return new Promise(function (resolve) {
        setTimeout(function () { resolve(mockAnswer(question)); }, 550 + Math.random() * 400);
      });
    }
    var body = { sessionId: SESSION_ID };
    body[CFG.chatMessageKey || "message"] = question;

    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        var ct = r.headers.get("content-type") || "";
        return ct.indexOf("application/json") !== -1 ? r.json() : r.text();
      })
      .then(function (data) {
        return extractReply(data) ||
          "Recibí una respuesta que no pude interpretar. Revisa el formato de salida del webhook de n8n.";
      })
      .catch(function (err) {
        console.error("[NOGAL chat] error:", err);
        return "No pude contactar al asistente en este momento. Verifica el webhook de n8n o inténtalo más tarde.";
      });
  }

  /* ---------- Enlaza un conjunto de elementos de chat --------------------- */
  function wireChat(ids) {
    var form  = document.getElementById(ids.form);
    var input = document.getElementById(ids.input);
    var log   = document.getElementById(ids.log);
    var chips = document.getElementById(ids.chips);
    if (!form || !input || !log) return;

    function send(text) {
      var q = (text != null ? text : input.value).trim();
      if (!q) return;
      addMsg(log, "user", q.replace(/</g, "&lt;"));
      input.value = "";
      var typing = addMsg(log, "bot typing", "escribiendo…");

      ask(q).then(function (reply) {
        typing.className = "msg bot";
        typing.innerHTML = reply;
        log.scrollTop = log.scrollHeight;
      });
    }

    form.addEventListener("submit", function (e) { e.preventDefault(); send(); });

    if (chips) {
      chips.addEventListener("click", function (e) {
        var btn = e.target.closest(".chip");
        if (btn) send(btn.textContent);
      });
    }
  }

  /* ---------- Init --------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", function () {
    // Chat de la sección "Asistente"
    wireChat({ form: "demoForm", input: "demoInput", log: "demoLog", chips: "demoChips" });
    // Widget flotante
    wireChat({ form: "fabForm", input: "fabInput", log: "fabLog", chips: "fabChips" });

    // Aviso en consola sobre el modo activo (útil para el equipo).
    if (!CFG.chatWebhookUrl) {
      console.info("%c[NOGAL] Chat en MODO DEMO. Define NOGAL_CONFIG.chatWebhookUrl en js/config.js para conectar n8n.", "color:#B4532E");
    }
  });

  // Expuesto para main.js (abrir/cerrar widget flotante).
  window.NOGAL_CHAT = { wireChat: wireChat };
})();
