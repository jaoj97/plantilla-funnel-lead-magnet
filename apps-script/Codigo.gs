/**
 * FUNNEL DE LEAD MAGNET · Apps Script de la hoja de registros
 *
 * Qué hace:
 *  1. Recibe lo que la persona responde en tu landing (aunque no termine) y lo guarda
 *     en la pestaña «Registros», una fila por persona.
 *  2. Cuando alguien completa el registro y CALIFICA, le avisa a Meta con el evento
 *     Lead por la API de conversiones (el mismo ID que usa el pixel, así no se duplica).
 *  3. Te da un menú «Funnel» en la hoja para avisarle a Meta cuando alguien agenda o compra.
 *  4. Todos los días a las 9 am revisa que sigan entrando registros y te escribe si algo falla.
 *  5. Si lo activas en la pestaña «Correo de entrega», envía el regalo por correo como respaldo de WhatsApp.
 *
 * Dónde van tus datos privados (NUNCA en este código):
 *   Configuración del proyecto (engrane) > Propiedades del script:
 *     PIXEL_ID         ID de tu conjunto de datos de Meta (obligatorio para Meta)
 *     META_TOKEN       token de la API de conversiones (obligatorio para Meta)
 *     TEST_EVENT_CODE  solo mientras pruebas (lo copias de «Eventos de prueba»); bórralo al terminar
 *     CORREO_ALERTAS   a dónde llegan las alertas (si no lo pones, llegan a tu cuenta de Google)
 *     MONEDA           moneda de tus ventas, por ejemplo USD o MXN (por defecto USD)
 *
 * Primera vez: elige la función «instalar» arriba y presiona Ejecutar. Acepta los permisos.
 */

const VERSION_GRAPH = 'v25.0';
const HOJA = 'Registros';
const HOJA_TABLERO = 'Tablero';
const HOJA_CORREO = 'Correo de entrega';
const ESTADOS = ['Nuevo', 'Escribió', 'Propuesta enviada', 'Agendó', 'Asistió', 'Compró', 'No avanzó'];
const COLUMNAS = [
  'creado', 'nombre', 'whatsapp', 'correo', 'califica', 'respuestas', 'estado', 'notas', 'monto_venta',
  'registro', 'paso', 'clic_whatsapp', 'lead_magnet',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid',
  'meta_lead', 'meta_agendo', 'meta_compra', 'correo_entrega',
  'fbp', 'fbc', 'dispositivo', 'url', 'actualizado', 'sesion'
];
const FORMATO_FECHA = 'd/m/yyyy h:mm am/pm';

/* ============ Primera vez: ejecuta esta función ============ */

function instalar() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = prepararHoja();
  const cab = encabezados(hoja);
  const filas = Math.max(hoja.getMaxRows() - 1, 1);

  hoja.setFrozenRows(1);
  hoja.setFrozenColumns(2);
  hoja.getRange(1, 1, 1, cab.length).setFontWeight('bold');
  const reglaEstado = SpreadsheetApp.newDataValidation().requireValueInList(ESTADOS, true).setAllowInvalid(false).build();
  hoja.getRange(2, cab.indexOf('estado') + 1, filas, 1).setDataValidation(reglaEstado);
  ['creado', 'actualizado', 'clic_whatsapp'].forEach(function (k) {
    hoja.getRange(2, cab.indexOf(k) + 1, filas, 1).setNumberFormat(FORMATO_FECHA);
  });

  crearTablero(libro);
  crearHojaCorreo(libro);

  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'revisarSalud') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('revisarSalud').timeBased().everyDays(1).atHour(9).create();

  libro.toast('La hoja está preparada y la revisión diaria quedó programada a las 9 am.', 'Funnel instalado', 10);
  Logger.log('Listo: hoja preparada y revisión diaria programada a las 9 am.');
}

/* ============ Recepción de datos desde la landing ============ */

function doGet() {
  return ContentService.createTextOutput('El funnel está activo. Esta dirección solo recibe datos de tu landing.');
}

