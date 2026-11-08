/* Modo edición: guarda fichas como commits en GitHub con un token fine-grained
   (solo el repo helenica, permiso Contents: Read and write). El token vive solo en este navegador. */
(function () {
  'use strict';
  const REPO = 'lucumur/Helenica', BRANCH = 'main', TK = 'helenica-token', ON = 'helenica-edit';
  const store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
                  set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} } };
  const b64 = s => btoa(unescape(encodeURIComponent(s)));
  const slugify = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 60);
  const empty = () => ({ texto: '', refs: [] });

  const TEMPLATES = {
    entes: n => ({ id: '', nombre: n, nombre_alt: null, tipos: ['Deidad'], genero: null, cultura: 'Helénica', imagen: null,
      descripcion: empty(), nacimiento: empty(), padres: empty(), conyuges: empty(), hijos: empty(), atributos: empty(),
      posesiones: empty(), residencias: empty(), fallecimiento: empty(), epitetos: empty(), campos: [], secciones: [], fuentes: [] }),
    eventos: n => ({ id: '', nombre: n, nombre_alt: null, tipo: 'Mítico', imagen: null, descripcion: empty(), cuando: empty(),
      agentes_activos: empty(), agentes_pasivos: empty(), donde: empty(), elementos: empty(), problema: empty(), desenlace: empty(),
      campos: [], secciones: [], fuentes: [] }),
    lugares: n => ({ id: '', nombre: n, nombre_alt: null, tipos: ['Lugar'], areas: [], escala: 'asentamiento', forma: [], funciones: [], imagen: null, pertenece_a: [],
      campos: [{ clave: 'D🪪', etiqueta: 'Descripción', texto: '', refs: [] }], secciones: [], fuentes: [] }),
    objetos: n => ({ id: '', nombre: n, nombre_alt: null, tipos: ['Objeto'], imagen: null,
      campos: [{ clave: 'D📝', etiqueta: 'Descripción', texto: '', refs: [] }], secciones: [], fuentes: [] }),
  };

  async function api(path, opts = {}) {
    const r = await fetch(`https://api.github.com/repos/${REPO}/${path}`, {
      ...opts, headers: { Authorization: `Bearer ${store.get(TK)}`, Accept: 'application/vnd.github+json', ...(opts.headers || {}) } });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`GitHub ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return r.json();
  }
  async function saveFile(path, text, message, mustBeNew) {
    const cur = await api(`contents/${path}?ref=${BRANCH}`);
    if (cur && mustBeNew) throw new Error(`Ya existe ${path}`);
    return api(`contents/${path}`, { method: 'PUT', body: JSON.stringify({ message, content: b64(text), branch: BRANCH, ...(cur ? { sha: cur.sha } : {}) }) });
  }

  function dialog() {
    let d = document.getElementById('hel-dlg');
    if (d) return d;
    document.body.insertAdjacentHTML('beforeend', `<dialog id="hel-dlg"><form method="dialog">
<h3 id="hel-t" style="margin:0 0 8px;font-family:var(--serif)"></h3>
<p class="msg" style="margin:0 0 8px">Enlaces internos en cualquier texto: <code>[Nombre](entes:slug)</code>, <code>(eventos:…)</code>, <code>(lugares:…)</code>, <code>(objetos:…)</code>. Los padres, cónyuges e hijos se leen de esos enlaces.</p>
<textarea id="hel-x" spellcheck="false"></textarea>
<div class="bar"><span class="msg" id="hel-m"></span><span><button class="btn ghost" value="cancel">Cerrar</button> <button class="btn" id="hel-s" value="default">Guardar (commit)</button></span></div>
</form></dialog>`);
    return document.getElementById('hel-dlg');
  }

  function open(title, rec, onSave) {
    const d = dialog();
    d.querySelector('#hel-t').textContent = title;
    d.querySelector('#hel-x').value = JSON.stringify(rec, null, 2);
    d.querySelector('#hel-m').textContent = '';
    const btn = d.querySelector('#hel-s');
    btn.onclick = async ev => {
      ev.preventDefault();
      const m = d.querySelector('#hel-m');
      let obj;
      try { obj = JSON.parse(d.querySelector('#hel-x').value); } catch (e) { m.textContent = 'JSON inválido: ' + e.message; return; }
      if (!obj.nombre) { m.textContent = 'Falta "nombre".'; return; }
      btn.disabled = true; m.textContent = 'Guardando…';
      try { await onSave(obj); m.textContent = 'Guardado. El índice se regenera en ~1 min (GitHub Actions).'; setTimeout(() => location.reload(), 1600); }
      catch (e) { m.textContent = e.message; }
      finally { btn.disabled = false; }
    };
    d.showModal();
  }

  // Varios archivos en un solo commit (Git Data API): ref → tree nuevo → commit → mover ref.
  async function saveMany(files, message) {
    const ref = await api(`git/ref/heads/${BRANCH}`), base = await api(`git/commits/${ref.object.sha}`);
    const tree = await api('git/trees', { method: 'POST', body: JSON.stringify({ base_tree: base.tree.sha,
      tree: files.map(f => ({ path: f.path, mode: '100644', type: 'blob', content: f.text })) }) });
    const commit = await api('git/commits', { method: 'POST', body: JSON.stringify({ message, tree: tree.sha, parents: [ref.object.sha] }) });
    return api(`git/refs/heads/${BRANCH}`, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha }) });
  }
  async function readFile(path) {
    const f = await api(`contents/${path}?ref=${BRANCH}`);
    if (!f) throw new Error(`No existe ${path}`);
    return JSON.parse(decodeURIComponent(escape(atob(f.content.replace(/\n/g, '')))));
  }

  // ---------- Editor de formulario (lugares) ----------
  const E = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const getJ = u => fetch(u).then(r => r.json());
  let REF = null;
  async function refs() {
    if (REF) return REF;
    const [I, areas, tipo] = await Promise.all([window.HEL.loadIndex(), getJ('data/areas.json'), getJ('data/tipologia.json')]);
    REF = { I, areas: areas.areas, tipo, lug: I.items.filter(i => i.c === 'lugares') };
    return REF;
  }
  const pickVal = (it) => `${it.n} — ${it.id}`;
  const parsePick = (v, col) => { const m = String(v).match(/ — ([a-z0-9-]+)$/); if (!m) return null; const it = REF.I.by.get(`${col}:${m[1]}`); return it ? it : null; };
  const parseAny = v => { const m = String(v).match(/ — (entes|eventos|lugares|objetos):([a-z0-9-]+)$/); return m ? REF.I.by.get(`${m[1]}:${m[2]}`) : null; };

  function formDialog() {
    let d = document.getElementById('hel-form');
    if (d) return d;
    document.body.insertAdjacentHTML('beforeend', `<dialog id="hel-form" class="fe"><form method="dialog">
<div class="fe-head"><h3 id="fe-t"></h3><button class="btn ghost" value="cancel">Cerrar</button></div>
<div id="fe-body"></div>
<div class="bar"><span class="msg" id="fe-m"></span><span><button class="btn ghost" value="cancel">Cancelar</button> <button class="btn" id="fe-s" value="default">Guardar</button></span></div>
</form><datalist id="dl-lug"></datalist><datalist id="dl-all"></datalist></dialog>`);
    d = document.getElementById('hel-form');
    d.querySelector('#dl-lug').innerHTML = REF.lug.map(i => `<option value="${E(pickVal(i))}">`).join('');
    d.querySelector('#dl-all').innerHTML = REF.I.items.map(i => `<option value="${E(`${i.n} — ${i.c}:${i.id}`)}">`).join('');
    return d;
  }

  // Lista de chips con selector para añadir.
  function chips(name, values, options, placeholder) {
    const opt = options.map(o => `<option value="${E(o.id)}">${E(o.nombre)}</option>`).join('');
    return `<div class="fe-chips" data-chips="${name}">${values.map(v => chip(v, (options.find(o => o.id === v) || { nombre: v }).nombre)).join('')}
<select class="fe-add"><option value="">${E(placeholder)}</option>${opt}</select></div>`;
  }
  const chip = (v, label) => `<span class="fe-chip" data-v="${E(v)}">${E(label)}<button type="button" class="x" title="Quitar">×</button></span>`;
  const linkBtn = `<button type="button" class="fe-link" title="Insertar un enlace a otra ficha">🔗 Enlazar ficha</button>`;
  const txt = (cls, v, rows, ph) => `<textarea class="${cls}" rows="${rows || 3}" placeholder="${E(ph || '')}">${E(v)}</textarea>`;

  function lugarRow(x) {
    const it = x.id && REF.I.by.get(`lugares:${x.id}`);
    return `<div class="fe-li" data-id="${E(x.id || '')}"><span class="h">⋮⋮</span>
<input class="fe-pick" list="dl-lug" placeholder="Buscar lugar…" value="${E(it ? pickVal(it) : '')}">
<input class="fe-nota" placeholder="Nota (opcional)" value="${E(x.nota || '')}">
<button type="button" class="up" title="Subir">↑</button><button type="button" class="dn" title="Bajar">↓</button><button type="button" class="x" title="Quitar">×</button></div>`;
  }
  function grupoBlock(g) {
    return `<fieldset class="fe-grupo"><div class="fe-row"><input class="fe-gname" placeholder="Nombre del grupo (p. ej. Cícladas)" value="${E(g.grupo || '')}">
<button type="button" class="gup" title="Subir grupo">↑</button><button type="button" class="gdn" title="Bajar grupo">↓</button><button type="button" class="gx" title="Quitar grupo">Quitar grupo</button></div>
${txt('fe-gnota', g.nota, 2, 'Nota del grupo')}
<div class="fe-lis">${(g.lugares || []).map(lugarRow).join('')}</div>
<button type="button" class="fe-addli">+ Añadir sub-región</button></fieldset>`;
  }
  function seccionRow(x) {
    return `<div class="fe-sec"><div class="fe-row"><input class="fe-stit" placeholder="Título de la nota" value="${E(x.titulo || '')}"><button type="button" class="sup">↑</button><button type="button" class="sdn">↓</button><button type="button" class="sx">Quitar</button></div>
${txt('fe-stxt', x.texto, 4, 'Texto')}${linkBtn}</div>`;
  }
  function fuenteRow(x) {
    return `<div class="fe-row fe-fu"><input class="fe-ftit" placeholder="Título / referencia" value="${E(x.titulo || '')}"><input class="fe-furl" placeholder="URL (opcional)" value="${E(x.url || '')}"><button type="button" class="fx">×</button></div>`;
  }
  function formaRow(x) {
    const T = REF.tipo;
    return `<div class="fe-row fe-fo"><select class="fe-fot"><option value="">Forma…</option>${T.formas.map(o => `<option value="${o.id}"${o.id === x.tipo ? ' selected' : ''}>${E(o.nombre)}</option>`).join('')}</select>
<select class="fe-fop"><option value="">Periodo…</option>${T.periodos.map(o => `<option value="${o.id}"${o.id === x.periodo ? ' selected' : ''}>${E(o.nombre)}</option>`).join('')}</select>
<input class="fe-fof" placeholder="Fechas" value="${E(x.fechas || '')}"><input class="fe-fon" placeholder="Nota" value="${E(x.nota || '')}"><button type="button" class="fx">×</button></div>`;
  }

  async function editLugar(id, rec) {
    await refs();
    const d = formDialog(), T = REF.tipo;
    const tierOf = e => (T.escalas.find(x => x.id === e) || {}).tier || 9;
    d.querySelector('#fe-t').textContent = `Editar: ${rec.nombre}`;
    const pe = (rec.pertenece_a || []).filter(x => x.id);
    const geo = rec.geo && rec.geo.punto && rec.geo.precision !== 'heredada' ? rec.geo.punto : ['', ''];
    d.querySelector('#fe-body').innerHTML = `
<section><h4>Identidad</h4>
<div class="fe-grid"><label>Nombre<input id="f-nombre" value="${E(rec.nombre)}"></label><label>Nombre alternativo<input id="f-alt" value="${E(rec.nombre_alt || '')}"></label>
<label>Tipos <small>(separados por coma)</small><input id="f-tipos" value="${E((rec.tipos || []).join(', '))}"></label>
<label>Escala<select id="f-escala"><option value="">—</option>${T.escalas.map(o => `<option value="${o.id}"${o.id === rec.escala ? ' selected' : ''}>${o.tier ? `Tier ${o.tier} · ` : ''}${E(o.nombre)}</option>`).join('')}</select></label></div>
<label>Área${chips('areas', rec.areas || [], REF.areas, '+ Añadir área')}</label>
<label>Funciones${chips('funciones', rec.funciones || [], T.funciones, '+ Añadir función')}</label>
<label>Pertenece a<div class="fe-pe">${pe.map(x => chip(x.id, (REF.I.by.get('lugares:' + x.id) || { n: x.nombre || x.id }).n)).join('')}<input class="fe-pe-in" list="dl-lug" placeholder="+ Buscar lugar contenedor…"></div></label>
<div class="fe-grid"><label>Latitud<input id="f-lat" type="number" step="0.001" value="${E(geo[1])}"></label><label>Longitud<input id="f-lon" type="number" step="0.001" value="${E(geo[0])}"></label></div>
</section>
<section><h4>Descripción</h4>${txt('f-desc', (rec.descripcion && rec.descripcion.texto) || '', 3)}${linkBtn}</section>
<section><h4>Contiene <small>— sub-regiones del tier inferior, en grupos</small></h4>
<p class="hint">Al guardar, cada lugar añadido pasa a «pertenecer a» esta ficha, y cada lugar quitado deja de hacerlo.</p>
<div id="f-grupos">${(rec.contiene || []).map(grupoBlock).join('')}</div>
<button type="button" id="f-addg">+ Añadir grupo</button></section>
<section><h4>Forma por periodo</h4><div id="f-formas">${(rec.forma || []).map(formaRow).join('')}</div><button type="button" id="f-addfo">+ Añadir forma</button></section>
<section><h4>Notas</h4><div id="f-secs">${(rec.secciones || []).map(seccionRow).join('')}</div><button type="button" id="f-adds">+ Añadir nota</button></section>
<section><h4>Fuentes</h4><div id="f-fuentes">${(rec.fuentes || []).map(fuenteRow).join('')}</div><button type="button" id="f-addf">+ Añadir fuente</button></section>`;
    const body = d.querySelector('#fe-body');
    const ins = (sel, html) => body.querySelector(sel).insertAdjacentHTML('beforeend', html);
    const move = (el, dir) => { const sib = dir < 0 ? el.previousElementSibling : el.nextElementSibling; if (sib) dir < 0 ? sib.before(el) : sib.after(el); };
    body.onclick = ev => {
      const b = ev.target.closest('button'); if (!b) return;
      const c = b.classList;
      if (b.id === 'f-addg') { ins('#f-grupos', grupoBlock({ lugares: [{}] })); return; }
      if (b.id === 'f-adds') { ins('#f-secs', seccionRow({})); return; }
      if (b.id === 'f-addf') { ins('#f-fuentes', fuenteRow({})); return; }
      if (b.id === 'f-addfo') { ins('#f-formas', formaRow({})); return; }
      if (c.contains('fe-addli')) { b.previousElementSibling.insertAdjacentHTML('beforeend', lugarRow({})); b.previousElementSibling.lastElementChild.querySelector('input').focus(); return; }
      if (c.contains('x')) { (b.closest('.fe-li') || b.closest('.fe-chip')).remove(); return; }
      if (c.contains('up') || c.contains('dn')) { move(b.closest('.fe-li'), c.contains('up') ? -1 : 1); return; }
      if (c.contains('gx')) { if (confirm('¿Quitar el grupo y sus lugares de la lista?')) b.closest('.fe-grupo').remove(); return; }
      if (c.contains('gup') || c.contains('gdn')) { move(b.closest('.fe-grupo'), c.contains('gup') ? -1 : 1); return; }
      if (c.contains('sx')) { b.closest('.fe-sec').remove(); return; }
      if (c.contains('sup') || c.contains('sdn')) { move(b.closest('.fe-sec'), c.contains('sup') ? -1 : 1); return; }
      if (c.contains('fx')) { b.closest('.fe-row').remove(); return; }
      if (c.contains('fe-link')) {
        const ta = b.previousElementSibling, v = prompt('Escribe el nombre de la ficha a enlazar:');
        if (!v) return;
        const q = v.toLowerCase(), hit = REF.I.items.find(i => i.n.toLowerCase() === q) || REF.I.items.find(i => i.n.toLowerCase().startsWith(q)) || REF.I.items.find(i => i.n.toLowerCase().includes(q));
        if (!hit) { alert('No encontré esa ficha.'); return; }
        if (!confirm(`¿Enlazar a «${hit.n}» (${hit.c})?`)) return;
        const a = ta.selectionStart, z = ta.selectionEnd, label = ta.value.slice(a, z) || hit.n;
        ta.setRangeText(`[${label}](${hit.c}:${hit.id})`, a, z, 'end'); ta.focus();
      }
    };
    body.onchange = ev => {
      const t = ev.target;
      if (t.classList.contains('fe-add') && t.value) {
        const box = t.closest('.fe-chips');
        if (!box.querySelector(`.fe-chip[data-v="${t.value}"]`)) t.insertAdjacentHTML('beforebegin', chip(t.value, t.selectedOptions[0].textContent));
        t.value = '';
      }
      if (t.classList.contains('fe-pe-in')) {
        const it = parsePick(t.value, 'lugares'); if (!it) return;
        if (!t.parentNode.querySelector(`.fe-chip[data-v="${it.id}"]`)) t.insertAdjacentHTML('beforebegin', chip(it.id, it.n));
        t.value = '';
      }
      if (t.classList.contains('fe-pick')) {
        const it = parsePick(t.value, 'lugares'), row = t.closest('.fe-li');
        row.dataset.id = it ? it.id : ''; t.classList.toggle('bad', !it && !!t.value);
        if (it && tierOf(it.es) <= tierOf(body.querySelector('#f-escala').value)) t.title = 'Ojo: su tier no es inferior al de esta ficha';
      }
    };
    body.oninput = ev => { const t = ev.target; if ((t.classList.contains('fe-pe-in') || t.classList.contains('fe-pick')) && / — [a-z0-9-]+$/.test(t.value)) body.onchange(ev); };
    const m = d.querySelector('#fe-m'), btn = d.querySelector('#fe-s');
    m.textContent = '';
    btn.onclick = async ev => {
      ev.preventDefault();
      const $ = s => body.querySelector(s), $$ = s => [...body.querySelectorAll(s)];
      const bad = $$('.fe-pick').filter(i => i.value && !i.closest('.fe-li').dataset.id);
      if (bad.length) { m.textContent = `Hay ${bad.length} lugar(es) sin elegir de la lista.`; bad[0].focus(); return; }
      const nombre = $('#f-nombre').value.trim(); if (!nombre) { m.textContent = 'Falta el nombre.'; return; }
      const name = i => (REF.I.by.get('lugares:' + i) || {}).n || i;
      const obj = { ...rec, nombre, nombre_alt: $('#f-alt').value.trim() || null,
        tipos: $('#f-tipos').value.split(',').map(x => x.trim()).filter(Boolean),
        escala: $('#f-escala').value || null,
        areas: $$('[data-chips=areas] .fe-chip').map(c => c.dataset.v),
        funciones: $$('[data-chips=funciones] .fe-chip').map(c => c.dataset.v),
        pertenece_a: $$('.fe-pe .fe-chip').map(c => ({ col: 'lugares', id: c.dataset.v, nombre: name(c.dataset.v) })),
        forma: $$('.fe-fo').map(r => ({ tipo: r.querySelector('.fe-fot').value, periodo: r.querySelector('.fe-fop').value || null, fechas: r.querySelector('.fe-fof').value.trim() || null, nota: r.querySelector('.fe-fon').value.trim() || null })).filter(x => x.tipo),
        secciones: $$('.fe-sec').map(r => ({ titulo: r.querySelector('.fe-stit').value.trim(), texto: r.querySelector('.fe-stxt').value.trim() })).filter(x => x.titulo || x.texto),
        fuentes: $$('.fe-fu').map(r => ({ titulo: r.querySelector('.fe-ftit').value.trim(), url: r.querySelector('.fe-furl').value.trim() || null })).filter(x => x.titulo || x.url),
        contiene: $$('.fe-grupo').map(g => ({ grupo: g.querySelector('.fe-gname').value.trim(), nota: g.querySelector('.fe-gnota').value.trim() || null,
          lugares: [...g.querySelectorAll('.fe-li')].filter(r => r.dataset.id).map(r => ({ col: 'lugares', id: r.dataset.id, nombre: name(r.dataset.id), ...(r.querySelector('.fe-nota').value.trim() ? { nota: r.querySelector('.fe-nota').value.trim() } : {}) })) }))
          .filter(g => g.grupo || g.lugares.length) };
      const desc = $('.f-desc').value.trim();
      obj.descripcion = desc ? { ...(rec.descripcion || {}), texto: desc } : null;
      if (!obj.descripcion) delete obj.descripcion;
      if (!obj.contiene.length) delete obj.contiene;
      const lat = parseFloat($('#f-lat').value), lon = parseFloat($('#f-lon').value);
      if (!isNaN(lat) && !isNaN(lon)) obj.geo = { ...(rec.geo || {}), punto: [lon, lat], precision: 'aprox' }, delete obj.geo.de;
      // Sincronizar pertenece_a de los lugares añadidos o quitados de «Contiene».
      const ids = o => new Set((o.contiene || []).flatMap(g => (g.lugares || []).map(x => x.id)));
      const before = ids(rec), after = ids(obj), add = [...after].filter(x => !before.has(x)), del = [...before].filter(x => !after.has(x));
      if (add.includes(id)) { m.textContent = 'Una ficha no puede contenerse a sí misma.'; return; }
      btn.disabled = true; m.textContent = 'Guardando…';
      try {
        const files = [{ path: `data/lugares/${id}.json`, text: JSON.stringify(obj, null, 2) + '\n' }];
        for (const cid of [...add, ...del]) {
          const c = await readFile(`data/lugares/${cid}.json`);
          let pa = (c.pertenece_a || []).filter(x => x.id !== id);
          if (add.includes(cid)) pa = [{ col: 'lugares', id, nombre }, ...pa];
          c.pertenece_a = pa;
          files.push({ path: `data/lugares/${cid}.json`, text: JSON.stringify(c, null, 2) + '\n' });
        }
        await saveMany(files, `Editar lugares: ${nombre}${add.length || del.length ? ` (+${add.length}/−${del.length} sub-regiones)` : ''}`);
        m.textContent = 'Guardado. El sitio se actualiza en ~1 min.'; setTimeout(() => location.reload(), 1800);
      } catch (e) { m.textContent = e.message; }
      finally { btn.disabled = false; }
    };
    d.showModal();
  }

  function setEditing(v) {
    document.body.classList.toggle('editing', v);
    const b = document.getElementById('edit-toggle'); if (b) { b.classList.toggle('on', v); b.textContent = v ? '✎ Editando' : '✎ Editar'; }
    store.set(ON, v ? '1' : null);
  }

  window.HEL_EDIT = {
    init() {
      const b = document.getElementById('edit-toggle');
      if (!b) return;
      b.addEventListener('click', () => {
        if (document.body.classList.contains('editing')) { setEditing(false); return; }
        if (!store.get(TK)) {
          const t = prompt('Token fine-grained de GitHub (solo repo helenica, Contents: Read and write). Se guarda únicamente en este navegador:');
          if (!t) return; store.set(TK, t.trim());
        }
        setEditing(true);
      });
      if (store.get(ON) === '1' && store.get(TK)) setEditing(true);
    },
    edit(col, id, rec) {
      if (col === 'lugares') return editLugar(id, rec).catch(e => alert(e.message));
      open(`Editar ${col}/${id}.json`, rec, obj => {
        if (obj.id !== id) throw new Error('No cambies "id": renombrar una ficha rompe los enlaces. Crea una nueva si hace falta.');
        return saveFile(`data/${col}/${id}.json`, JSON.stringify(obj, null, 2) + '\n', `Editar ${col}: ${obj.nombre}`);
      });
    },
    create(col) {
      const n = prompt('Nombre de la nueva ficha (p. ej. "Hippolytos = Hipólito"):');
      if (!n) return;
      const [prim, alt] = n.split(/\s*=\s*/);
      const rec = TEMPLATES[col](prim.trim());
      rec.id = slugify(prim); rec.nombre_alt = alt ? alt.trim() : null;
      open(`Nueva ficha: ${col}/${rec.id}.json`, rec, obj => {
        obj.id = obj.id || slugify(obj.nombre);
        return saveFile(`data/${col}/${obj.id}.json`, JSON.stringify(obj, null, 2) + '\n', `Nueva ficha en ${col}: ${obj.nombre}`, true)
          .then(() => { setTimeout(() => { location.href = `ficha.html?c=${col}&id=${obj.id}`; }, 1500); });
      });
    },
  };
})();
