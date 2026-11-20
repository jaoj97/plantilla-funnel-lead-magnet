/*
  CONFIGURACIÓN DEL FUNNEL
  ------------------------
  Este es el único archivo de texto que necesitas cambiar para adaptar la página
  a tu negocio. Los colores y la tipografía están en estilos.css (arriba del todo).

  El contenido de ejemplo es de un taller para dueños de consultorios dentales.
  Reemplázalo completo con el tuyo: títulos, preguntas, WhatsApp y textos de entrega.
*/
window.FUNNEL = {
  // Nombre corto del lead magnet. Se guarda en cada registro de tu hoja.
  lead_magnet: "taller-agenda-llena",

  marca: {
    nombre: "Tu marca",
    // Ruta o URL de tu logo (opcional). Ejemplo: "logo.png". Vacío = solo texto.
    logo: ""
  },

  // Textos de la primera pantalla
  textos: {
    antetitulo: "Taller gratuito para dueños de consultorio dental",
    titulo: "Llena tu agenda con pacientes que regresan, sin bajar tus precios",
    bajada: "Responde 3 preguntas y te envío el taller por WhatsApp. Toma menos de un minuto.",
    incluye_titulo: "En el taller vas a ver",
    incluye: [
      "Por qué los pacientes nuevos que llegan por descuento casi nunca regresan",
      "El mensaje de seguimiento que reactiva a quien no vuelve en 6 meses",
      "Cómo decidir cuánto invertir en anuncios con los números de tu propio consultorio"
    ],
    // Línea legal al pie del formulario (no la quites: es parte de tu aviso de privacidad)
    aviso_parcial: "Lo que escribas aquí se guarda aunque no termines, para poder ayudarte si se corta la conexión.",
    boton_final: "Quiero el taller",
    // Video opcional debajo del cuestionario. URL de YouTube tipo "https://www.youtube.com/embed/ID" o vacío.
    video_embed: ""
  },

  /*
    PREGUNTAS DE CALIFICACIÓN
    Una pregunta por pantalla, en este orden. La primera aparece en cuanto carga la página.
    - Las opciones con  descalifica: true  son las "puertas": si la persona elige una,
      queda como NO calificada (igual recibe el contenido, pero a Meta no se le avisa).
    - Una pregunta sin ninguna opción que descalifique sirve para conocer a la persona.
    - Ideal: 3 preguntas, máximo 4.
  */
  preguntas: [
    {
      id: "consultorio",
      texto: "¿Tienes un consultorio propio funcionando?",
      opciones: [
        { texto: "Sí, ya atiendo pacientes", valor: "si" },
        { texto: "Estoy por abrir", valor: "por_abrir", descalifica: true },
        { texto: "Trabajo en el consultorio de alguien más", valor: "empleado", descalifica: true }
      ]
    },
    {
      id: "pacientes",
      texto: "¿Cuántos pacientes nuevos recibes al mes, más o menos?",
      opciones: [
        { texto: "Menos de 10", valor: "menos_10", descalifica: true },
        { texto: "Entre 10 y 30", valor: "10_30" },
        { texto: "Más de 30", valor: "mas_30" }
      ]
    },
    {
      id: "freno",
      texto: "¿Qué te frena más hoy?",
      opciones: [
        { texto: "Llegan pacientes, pero no regresan", valor: "retencion" },
        { texto: "Llegan muy pocos pacientes nuevos", valor: "captacion" },
        { texto: "Llegan, pero solo buscan precio", valor: "precio" }
      ]
    }
  ],

  // Datos de contacto (última pantalla)
  contacto: {
    pedir_correo: true,
    lada_por_defecto: "52",
    // Lada y nombre del país. Deja las que apliquen a tu mercado.
    ladas: [
      ["52", "México"], ["57", "Colombia"], ["54", "Argentina"], ["56", "Chile"],
      ["51", "Perú"], ["593", "Ecuador"], ["502", "Guatemala"], ["506", "Costa Rica"],
      ["507", "Panamá"], ["503", "El Salvador"], ["504", "Honduras"], ["591", "Bolivia"],
      ["595", "Paraguay"], ["598", "Uruguay"], ["58", "Venezuela"], ["1", "Estados Unidos"],
      ["34", "España"]
    ]
  },

  // Tu aviso de privacidad (puede ser la página privacidad.html de esta misma carpeta)
  privacidad_url: "privacidad.html",
  privacidad: {
    responsable: "Nombre completo o razón social del responsable",
    correo_contacto: "privacidad@tudominio.com",
    finalidad: "enviarte el contenido que pediste y contactarte por WhatsApp o correo para ofrecerte una llamada sobre nuestros servicios"
  },

  // Meta: el ID de tu pixel (conjunto de datos). Es público, no es un secreto.
  meta: {
    pixel_id: ""
  },

  // URL de la aplicación web de Google Apps Script (termina en /exec).
  // Vacío = la página funciona, pero no guarda nada. Úsalo así solo para probar el diseño.
  apps_script_url: "",

  // WhatsApp donde la persona te escribe para pedir el contenido
  whatsapp: {
    // Número con lada, solo dígitos. México: 52 + 10 dígitos.
    numero: "525500000000",
    // {nombre} y {correo} se reemplazan solos. Deja el correo: te sirve para ligar el chat con tu hoja.
    mensaje: "Hola, soy {nombre}. Me registré con el correo {correo} y quiero recibir el taller para llenar mi agenda.",
    // Cómo se muestra el número si la persona prefiere copiarlo
    numero_visible: "+52 55 0000 0000"
  },

  // Página de entrega (gracias.html)
  entrega: {
    titulo: "Listo, {nombre}. El taller te llega por WhatsApp.",
    texto: "Lo envío por WhatsApp para poder resolver tus dudas en la misma conversación.",
    pasos: [
      "Toca el botón de abajo.",
      "Envía el mensaje que ya va escrito.",
      "Te respondo con el enlace del taller."
    ],
    boton: "Pedir el taller por WhatsApp",
    respaldo: "¿No se abrió WhatsApp? Escríbeme a este número:"
  }
};
