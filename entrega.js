/*
  Página de entrega: dispara el Lead (solo si califica) con el mismo ID que
  usa la hoja para avisarle a Meta, y arma el botón de WhatsApp.
  No necesitas editar este archivo.
*/
(function () {
  "use strict";
  var C = window.FUNNEL;
  var F = window.Funnel;
  var ctx = F.almacen.leer("funnel_ctx") || {};
  var valores = { nombre: (ctx.nombre || "").split(/\s+/)[0], correo: ctx.correo || "" };

  // Evento Lead: solo para calificados y una sola vez por registro
  if (ctx.califica === true && !ctx.lead_enviado && typeof window.fbq === "function") {
    window.fbq("track", "Lead", { content_name: C.lead_magnet }, { eventID: ctx.event_id });
    ctx.lead_enviado = true;
    F.almacen.guardar("funnel_ctx", ctx);
  }

  var titulo = F.rellenar(C.entrega.titulo, valores);
  if (!valores.nombre) titulo = titulo.replace(/,\s*\./, ".").replace(/,\s+(?=[A-ZÁÉÍÓÚÑ])/, ". ");
  document.getElementById("entrega-titulo").textContent = titulo;
  document.getElementById("entrega-texto").textContent = C.entrega.texto;
  document.getElementById("marca-nombre").textContent = C.marca.nombre;
  document.title = C.entrega.boton;

  document.getElementById("pasos").innerHTML = (C.entrega.pasos || []).map(function (p) {
    return "<li>" + F.escapar(p) + "</li>";
  }).join("");

  var mensaje = F.rellenar(C.whatsapp.mensaje, valores);
  if (!valores.correo) mensaje = mensaje.replace(/\s*Me registré con el correo\s*y/i, " Me registré y");
  var enlace = "https://wa.me/" + String(C.whatsapp.numero).replace(/\D/g, "") + "?text=" + encodeURIComponent(mensaje);

  var boton = document.getElementById("boton-whatsapp");
  boton.href = enlace;
  boton.querySelector(".boton-texto").textContent = C.entrega.boton;
  boton.addEventListener("click", function () {
    if (typeof window.fbq === "function") window.fbq("track", "Contact");
    if (ctx.sesion) F.enviar({ tipo: "clic_whatsapp", sesion: ctx.sesion, lead_magnet: C.lead_magnet }, true);
  });

  document.getElementById("respaldo-texto").textContent = C.entrega.respaldo;
  var numero = document.getElementById("numero-visible");
  numero.textContent = C.whatsapp.numero_visible;
  var copiar = document.getElementById("copiar");
  copiar.addEventListener("click", function () {
    var limpio = "+" + String(C.whatsapp.numero).replace(/\D/g, "");
    var listo = function () {
      copiar.textContent = "Número copiado";
      setTimeout(function () { copiar.textContent = "Copiar número"; }, 2200);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(limpio).then(listo, function () { copiar.textContent = "Mantén presionado el número para copiarlo"; });
    } else {
      copiar.textContent = "Mantén presionado el número para copiarlo";
    }
  });
})();