function doPost(e) {
  let datos;
  try {
    datos = JSON.parse(e.postData.contents);
  } catch (err) {
    return responder({ ok: false, error: 'formato' });
  }
  if (!datos || typeof datos.sesion !== 'string' || !/^[\w-]{8,64}$/.test(datos.sesion)) {
    return responder({ ok: false, error: 'sesion' });
  }
  if (['parcial', 'registro', 'clic_whatsapp'].indexOf(datos.tipo) < 0) {
    return responder({ ok: false, error: 'tipo' });
  }

  const candado = LockService.getScriptLock();
  candado.waitLock(20000);
  let hoja, fila;
  try {
    hoja = prepararHoja();
    fila = guardarFila(hoja, datos.sesion, aplanar(datos), datos.tipo === 'clic_whatsapp');
    if (fila && datos.tipo === 'registro') enviarCorreoEntregaSiFalta(hoja, fila);
  } finally {
    candado.releaseLock();
  }

  if (fila && datos.tipo === 'registro' && datos.califica === true) {
    enviarLeadSiFalta(hoja, fila, datos);
  }
  return responder({ ok: true });
}

function responder(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto)).setMimeType(ContentService.MimeType.JSON);
}

/** Convierte lo que manda la landing en columnas de la hoja. */
function aplanar(d) {
  const v = {};
  const ahora = new Date();
  const c = d.contacto || {};
  const o = d.origen || {};
  v.actualizado = ahora;
  v.sesion = d.sesion;
  v.lead_magnet = limpio(d.lead_magnet);
  if (d.tipo === 'clic_whatsapp') {
    v.clic_whatsapp = ahora;
    return v;
  }
  v.paso = limpio(d.paso);
  v.nombre = limpio(c.nombre);
  v.whatsapp = c.whatsapp ? limpio('+' + String(c.whatsapp).replace(/\D/g, '')) : '';
  v.correo = limpio(c.correo).toLowerCase();
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'].forEach(function (k) {
    v[k] = limpio(o[k]);
  });
  v.fbp = limpio(d.fbp);
  v.fbc = limpio(d.fbc);
  v.dispositivo = limpio(d.dispositivo).slice(0, 300);
  v.url = limpio(d.url).slice(0, 500);

  const r = d.respuestas || {};
  const partes = [];
  Object.keys(r).forEach(function (id) {
    if (!/^[\w-]{1,40}$/.test(id) || !r[id]) return;
    v['r_' + id] = limpio(r[id].texto);
    partes.push(limpio(r[id].pregunta) + ' ' + limpio(r[id].texto));
  });
  v.respuestas = partes.join(' | ');

  if (d.tipo === 'registro') {
    v.registro = 'completo';
    v.califica = d.califica === true ? 'sí' : 'no';
  } else {
    v.registro = 'parcial';
  }
  return v;
}

/** Texto seguro para la hoja: recorta y evita que se interprete como fórmula. */
function limpio(x) {
  if (x === null || x === undefined) return '';
  let t = String(x).trim().slice(0, 1000);
  if (/^[=+\-@]/.test(t)) t = "'" + t;
  return t;
}

/**
 * Busca la fila de la sesión y la actualiza; si no existe, la crea.
 * Reglas: lo vacío nunca borra lo que ya había; un registro completo nunca vuelve a parcial;
 * la fecha de creación, el estado y el clic a WhatsApp no se sobrescriben.
 */
function guardarFila(hoja, sesion, valores, soloSiExiste) {
  let cab = encabezados(hoja);
  const faltan = Object.keys(valores).filter(function (k) { return cab.indexOf(k) < 0; });
  if (faltan.length) {
    hoja.getRange(1, cab.length + 1, 1, faltan.length).setValues([faltan]).setFontWeight('bold');
    cab = cab.concat(faltan);
  }
  const ultima = hoja.getLastRow();
  let fila = 0;
  if (ultima > 1) {
    const encontrada = hoja.getRange(2, cab.indexOf('sesion') + 1, ultima - 1, 1)
      .createTextFinder(sesion).matchEntireCell(true).findNext();
    if (encontrada) fila = encontrada.getRow();
  }
  const nueva = !fila;
  if (nueva && soloSiExiste) return 0;
  if (nueva) {
    fila = ultima + 1;
    if (fila > hoja.getMaxRows()) hoja.insertRowsAfter(hoja.getMaxRows(), 500);
    valores.creado = valores.actualizado;
    valores.estado = 'Nuevo';
  }
  const rango = hoja.getRange(fila, 1, 1, cab.length);
  const actual = nueva ? cab.map(function () { return ''; }) : rango.getValues()[0];
  // Solo se escriben las celdas que cambian: así nunca se pisa lo que otra petición
  // (o una persona en la hoja) escribió en las demás columnas de esta fila.
  const protegidas = ['creado', 'estado', 'clic_whatsapp'];
  const salida = cab.map(function (k, i) {
    if (!(k in valores)) return actual[i];
    const nuevo = valores[k];
    if (nuevo === '' || nuevo === null || nuevo === undefined) return actual[i];
    if (k === 'registro' && actual[i] === 'completo') return actual[i];
    if (protegidas.indexOf(k) >= 0 && actual[i] !== '') return actual[i];
    return nuevo;
  });
  if (nueva) {
    rango.setValues([salida]);
  } else {
    salida.forEach(function (v, i) {
      if (v !== actual[i] && !(v instanceof Date && actual[i] instanceof Date && v.getTime() === actual[i].getTime())) {
        hoja.getRange(fila, i + 1).setValue(v);
      }
    });
  }
  return fila;
}

