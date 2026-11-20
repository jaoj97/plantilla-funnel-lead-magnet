# Plantilla: funnel de lead magnet

Landing con cuestionario de calificación, página de entrega por WhatsApp y una hoja de Google que guarda cada registro y le avisa a Meta (pixel + API de conversiones) solo cuando la persona califica.

No necesitas servidor ni programar: la página vive gratis en GitHub Pages con tu propio subdominio, y los datos llegan a tu Google Sheet.

## Qué archivo tocas

| Archivo | Para qué |
|---|---|
| `config.js` | Todo el texto: títulos, preguntas de calificación, WhatsApp, pixel, URL de tu hoja |
| `estilos.css` | Tus colores y tipografías (solo el primer bloque) |
| `CNAME` | Tu subdominio, por ejemplo `clase.tudominio.com` |
| `apps-script/Codigo.gs` | Se copia completo dentro de tu Google Sheet (Extensiones > Apps Script). No se edita |

Los demás archivos no se tocan.

## Cómo funciona

1. La persona llega del anuncio y ve la primera pregunta en la primera pantalla.
2. Cada respuesta se guarda en tu hoja al momento, aunque no termine.
3. Al registrarse, si sus respuestas pasan tus «puertas», la página y tu hoja le avisan a Meta con el evento `Lead` (mismo ID en los dos, así Meta no lo cuenta doble). Si no califica, recibe lo mismo pero Meta no se entera: así la pauta aprende a traer a quien sí te sirve.
4. En la página de entrega toca un botón y te escribe por WhatsApp con un mensaje que ya trae su nombre y su correo.
5. Tú marcas en la hoja cómo avanza (escribió, propuesta, agendó, asistió, compró) y el tablero se llena solo.

## Reglas de seguridad

- Tu token de Meta va **solo** en las Propiedades del script de Apps Script. Nunca en `config.js`: este repositorio es público.
- El ID del pixel y la URL de tu Apps Script sí pueden ir en `config.js`; no son secretos.
- Las campañas que tu asistente de IA arme se crean en pausa. Las activas tú.
