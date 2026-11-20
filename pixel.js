/*
  Pixel de Meta. Lee el ID de config.js.
  En la página de entrega agrega los datos de la persona (Meta los cifra solo)
  para que reconozca mejor quién se registró.
  No necesitas editar este archivo.
*/
(function () {
  "use strict";
  var id = window.FUNNEL && window.FUNNEL.meta && window.FUNNEL.meta.pixel_id;
  if (!id) return;

  /* Código base oficial de Meta */
  !function (f, b, e, v, n, t, s) {
    if (f.fbq) return; n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0";
    n.queue = []; t = b.createElement(e); t.async = !0;
    t.src = v; s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");

  var datos = {};
  var ctx = window.Funnel && window.Funnel.almacen.leer("funnel_ctx");
  if (ctx) {
    if (ctx.correo) datos.em = String(ctx.correo).trim().toLowerCase();
    if (ctx.whatsapp) datos.ph = String(ctx.whatsapp).replace(/\D/g, "");
    if (ctx.nombre) datos.fn = String(ctx.nombre).trim().split(/\s+/)[0].toLowerCase();
    if (ctx.sesion) datos.external_id = ctx.sesion;
  }
  window.fbq("init", id, datos);
  window.fbq("track", "PageView");
})();
