# NOGAL — Landing de Manufactura de Muebles Inteligente

Frontend estático de una empresa de muebles de madera peruana ficticia (**NOGAL**) que digitalizó su
operación con **ERPNext + agente de IA (n8n/Bedrock) + analítica (Glue/Athena/QuickSight)**
sobre AWS. Proyecto académico de arquitectura cloud.

La landing es **100% estática** (HTML/CSS/JS plano) para desplegarse en **S3 + CloudFront**,
con **una Lambda opcional** para el auto-login al ERP sin exponer credenciales.

---

## 📁 Estructura

```
CLOUD/
├─ frontend/                 # Sitio estático (esto va a S3)
│  ├─ index.html             # Página completa (todas las secciones)
│  ├─ css/
│  │  └─ styles.css          # Sistema de diseño + componentes
│  ├─ js/
│  │  ├─ config.js           # ← ÚNICO archivo a editar para integrar servicios
│  │  ├─ chat.js             # Asistente: mock local o webhook n8n
│  │  └─ main.js             # Navbar, reveal, widget flotante, formulario
│  └─ assets/                # Logo + imágenes SVG de mobiliario/madera (no se rompen)
│
├─ backend/
│  ├─ .env.example           # Variables de entorno (credenciales demo)
│  └─ erp-login/             # Lambda de auto-login a ERPNext
│     ├─ index.mjs
│     └─ package.json
│
├─ .gitignore
└─ README.md
```

---

## 🎨 Diseño

- **Paleta (tonos madera / tierra cálidos):** crema `#FBF7F0`, terracota `#B4532E`,
  ocre `#D8A24A`, índigo `#27333B`, espresso `#241E1A`, taupe `#8A7A6D`.
- **Tipografía:** *Fraunces* (serif display) para titulares + *Inter* para cuerpo.
- **Mobile-first**, responsive, `prefers-reduced-motion` respetado, imágenes con
  `loading="lazy"` y SVG vectoriales (peso mínimo, nunca rotas).

---

## 🚀 Despliegue del frontend (S3 + CloudFront)

```bash
# 1. Crear el bucket (nombre único)
aws s3 mb s3://nogal-landing

# 2. Subir el sitio (solo la carpeta frontend/)
aws s3 sync frontend/ s3://nogal-landing --delete

# 3. Servir detrás de CloudFront (recomendado: OAC + HTTPS)
#    - Origin: el bucket S3
#    - Default root object: index.html
#    - Invalida la caché tras cada deploy:
aws cloudfront create-invalidation --distribution-id <TU_ID> --paths "/*"
```

> Cabeceras sugeridas: `Cache-Control: max-age=31536000` para `assets/` y
> `css/`, y `max-age=0, must-revalidate` para `index.html`.

Para probar en local, cualquier servidor estático sirve:

```bash
cd frontend
python -m http.server 8080     # → http://localhost:8080
```

---

## 🤖 Cómo conectar el chat con el agente real de n8n

**Estado actual:** el chat funciona en **modo demo** (respuestas simuladas en
`chat.js`). Para conectarlo al agente real solo edita `frontend/js/config.js`:

```js
window.NOGAL_CONFIG = {
  chatWebhookUrl: "https://TU-N8N/webhook/inventario",  // ← pega la URL aquí
  chatMessageKey: "message",                            // campo que envía la pregunta
  chatResponsePaths: ["reply", "output", "text"],       // dónde leer la respuesta
  ...
};
```

### ✅ Checklist — qué pedirle al equipo de backend (n8n)

Para conectar el chat necesito **una sola cosa: la URL del webhook**, más su
contrato de entrada/salida. Pídele al equipo:

1. **URL del webhook de producción** del workflow de n8n en ECS.
   - Ej: `https://n8n.theartificialmachine.com/webhook/inventario`
   - Que sea el webhook **Production** (no el de *Test*, que solo vive tras pulsar “Execute”).