/* ============ Meta: API de conversiones ============ */

function enviarLeadSiFalta(hoja, fila, datos) {
  const cab = encabezados(hoja);
  const celda = hoja.getRange(fila, cab.indexOf('meta_lead') + 1);
  if (String(celda.getValue()).indexOf('ok') === 0) return;
  const f = leerFila(hoja, fila);
  const id = /^[\w-]{8,80}$/.test(datos.event_id || '') ? datos.event_id : 'lead-' + f.sesion;
  celda.setValue(enviarEvento('Lead', f, id, { content_name: f.lead_magnet }, 'website'));
}

/**
 * Envía un evento a Meta. Los datos personales viajan cifrados (SHA-256), como pide Meta.
 * Devuelve «ok …» o «error …» para dejarlo escrito en la hoja.
 */
function enviarEvento(nombre, f, idEvento, datosExtra, fuente) {
  const props = PropertiesService.getScriptProperties();
  const pixel = props.getProperty('PIXEL_ID');
  const token = props.getProperty('META_TOKEN');
  if (!pixel || !token) return 'sin configurar: faltan PIXEL_ID o META_TOKEN';

  const usuario = {};
  if (f.correo) usuario.em = [cifrar(String(f.correo).trim().toLowerCase())];
  if (f.whatsapp) usuario.ph = [cifrar(String(f.whatsapp).replace(/\D/g, ''))];
  if (f.nombre) {
    const partes = String(f.nombre).trim().toLowerCase().split(/\s+/);
    usuario.fn = [cifrar(partes[0])];
    if (partes.length > 1) usuario.ln = [cifrar(partes[partes.length - 1])];
  }
  if (f.sesion) usuario.external_id = [cifrar(f.sesion)];
  if (f.fbp) usuario.fbp = String(f.fbp);
  if (f.fbc) usuario.fbc = String(f.fbc);
  if (f.dispositivo) usuario.client_user_agent = String(f.dispositivo);

  const evento = {
    event_name: nombre,
    event_time: Math.floor(Date.now() / 1000),
    event_id: idEvento,
    action_source: fuente,
    user_data: usuario,
    custom_data: datosExtra || {}
  };
  if (fuente === 'website' && f.url) evento.event_source_url = String(f.url);

  const cuerpo = { data: [evento] };
  const prueba = props.getProperty('TEST_EVENT_CODE');
  if (prueba) cuerpo.test_event_code = prueba;

  try {
    const r = UrlFetchApp.fetch(
      'https://graph.facebook.com/' + VERSION_GRAPH + '/' + encodeURIComponent(pixel) + '/events?access_token=' + encodeURIComponent(token),
      { method: 'post', contentType: 'application/json', payload: JSON.stringify(cuerpo), muteHttpExceptions: true }
    );
    if (r.getResponseCode() === 200) return 'ok ' + fechaCorta() + (prueba ? ' (prueba)' : '');
    return 'error ' + r.getResponseCode() + ': ' + r.getContentText().slice(0, 200);
  } catch (err) {
    return 'error: ' + String(err).slice(0, 200);
  }
}

function cifrar(texto) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(texto), Utilities.Charset.UTF_8);
  return bytes.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}

/* ============ Correo de entrega (respaldo de WhatsApp) ============ */

