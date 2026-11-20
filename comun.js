/*
  Funciones compartidas por la landing y la página de entrega.
  No necesitas editar este archivo.
*/
(function () {
  "use strict";

  var almacen = {
    leer: function (clave) {
      try { return JSON.parse(sessionStorage.getItem(clave)); } catch (e) { return null; }
    },
    guardar: function (clave, valor) {
      try { sessionStorage.setItem(clave, JSON.stringify(valor)); } catch (e) { /* modo privado */ }
    },
    borrar: function (clave) {
      try { sessionStorage.removeItem(clave); } catch (e) { /* modo privado */ }
    }
  };

  function cookie(nombre) {
    var m = document.cookie.match("(?:^|; )" + nombre + "=([^;]*)");
    return m ? decodeURIComponent(m[1]) : "";
  }

  // Envía datos a la hoja (Apps Script). Usa texto plano para evitar el bloqueo CORS.
  function enviar(datos, comoBaliza) {
    var url = window.FUNNEL && window.FUNNEL.apps_script_url;
    if (!url) return Promise.resolve(false);
    var cuerpo = JSON.stringify(datos);
    if (comoBaliza && navigator.sendBeacon) {
      try {
        return Promise.resolve(navigator.sendBeacon(url, new Blob([cuerpo], { type: "text/plain;charset=utf-8" })));
      } catch (e) { /* sigue con fetch */ }
    }
    var control = "AbortController" in window ? new AbortController() : null;
    var reloj = control ? setTimeout(function () { control.abort(); }, 9000) : null;
    return fetch(url, { method: "POST", body: cuerpo, signal: control ? control.signal : undefined })
      .then(function (r) { return r.ok; })
      .catch(function () { return false; })
      .then(function (ok) { if (reloj) clearTimeout(reloj); return ok; });
  }

  function escapar(t) {
    return String(t == null ? "" : t)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function rellenar(plantilla, valores) {
    return String(plantilla || "").replace(/\{(\w+)\}/g, function (_, k) {
      return valores && valores[k] ? valores[k] : "";
    });
  }

  window.Funnel = { almacen: almacen, cookie: cookie, enviar: enviar, escapar: escapar, rellenar: rellenar };
})();
