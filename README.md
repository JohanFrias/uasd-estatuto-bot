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


# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
   .env
#  Configura OPENAI_API_KEY, DB_USER y DB_PASSWORD en .env

# 3. Descargar y procesar el Estatuto (una sola vez)
npm run build:data

# 4. Iniciar
npm start
# abre http://localhost:3000


- El servidor crea la base de datos y las tablas automáticamente (`database/schema.sql` es solo documentación).
- Si el paso 3 no puede descargar el PDF, descárgalo a mano y ejecuta  
  `npm run build:data -- ruta/al/ESTATUTO-ORGANICO-UASD.pdf`.
- Sin `OPENAI_API_KEY`, o si OpenAI no está disponible, la app responde en modo básico con los fragmentos más relacionados del Estatuto.

## Cómo funciona


Medidas contra respuestas inventadas:
- La IA solo ve los fragmentos recuperados y tiene instrucciones estrictas de no usar conocimiento externo.
- Si la búsqueda no encuentra nada relevante, ni siquiera se consulta a la IA.
- Las instrucciones incluidas en la pregunta o en el texto no pueden anular las reglas del sistema.
- La interfaz recuerda que la respuesta debe verificarse en el documento oficial.