2. **Método y formato de entrada.** Este frontend envía por defecto:
   ```http
   POST <webhook>
   Content-Type: application/json

   { "message": "¿cuántos tablones de roble quedan?", "sessionId": "nogal-xxxx" }
   ```
   → Si n8n espera otro nombre de campo (p. ej. `chatInput` o `query`), ajusta
   `chatMessageKey` en `config.js`.

3. **Formato de salida (JSON).** Que el nodo *Respond to Webhook* devuelva algo como:
   ```json
   { "reply": "Quedan 1,240 pies tabla de tablón de madera (SKU TAB-STD)." }
   ```
   → Si la clave es distinta (`output`, `text`, `answer`…), agrégala a
   `chatResponsePaths`. El código ya tolera `[{ "json": {...} }]` y `{ "data": {...} }`.

4. **CORS habilitado** en el webhook para el dominio de CloudFront:
   `Access-Control-Allow-Origin: https://<tu-distribucion>.cloudfront.net`
   (y responder a `OPTIONS`). Sin esto, el navegador bloqueará la llamada.

5. **HTTPS** en el endpoint (CloudFront sirve por HTTPS; no puede llamar a `http://`).

6. *(Opcional)* Si el agente mantiene contexto de conversación, que use el
   `sessionId` que ya enviamos para hilar el historial por usuario.

> Con esos 6 puntos resueltos, conectar el chat es cambiar **una línea** en `config.js`.

---

## 🔐 Acceso al ERP sin credenciales en el cliente

El botón **“Iniciar sesión en ERPNext”** NO contiene usuario/clave. Dos modos:

- **Sin backend (por defecto):** el botón lleva a
  `http://erp.theartificialmachine.com/login` y el usuario ingresa sus datos.
- **Con auto-login (demo):** despliega la Lambda `backend/erp-login/`. Guarda las
  credenciales como **variables de entorno** (ver `backend/.env.example`), hace el
  login contra `/api/method/login` de ERPNext y redirige con la cookie de sesión.
  Luego pega su *Function URL* en `config.js → erpLoginEndpoint`.

### Desplegar la Lambda

```bash
cd backend/erp-login
zip -r function.zip index.mjs package.json
aws lambda create-function \
  --function-name nogal-erp-login \
  --runtime nodejs20.x --handler index.handler \
  --zip-file fileb://function.zip \
  --role arn:aws:iam::<CUENTA>:role/<ROL_LAMBDA>
# Variables de entorno: ERP_URL, ERP_USERNAME, ERP_PASSWORD, ALLOW_ORIGIN
# Habilita una Function URL (Auth: NONE para demo) y usa esa URL en config.js
```

> ⚠️ El auto-login con credenciales compartidas es válido **solo para demo
> académica**. En producción real se usaría SSO/OAuth por usuario. El
> `.env` real está en `.gitignore` — nunca se versiona.

---

## 🧩 Integración con el resto del sistema (mapa)

| Capa | Servicio | Dónde se refleja en la landing |
|------|----------|--------------------------------|
| ERP | ERPNext | Botón “Acceso al sistema” + datos del catálogo |
| Agente IA | n8n (ECS/ECR) + Amazon Bedrock | Widget de chat “Preguntar por inventario” |
| Analítica | AWS Glue (ETL) + Athena / QuickSight | Sección “Reportes y analítica al día” |
| Hosting | S3 + CloudFront | Todo el frontend estático |
| Auth demo | AWS Lambda | Auto-login opcional al ERP |

---

## ✔️ Verificación de enlaces (hecha)

- Navegación interna (`#sistema`, `#asistente`, `#catalogo`, `#contacto`, `#acceso`) → OK.
- Botón de login → `erp.theartificialmachine.com` (o Lambda si se configura).
- Chat demo y widget flotante → responden con mock; hook a n8n listo.
- Formulario de contacto → valida y confirma (envía a `contactEndpoint` si se define).