function crearHojaCorreo(libro) {
  if (libro.getSheetByName(HOJA_CORREO)) return;
  const h = libro.insertSheet(HOJA_CORREO, 2);
  h.getRange(1, 1, 6, 2).setValues([
    ['Campo', 'Valor'],
    ['Enviar correo de entrega (sí / no)', 'no'],
    ['Nombre del remitente', 'Tu nombre'],
    ['Asunto', 'Aquí está lo que pediste'],
    ['Enlace del regalo', 'https://'],
    ['Texto del correo (usa {nombre} y {enlace})', 'Hola {nombre},\n\nAquí tienes el enlace:\n{enlace}\n\nSi te surge una duda mientras lo ves, respóndeme este correo o escríbeme por WhatsApp.\n\nUn saludo']
  ]);
  h.getRange(1, 1, 1, 2).setFontWeight('bold');
  h.getRange(2, 2).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['sí', 'no'], true).build());
  h.setColumnWidth(1, 300);
  h.setColumnWidth(2, 520);
  h.getRange(2, 2, 5, 1).setWrap(true).setVerticalAlignment('top');
  h.getRange(8, 1).setValue('Se envía desde tu cuenta de Google, en texto plano, a quien completa el registro. Gmail gratuito permite unos 100 correos al día.');
}

function enviarCorreoEntregaSiFalta(hoja, fila) {
  const conf = hoja.getParent().getSheetByName(HOJA_CORREO);
  if (!conf) return;
  const v = conf.getRange(2, 2, 5, 1).getValues().map(function (r) { return String(r[0]); });
  if (['sí', 'si'].indexOf(v[0].trim().toLowerCase()) < 0) return;
  let cab = encabezados(hoja);
  if (cab.indexOf('correo_entrega') < 0) {
    hoja.getRange(1, cab.length + 1).setValue('correo_entrega').setFontWeight('bold');
    cab = encabezados(hoja);
  }
  const f = leerFila(hoja, fila);
  if (!f.correo || String(f.correo_entrega) !== '') return;
  const nombre = String(f.nombre || '').trim().split(/\s+/)[0];
  const cuerpo = v[4].replace(/\{nombre\}/g, nombre).replace(/\{enlace\}/g, v[3]);
  let resultado;
  try {
    MailApp.sendEmail({ to: String(f.correo), subject: v[2], body: cuerpo, name: v[1] });
    resultado = 'enviado ' + fechaCorta();
  } catch (err) {
    resultado = 'error: ' + String(err).slice(0, 150);
  }
  hoja.getRange(fila, cab.indexOf('correo_entrega') + 1).setValue(resultado);
}

/* ============ Menú de la hoja ============ */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Funnel')
    .addItem('Instalar o reparar la hoja', 'instalar')
    .addItem('Probar la conexión con Meta', 'probarMeta')
    .addSeparator()
    .addItem('Avisar a Meta: la fila seleccionada agendó', 'avisarAgendo')
    .addItem('Avisar a Meta: la fila seleccionada compró', 'avisarCompra')
    .addSeparator()
    .addItem('Revisar la salud del funnel ahora', 'revisarSalud')
    .addToUi();
}

function avisarAgendo() {
  avisarDesdeFila('Schedule', 'meta_agendo', 'agendo-', 'Agendó');
}

function avisarCompra() {
  avisarDesdeFila('Purchase', 'meta_compra', 'compra-', 'Compró');
}

function avisarDesdeFila(evento, columna, prefijo, nuevoEstado) {
  const ui = SpreadsheetApp.getUi();
  const hoja = SpreadsheetApp.getActiveSheet();
  if (hoja.getName() !== HOJA) { ui.alert('Ve a la pestaña «' + HOJA + '» y selecciona la fila de la persona.'); return; }
  const fila = hoja.getActiveRange().getRow();
  if (fila < 2) { ui.alert('Selecciona una celda en la fila de la persona (no en los títulos).'); return; }
  const f = leerFila(hoja, fila);
  if (String(f[columna]).indexOf('ok') === 0) { ui.alert('Esta persona ya se le avisó a Meta: ' + f[columna]); return; }

  let extra = { content_name: f.lead_magnet };
  if (evento === 'Purchase') {
    const monto = Number(String(f.monto_venta).replace(/[^\d.]/g, ''));
    if (!monto) { ui.alert('Escribe el monto de la venta en la columna monto_venta (solo el número) y vuelve a intentar.'); return; }
    extra.value = monto;
    extra.currency = PropertiesService.getScriptProperties().getProperty('MONEDA') || 'USD';
  }
  const resultado = enviarEvento(evento, f, prefijo + f.sesion, extra, 'system_generated');
  const cab = encabezados(hoja);
  hoja.getRange(fila, cab.indexOf(columna) + 1).setValue(resultado);
  const posActual = ESTADOS.indexOf(String(f.estado));
  if (posActual < ESTADOS.indexOf(nuevoEstado)) hoja.getRange(fila, cab.indexOf('estado') + 1).setValue(nuevoEstado);
  ui.alert(resultado.indexOf('ok') === 0 ? 'Listo: Meta recibió el aviso.' : 'Meta no recibió el aviso. Detalle: ' + resultado);
}

