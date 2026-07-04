/* =============================================================================
   NOGAL — Lambda de auto-login al ERP (ERPNext)
   ---------------------------------------------------------------------------
   Propósito: que el botón "Iniciar sesión en ERPNext" de la landing lleve al
   usuario de demo YA autenticado, SIN exponer las credenciales en el HTML/JS
   del cliente. Las credenciales se leen de VARIABLES DE ENTORNO de la Lambda.

   Flujo:
     Navegador → Function URL de esta Lambda → POST /api/method/login a ERPNext
     → tomamos la cookie de sesión (sid) → respondemos 302 al ERP con Set-Cookie.

   Despliegue recomendado: AWS Lambda con Function URL (runtime Node.js 20+).
   Variables de entorno requeridas:
     ERP_URL       = http://erp.theartificialmachine.com
     ERP_USERNAME  = 21101076@ue.edu.pe
     ERP_PASSWORD  = (la clave)              <-- NUNCA en el repo
     ALLOW_ORIGIN  = https://tu-dominio-cloudfront   (para CORS)

   Nota de seguridad: auto-login con credenciales compartidas es aceptable SOLO
   para un entorno académico/demo. En producción usarías OAuth/SSO por usuario.
   ========================================================================== */

export const handler = async (event) => {
  const ERP_URL = (process.env.ERP_URL || "").replace(/\/+$/, "");
  const USER = process.env.ERP_USERNAME;
  const PASS = process.env.ERP_PASSWORD;
  const ORIGIN = process.env.ALLOW_ORIGIN || "*";

  const cors = {
    "Access-Control-Allow-Origin": ORIGIN,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Preflight CORS
  const method = event?.requestContext?.http?.method || event?.httpMethod;
  if (method === "OPTIONS") {
    return { statusCode: 204, headers: cors, body: "" };
  }

  if (!ERP_URL || !USER || !PASS) {
    return {
      statusCode: 500,
      headers: cors,
      body: "Config faltante: define ERP_URL, ERP_USERNAME y ERP_PASSWORD como variables de entorno.",
    };
  }

  try {
    // ERPNext expone /api/method/login (form-urlencoded).
    const res = await fetch(`${ERP_URL}/api/method/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ usr: USER, pwd: PASS }).toString(),
      redirect: "manual",
    });

    if (res.status !== 200) {
      return { statusCode: 502, headers: cors, body: `ERP respondió ${res.status} al intentar login.` };
    }

    // Reenviamos las cookies de sesión que emitió ERPNext (sid, etc.).
    const setCookies = res.headers.getSetCookie
      ? res.headers.getSetCookie()
      : [res.headers.get("set-cookie")].filter(Boolean);

    // Redirigimos al escritorio del ERP ya con sesión iniciada.
    return {
      statusCode: 302,
      headers: { ...cors, Location: `${ERP_URL}/app` },
      cookies: setCookies,       // Lambda Function URL soporta el array "cookies"
      body: "",
    };
  } catch (err) {
    console.error("[erp-login] error:", err);
    return { statusCode: 500, headers: cors, body: "Error al contactar el ERP." };
  }
};
