/* =============================================================================
   NOGAL — Configuración de integración (frontend)
   ---------------------------------------------------------------------------
   Este es el ÚNICO archivo que necesitas editar para conectar la landing con
   los servicios reales. No contiene secretos: solo URLs públicas de endpoints.
   Los secretos (usuario/clave del ERP) viven en el backend (variables de
   entorno de la Lambda), nunca aquí.
   ========================================================================== */

window.NOGAL_CONFIG = {
  /* ------------------------------------------------------------------
     1) CHAT — Webhook del agente de IA (n8n en AWS ECS)
     Pega aquí la URL del webhook de PRODUCCIÓN de n8n. Mientras esté
     vacío (""), el chat funciona en MODO DEMO con respuestas simuladas.

     Según la infraestructura desplegada (template.yml), n8n corre en
     ECS Fargate (puerto 5678) detrás del ALB en la ruta "/n8n/", con
     host n8n.theartificialmachine.com. El webhook tendrá la forma:
       http://n8n.theartificialmachine.com/webhook/<ruta-del-workflow>
     (pídele al equipo de backend la <ruta> exacta del workflow).

     ⚠️ OJO MIXED-CONTENT: si esta landing se sirve por HTTPS (CloudFront)
     y el webhook es HTTP, el navegador bloqueará el fetch. Solución:
     poner HTTPS en n8n (recomendado) o servir la landing por HTTP en la
     demo. Ver README → "Cómo conectar el chat con n8n".
     ------------------------------------------------------------------ */
  chatWebhookUrl: "",

  /* Nombre del campo que n8n espera recibir con la pregunta del usuario.
     El body enviado será: { [chatMessageKey]: "texto", sessionId: "..." } */
  chatMessageKey: "message",

  /* Ruta dentro del JSON de respuesta de n8n donde está el texto a mostrar.
     Se prueban en orden; la primera que exista se usa.
     Ej: respuesta { "output": "..." } → deja "output" en la lista. */
  chatResponsePaths: ["reply", "output", "text", "answer", "message"],

  /* ------------------------------------------------------------------
     2) ERP — Auto-login (opcional)
     Si despliegas la Lambda de backend/, pega aquí su Function URL.
     Vacío ("") => el botón lleva a la página normal de login del ERP.
     ------------------------------------------------------------------ */
  erpLoginEndpoint: "",

  /* ------------------------------------------------------------------
     3) CONTACTO — Endpoint del formulario (opcional)
     Vacío => el formulario solo valida y muestra confirmación local.
     ------------------------------------------------------------------ */
  contactEndpoint: ""
};
