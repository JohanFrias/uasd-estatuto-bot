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
| Inteligencia artificial | API de OpenAI

## Puesta en marcha

Requisitos: Node.js 18 o superior, MySQL en ejecución y una clave de API de OpenAI (<https://platform.openai.com/api-keys>).


1. Instalar dependencias
npm install

2. Configurar variables de entorno
   .env
 Configura OPENAI_API_KEY, DB_USER y DB_PASSWORD en .env

3. Descargar y procesar el Estatuto (una sola vez)
npm run build:data

4. Iniciar
npm start
abre http://localhost:3000


- El servidor crea la base de datos y las tablas automáticamente (`database/schema.sql` es solo documentación).
- Si el paso 3 no puede descargar el PDF, descárgalo a mano y ejecuta  
  `npm run build:data -- ruta/al/ESTATUTO-ORGANICO-UASD.pdf`.
- Sin `OPENAI_API_KEY`, o si OpenAI no está disponible, la app responde en modo básico con los fragmentos más relacionados del Estatuto.

## Arquitectura del sistema

La aplicación se organiza en tres partes:

1. **Frontend (`public/`)** presenta el chat, envía preguntas a la API del servidor y muestra las respuestas y sus fuentes.
2. **Backend (`server/`)** expone las rutas HTTP, valida las preguntas, busca los fragmentos pertinentes, coordina la generación de respuestas y, si está disponible, guarda el historial en MySQL.
3. **Datos del Estatuto (`data/`)** contienen el PDF original y el documento estructurado que el servidor usa para la búsqueda.

El navegador nunca necesita la clave de OpenAI: las llamadas al proveedor se realizan desde el servidor. MySQL se usa únicamente para el historial; si no está disponible, el chat sigue funcionando sin esa función.

## Integración de la inteligencia artificial

El backend usa el SDK oficial de OpenAI y lee `OPENAI_API_KEY` desde las variables de entorno. El modelo se puede indicar con `OPENAI_MODEL`; por defecto se usa `gpt-4o-mini`.

La solicitud a OpenAI incluye instrucciones de sistema y los fragmentos recuperados del Estatuto. Se instruye al modelo a responder en español, no inventar información y citar los artículos pertinentes. La clave debe mantenerse en el servidor y no debe añadirse al frontend ni subirse al repositorio.

Si no hay una clave configurada o la API no está disponible, el sistema muestra una respuesta extractiva con los fragmentos más relacionados. Si la cuenta de OpenAI no tiene crédito o cuota, hay que revisar su facturación y límites.


## Integración de la inteligencia artificial

El backend usa el SDK oficial de OpenAI y lee `OPENAI_API_KEY` desde las variables de entorno. El modelo se puede indicar con `OPENAI_MODEL`; por defecto se usa `gpt-4o-mini`.

La solicitud a OpenAI incluye instrucciones de sistema y los fragmentos recuperados del Estatuto. Se instruye al modelo a responder en español, no inventar información y citar los artículos pertinentes. La clave debe mantenerse en el servidor y no debe añadirse al frontend ni subirse al repositorio.

Si no hay una clave configurada o la API no está disponible, el sistema muestra una respuesta extractiva con los fragmentos más relacionados. Si la cuenta de OpenAI no tiene crédito o cuota, hay que revisar su facturación y límites.

