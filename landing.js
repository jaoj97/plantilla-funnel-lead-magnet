/*
  Cuestionario de la landing: una pregunta por pantalla, guardado parcial
  y registro final. Todo el contenido sale de config.js.
  No necesitas editar este archivo.
*/
(function () {
  "use strict";
  var C = window.FUNNEL;
  var F = window.Funnel;
  var preguntas = C.preguntas || [];
  var totalPasos = preguntas.length + 1; // + datos de contacto
  var reducido = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function nuevaSesion() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);
  }

  var estado = F.almacen.leer("funnel_estado");
  if (!estado || !estado.sesion) {
    var p = new URLSearchParams(location.search);
    var origen = { t: Date.now() };
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"].forEach(function (k) {
      if (p.get(k)) origen[k] = p.get(k).slice(0, 200);
    });
    estado = { sesion: nuevaSesion(), paso: 0, respuestas: {}, contacto: {}, origen: origen, url: location.href };
  }
  function guardarLocal() { F.almacen.guardar("funnel_estado", estado); }
  guardarLocal();

  function fbc() {
    var c = F.cookie("_fbc");
    if (c) return c;
    return estado.origen.fbclid ? "fb.1." + estado.origen.t + "." + estado.origen.fbclid : "";
  }

  function nombrePaso() {
    return estado.paso < preguntas.length ? "pregunta_" + (estado.paso + 1) : "contacto";
  }

  function paquete(tipo, extra) {
    var d = {
      tipo: tipo,
      sesion: estado.sesion,
      lead_magnet: C.lead_magnet,
      paso: nombrePaso(),
      respuestas: estado.respuestas,
      contacto: estado.contacto,
      origen: estado.origen,
      fbp: F.cookie("_fbp"),
      fbc: fbc(),
      dispositivo: navigator.userAgent,
      url: estado.url
    };
    if (extra) Object.keys(extra).forEach(function (k) { d[k] = extra[k]; });
    return d;
  }

  /* ---------- Pantallas ---------- */
  var caja = document.getElementById("cuestionario-cuerpo");
  var riel = document.getElementById("riel");
  var rielTexto = document.getElementById("riel-texto");

  function pintarRiel() {
    var actual = Math.min(estado.paso, totalPasos - 1);
    var html = "";
    for (var i = 0; i < totalPasos; i++) {
      html += '<span class="riel-tramo' + (i < actual ? " hecho" : i === actual ? " actual" : "") + '"></span>';
    }
    riel.innerHTML = html;
    rielTexto.textContent = estado.paso < preguntas.length
      ? "Pregunta " + (estado.paso + 1) + " de " + preguntas.length
      : "Último paso: ¿a dónde te lo envío?";
  }

  function cambiar(html, enfocar) {
    var primera = !caja.innerHTML;
    var pintar = function () {
      caja.innerHTML = html;
      caja.classList.remove("saliendo");
      if (!primera && !reducido) {
        caja.classList.add("entrando");
        requestAnimationFrame(function () { requestAnimationFrame(function () { caja.classList.remove("entrando"); }); });
      }
      pintarRiel();
      if (enfocar) {
        var t = caja.querySelector("[data-enfoque]");
        if (t) t.focus({ preventScroll: true });
      }
      conectar();
    };
    if (reducido || !caja.innerHTML) { pintar(); return; }
    caja.classList.add("saliendo");
    setTimeout(pintar, 140);
  }

  function pantallaPregunta(i, enfocar) {
    var q = preguntas[i];
    var elegida = estado.respuestas[q.id] && estado.respuestas[q.id].valor;
    var html = '<fieldset class="pregunta"><legend class="pregunta-texto" tabindex="-1" data-enfoque>' + F.escapar(q.texto) + "</legend>";
    html += '<div class="opciones">';
    q.opciones.forEach(function (o, n) {
      html += '<button type="button" class="opcion' + (elegida === o.valor ? " elegida" : "") + '" data-n="' + n + '" aria-pressed="' + (elegida === o.valor) + '">' +
        '<span class="opcion-texto">' + F.escapar(o.texto) + "</span></button>";
    });
    html += "</div></fieldset>";
    if (i > 0) html += '<button type="button" class="volver" data-volver>Volver a la pregunta anterior</button>';
    cambiar(html, enfocar);
  }

  function opcionesLada() {
    return (C.contacto.ladas || []).map(function (l) {
      return '<option value="' + F.escapar(l[0]) + '"' + (l[0] === (estado.contacto.lada || C.contacto.lada_por_defecto) ? " selected" : "") + ">" +
        F.escapar(l[1]) + " +" + F.escapar(l[0]) + "</option>";
    }).join("");
  }

  function pantallaContacto(enfocar) {
    var c = estado.contacto;
    var html = '<form class="contacto" novalidate>' +
      '<p class="pregunta-texto" tabindex="-1" data-enfoque>¿A dónde te lo envío?</p>' +
      campo("nombre", "Tu nombre", "text", c.nombre, 'autocomplete="given-name"') +
      '<div class="campo"><label for="tel">WhatsApp</label><div class="tel">' +
      '<select id="lada" name="lada" aria-label="Lada del país">' + opcionesLada() + "</select>" +
      '<input id="tel" name="tel" type="tel" inputmode="tel" autocomplete="tel-national" value="' + F.escapar(c.tel || "") + '" aria-describedby="error-tel"></div>' +
      '<p class="error" id="error-tel" hidden></p></div>' +
      (C.contacto.pedir_correo ? campo("correo", "Correo", "email", c.correo, 'autocomplete="email" inputmode="email"') : "") +
      '<label class="acepto"><input type="checkbox" id="acepto"' + (c.acepto ? " checked" : "") + ' aria-describedby="error-acepto"> ' +
      '<span>Acepto el <a href="' + F.escapar(C.privacidad_url) + '" target="_blank" rel="noopener">aviso de privacidad</a>.</span></label>' +
      '<p class="error" id="error-acepto" hidden></p>' +
      '<button type="submit" class="boton-principal"><span class="boton-texto">' + F.escapar(C.textos.boton_final) + "</span></button>" +
      '<p class="error error-envio" id="error-envio" role="alert" hidden></p>' +
      "</form>" +
      '<button type="button" class="volver" data-volver>Volver a la pregunta anterior</button>';
    cambiar(html, enfocar);
  }

  function campo(id, etiqueta, tipo, valor, extra) {
    return '<div class="campo"><label for="' + id + '">' + etiqueta + "</label>" +
      '<input id="' + id + '" name="' + id + '" type="' + tipo + '" value="' + F.escapar(valor || "") + '" ' + (extra || "") +
      ' aria-describedby="error-' + id + '"><p class="error" id="error-' + id + '" hidden></p></div>';
  }

  function mostrar(enfocar) {
    if (estado.paso < preguntas.length) pantallaPregunta(estado.paso, enfocar);
    else pantallaContacto(enfocar);
  }

  /* ---------- Interacción ---------- */
  var pendiente = null;
  var sucio = false;

  function guardarParcialPronto() {
    sucio = true;
    clearTimeout(pendiente);
    pendiente = setTimeout(function () { sucio = false; F.enviar(paquete("parcial")); }, 1200);
  }

  function leerContacto() {
    var g = function (id) { var el = document.getElementById(id); return el ? el.value.trim() : ""; };
    var ok = document.getElementById("acepto");
    estado.contacto = {
      nombre: g("nombre"),
      lada: g("lada"),
      tel: g("tel"),
      correo: g("correo").toLowerCase(),
      acepto: !!(ok && ok.checked)
    };
    estado.contacto.whatsapp = telefonoCompleto();
    guardarLocal();
  }

  function telefonoCompleto() {
    var lada = String(estado.contacto.lada || "").replace(/\D/g, "");
    var num = String(estado.contacto.tel || "").replace(/\D/g, "");
    if (!num) return "";
    if (lada && num.indexOf(lada) === 0 && num.length > lada.length + 8) return num;
    return lada + num;
  }

  function error(id, texto) {
    var el = document.getElementById("error-" + id);
    var input = document.getElementById(id);
    if (!el) return;
    el.textContent = texto || "";
    el.hidden = !texto;
    if (input) input.setAttribute("aria-invalid", texto ? "true" : "false");
  }

  function validar() {
    var c = estado.contacto;
    var primero = null;
    var marcar = function (id, texto) { error(id, texto); if (texto && !primero) primero = id; };
    marcar("nombre", c.nombre.length < 2 ? "Escribe tu nombre." : "");
    marcar("tel", String(c.tel).replace(/\D/g, "").length < 7 ? "Escribe tu número de WhatsApp, sin la lada." : "");
    if (C.contacto.pedir_correo) {
      marcar("correo", !c.correo ? "Escribe tu correo." :
        /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c.correo) ? "" : "Revisa tu correo: falta algo o tiene un espacio.");
    }
    marcar("acepto", c.acepto ? "" : "Para enviarte el contenido necesito que aceptes el aviso de privacidad.");
    if (primero) { var el = document.getElementById(primero); if (el) el.focus(); }
    return !primero;
  }

  function califica() {
    return preguntas.every(function (q) {
      var r = estado.respuestas[q.id];
      if (!r) return false;
      var o = q.opciones.filter(function (x) { return x.valor === r.valor; })[0];
      return o && !o.descalifica;
    });
  }

  function registrar(form) {
    leerContacto();
    if (!validar()) return;
    var boton = form.querySelector(".boton-principal");
    var aviso = document.getElementById("error-envio");
    boton.disabled = true;
    boton.classList.add("enviando");
    boton.querySelector(".boton-texto").textContent = "Enviando…";
    aviso.hidden = true;
    clearTimeout(pendiente);
    sucio = false; // el registro ya lleva todo; no hace falta otro guardado parcial al salir

    var esCalificado = califica();
    var idEvento = "lead-" + estado.sesion;
    var datos = paquete("registro", { califica: esCalificado, event_id: idEvento });

    // El registro sale como baliza: el navegador lo entrega aunque la página cambie,
    // así la persona no espera a que la hoja termine de avisar a Meta y enviar el correo.
    var salida = F.enviar(datos, true).then(function (enCola) {
      if (enCola) return new Promise(function (r) { setTimeout(function () { r(true); }, 500); });
      return F.enviar(datos); // sin baliza: envío normal (el parcial ya quedó guardado)
    });
    salida.then(function () {
      F.almacen.guardar("funnel_ctx", {
        sesion: estado.sesion,
        nombre: estado.contacto.nombre,
        correo: estado.contacto.correo,
        whatsapp: estado.contacto.whatsapp,
        califica: esCalificado,
        event_id: idEvento,
        lead_enviado: false
      });
      F.almacen.borrar("funnel_estado");
      location.href = "gracias.html";
    });
  }

  function conectar() {
    caja.querySelectorAll(".opcion").forEach(function (b) {
      b.addEventListener("click", function () {
        var q = preguntas[estado.paso];
        var o = q.opciones[Number(b.getAttribute("data-n"))];
        estado.respuestas[q.id] = { pregunta: q.texto, texto: o.texto, valor: o.valor };
        caja.querySelectorAll(".opcion").forEach(function (x) {
          x.classList.remove("elegida");
          x.setAttribute("aria-pressed", "false");
        });
        b.classList.add("elegida");
        b.setAttribute("aria-pressed", "true");
        estado.paso += 1;
        guardarLocal();
        F.enviar(paquete("parcial"));
        setTimeout(function () { mostrar(true); }, reducido ? 0 : 320);
      });
    });

    var volver = caja.querySelector("[data-volver]");
    if (volver) volver.addEventListener("click", function () {
      if (estado.paso >= preguntas.length) leerContacto();
      estado.paso = Math.max(0, estado.paso - 1);
      guardarLocal();
      mostrar(true);
    });

    var form = caja.querySelector("form.contacto");
    if (form) {
      form.addEventListener("input", function (e) {
        leerContacto();
        if (e.target && e.target.id) error(e.target.id, "");
        guardarParcialPronto();
      });
      form.addEventListener("change", function () { leerContacto(); guardarParcialPronto(); });
      form.addEventListener("submit", function (e) { e.preventDefault(); registrar(form); });
    }
  }

  // Lo pendiente se envía si la persona cierra o cambia de pestaña
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden" && sucio) {
      sucio = false;
      clearTimeout(pendiente);
      F.enviar(paquete("parcial"), true);
    }
  });

  /* ---------- Textos de la página ---------- */
  function texto(id, valor) { var el = document.getElementById(id); if (el) el.textContent = valor || ""; }
  texto("marca-nombre", C.marca.nombre);
  texto("antetitulo", C.textos.antetitulo);
  texto("titulo", C.textos.titulo);
  texto("bajada", C.textos.bajada);
  texto("incluye-titulo", C.textos.incluye_titulo);
  texto("aviso-parcial", C.textos.aviso_parcial);
  document.title = C.textos.titulo;
  var lista = document.getElementById("incluye");
  if (lista) lista.innerHTML = (C.textos.incluye || []).map(function (t) { return "<li>" + F.escapar(t) + "</li>"; }).join("");
  if (C.marca.logo) {
    var logo = document.getElementById("marca-logo");
    logo.src = C.marca.logo; logo.alt = C.marca.nombre; logo.hidden = false;
  }
  if (C.textos.video_embed) {
    var v = document.getElementById("video");
    v.innerHTML = '<iframe src="' + F.escapar(C.textos.video_embed) + '" title="Video" loading="lazy" allow="encrypted-media; picture-in-picture" allowfullscreen></iframe>';
    v.hidden = false;
  }

  mostrar(false);
})();