function probarMeta() {
  const ui = SpreadsheetApp.getUi();
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('TEST_EVENT_CODE')) {
    ui.alert('Para probar sin ensuciar tus datos, agrega la propiedad TEST_EVENT_CODE con el código que te da Meta en Administrador de eventos > Eventos de prueba.');
    return;
  }
  const res = enviarEvento('PruebaConexion', { sesion: 'prueba-' + Date.now(), dispositivo: 'Apps Script', url: '' }, 'prueba-' + Date.now(), {}, 'system_generated');
  ui.alert(res.indexOf('ok') === 0
    ? 'Conexión correcta. En Eventos de prueba debe aparecer «PruebaConexion» en menos de un minuto.'
    : 'No se pudo conectar. Detalle: ' + res);
}

/* ============ Instalación, tablero y alertas ============ */

function prepararHoja() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = libro.getSheetByName(HOJA);
  if (!hoja) {
    hoja = libro.insertSheet(HOJA, 0);
    hoja.getRange(1, 1, 1, COLUMNAS.length).setValues([COLUMNAS]).setFontWeight('bold');
    hoja.setFrozenRows(1);
    const sobrante = libro.getSheetByName('Hoja 1') || libro.getSheetByName('Sheet1');
    if (sobrante && sobrante.getLastRow() === 0 && libro.getSheets().length > 1) libro.deleteSheet(sobrante);
  } else if (hoja.getLastColumn() === 0) {
    hoja.getRange(1, 1, 1, COLUMNAS.length).setValues([COLUMNAS]).setFontWeight('bold');
  }
  return hoja;
}

function crearTablero(libro) {
  let t = libro.getSheetByName(HOJA_TABLERO);
  if (!t) t = libro.insertSheet(HOJA_TABLERO, 1);
  t.clear();
  const col = function (nombre) {
    return 'INDEX(' + HOJA + '!$A:$ZZ,0,MATCH("' + nombre + '",' + HOJA + '!$1:$1,0))';
  };
  const desde = ['TODAY()-6', 'TODAY()-29', 'DATE(2000,1,1)'];
  const lista = function (estados) { return '{"' + estados.join('","') + '"}'; };
  const filas = [
    ['Empezaron el cuestionario', function (d) { return '=COUNTIFS(' + col('creado') + ',">="&' + d + ')'; }],
    ['Completaron el registro', function (d) { return '=COUNTIFS(' + col('registro') + ',"completo",' + col('creado') + ',">="&' + d + ')'; }],
    ['Calificados', function (d) { return '=COUNTIFS(' + col('califica') + ',"sí",' + col('creado') + ',">="&' + d + ')'; }],
    ['% calificados', function () { return '=IFERROR([COL]4/[COL]3,"")'; }],
    ['Tocaron el botón de WhatsApp', function (d) { return '=COUNTIFS(' + col('clic_whatsapp') + ',">0",' + col('creado') + ',">="&' + d + ')'; }],
    ['Escribieron', function (d) { return '=SUMPRODUCT(COUNTIFS(' + col('estado') + ',' + lista(ESTADOS.slice(1, 6)) + ',' + col('creado') + ',">="&' + d + '))'; }],
    ['Recibieron propuesta de llamada', function (d) { return '=SUMPRODUCT(COUNTIFS(' + col('estado') + ',' + lista(ESTADOS.slice(2, 6)) + ',' + col('creado') + ',">="&' + d + '))'; }],
    ['Agendaron', function (d) { return '=SUMPRODUCT(COUNTIFS(' + col('estado') + ',' + lista(ESTADOS.slice(3, 6)) + ',' + col('creado') + ',">="&' + d + '))'; }],
    ['Asistieron', function (d) { return '=SUMPRODUCT(COUNTIFS(' + col('estado') + ',' + lista(ESTADOS.slice(4, 6)) + ',' + col('creado') + ',">="&' + d + '))'; }],
    ['Compraron', function (d) { return '=COUNTIFS(' + col('estado') + ',"Compró",' + col('creado') + ',">="&' + d + ')'; }],
    ['Monto vendido', function (d) { return '=SUMIFS(' + col('monto_venta') + ',' + col('creado') + ',">="&' + d + ')'; }]
  ];
  t.getRange(1, 1, 1, 4).setValues([['Métrica (por fecha en que la persona llegó)', 'Últimos 7 días', 'Últimos 30 días', 'Desde el inicio']]).setFontWeight('bold');
  filas.forEach(function (m, i) {
    const r = i + 2;
    t.getRange(r, 1).setValue(m[0]);
    ['B', 'C', 'D'].forEach(function (letra, j) {
      t.getRange(r, j + 2).setFormula(m[1](desde[j]).replace(/\[COL\]/g, letra));
    });
  });
  t.getRange(5, 2, 1, 3).setNumberFormat('0%');
  t.setColumnWidth(1, 320);
  t.setColumnWidths(2, 3, 140);
  t.setFrozenRows(1);
  t.getRange(filas.length + 3, 1).setValue('Las etapas desde «Escribieron» salen de la columna estado de la pestaña Registros: mantenla al día.');
}

