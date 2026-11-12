# Asistente del Estatuto Orgánico de la UASD

Aplicación web tipo chatbot que responde, en lenguaje natural y con inteligencia artificial, consultas sobre el **Estatuto Orgánico de la Universidad Autónoma de Santo Domingo**. Las respuestas se basan únicamente en el texto oficial del Estatuto y citan los artículos de donde sale la información.


## MySQL

MySQL se usa para guardar el **historial de conversaciones** (el panel lateral). Si MySQL no está disponible, el chatbot sigue funcionando; solo se desactiva el historial guardado.

## Tecnologías

| Capa | Tecnología |
|------|-----------|
| Frontend | HTML, CSS y JavaScript
| Backend | Node.js + Express 
| Base de datos | MySQL
| Inteligencia artificial | Gemini API o OpenAI

## Puesta en marcha

Requisitos: Node.js 18 o superior, MySQL en ejecución (opcional) y una clave de Gemini API (<https://aistudio.google.com/apikey>) o de OpenAI.


1. Instalar dependencias
npm install

2. Configurar variables de entorno
   .env
 Configura GEMINI_API_KEY en `.env`; también puedes usar OPENAI_API_KEY.
 Si ambas claves están configuradas, Gemini se usa por defecto. AI_PROVIDER permite elegir `gemini` u `openai`.

3. Descargar y procesar el Estatuto (una sola vez)
npm run build:data

4. Iniciar
npm start
abre http://localhost:3000

## Publicar la interfaz en GitHub Pages

La interfaz estática se puede publicar con `npm run deploy`. Después, en GitHub,
ve a **Settings → Pages** y selecciona la rama `gh-pages` y la carpeta `/(root)`.
La URL será <https://johanfrias.github.io/uasd-estatuto-bot/>.

GitHub Pages no ejecuta el servidor Node.js. Por eso, esta publicación muestra
la interfaz, pero las consultas y el historial no funcionarán hasta alojar
también el backend en un servicio compatible y configurar la interfaz para usar
su URL.

### Conectar GitHub Pages con Render

El archivo `render.yaml` configura el backend Express en Render. Para activarlo:

1. Sube estos cambios a GitHub y, en Render, crea un **Blueprint** conectado a este repositorio.
2. En la configuración del servicio, agrega `GEMINI_API_KEY` como variable secreta. No la pongas en archivos del repositorio ni en el frontend. Si también existe `OPENAI_API_KEY`, Gemini se selecciona automáticamente.
3. Cuando Render termine el despliegue, copia la URL HTTPS del servicio y colócala como `API_BASE_URL` en `public/js/config.js`.
4. Ejecuta `npm run deploy` para volver a publicar el frontend en GitHub Pages.

El servicio de Render desactiva MySQL por defecto: el chat responde, pero el
historial persistente no estará disponible. En el plan gratuito, el primer
acceso después de un periodo sin uso puede tardar mientras el servicio se inicia.


- El servidor crea la base de datos y las tablas automáticamente (`database/schema.sql` es solo documentación).
- Si el paso 3 no puede descargar el PDF, descárgalo a mano y ejecuta  
  `npm run build:data -- ruta/al/ESTATUTO-ORGANICO-UASD.pdf`.
- Sin una clave configurada, o si el proveedor no está disponible, la app responde en modo básico con los fragmentos más relacionados del Estatuto.

## Arquitectura del sistema

La aplicación se organiza en tres partes:

1. **Frontend (`public/`)** presenta el chat, envía preguntas a la API del servidor y muestra las respuestas y sus fuentes.
2. **Backend (`server/`)** expone las rutas HTTP, valida las preguntas, busca los fragmentos pertinentes, coordina la generación de respuestas y, si está disponible, guarda el historial en MySQL.
3. **Datos del Estatuto (`data/`)** contienen el PDF original y el documento estructurado que el servidor usa para la búsqueda.

El navegador nunca necesita las claves de Gemini u OpenAI: las llamadas al proveedor se realizan desde el servidor. MySQL se usa únicamente para el historial; si no está disponible, el chat sigue funcionando sin esa función.

## Integración de la inteligencia artificial

El backend usa la Gemini Interactions API por defecto cuando `GEMINI_API_KEY` está configurada. El modelo se puede indicar con `GEMINI_MODEL` (por defecto, `gemini-3.8-flash`). También conserva compatibilidad con OpenAI mediante `OPENAI_API_KEY` y `OPENAI_MODEL`; `AI_PROVIDER` permite elegir proveedor explícitamente.

La solicitud incluye instrucciones para responder únicamente con los fragmentos recuperados del Estatuto. La clave se envía desde el servidor en el encabezado autenticado y nunca se expone al navegador. Si el proveedor no está configurado o falla, el sistema muestra una respuesta extractiva basada en los fragmentos más relacionados.