/** Revisión diaria: te escribe si no entraron registros completos o si Meta rechazó algún aviso. */
function revisarSalud() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = libro.getSheetByName(HOJA);
  if (!hoja || hoja.getLastRow() < 2) return;
  const datos = hoja.getDataRange().getValues();
  const cab = datos[0];
  const i = function (k) { return cab.indexOf(k); };
  const hace24 = Date.now() - 24 * 3600 * 1000;
  let empezaron = 0, completos = 0, calificados = 0, errores = 0;
  datos.slice(1).forEach(function (r) {
    const creado = r[i('creado')];
    if (creado instanceof Date && creado.getTime() >= hace24) {
      empezaron++;
      if (r[i('registro')] === 'completo') completos++;
      if (r[i('califica')] === 'sí') calificados++;
    }
    const act = r[i('actualizado')];
    ['meta_lead', 'meta_agendo', 'meta_compra'].forEach(function (k) {
      if (i(k) >= 0 && String(r[i(k)]).indexOf('ok') !== 0 && String(r[i(k)]) !== '' && act instanceof Date && act.getTime() >= hace24) errores++;
    });
  });

  const props = PropertiesService.getScriptProperties();
  const destino = props.getProperty('CORREO_ALERTAS') || Session.getEffectiveUser().getEmail();
  const problemas = [];
  if (completos === 0) problemas.push('No entró ningún registro completo en las últimas 24 horas (empezaron ' + empezaron + '). Si tu pauta está encendida, abre tu landing y haz un registro de prueba.');
  if (errores > 0) problemas.push(errores + ' aviso(s) a Meta fallaron en las últimas 24 horas. Revisa las columnas meta_lead, meta_agendo y meta_compra: ahí está el detalle.');
  if (!problemas.length || !destino) return;
  MailApp.sendEmail(destino, 'Alerta de tu funnel: ' + libro.getName(),
    problemas.join('\n\n') + '\n\nÚltimas 24 horas: ' + empezaron + ' empezaron, ' + completos + ' completaron, ' + calificados + ' calificados.\n\nHoja: ' + libro.getUrl());
}

/* ============ Utilidades ============ */

function encabezados(hoja) {
  const n = hoja.getLastColumn();
  if (!n) return [];
  return hoja.getRange(1, 1, 1, n).getValues()[0].map(String);
}

function leerFila(hoja, fila) {
  const cab = encabezados(hoja);
  const valores = hoja.getRange(fila, 1, 1, cab.length).getValues()[0];
  const f = {};
  cab.forEach(function (k, i) { f[k] = valores[i]; });
  return f;
}

function fechaCorta() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'd/M/yy h:mm a');
}
