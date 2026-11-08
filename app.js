/* Helénica — sitio estático. Lee data/index.json y data/<col>/<id>.json. */
(function () {
  'use strict';
  const COLS = {
    entes: { s: 'Ente', p: 'Entes', d: 'Dioses, héroes, ninfas, reyes, bestias, epítetos y pueblos.' },
    eventos: { s: 'Evento', p: 'Eventos', d: 'Relatos míticos, festividades, ritos y hechos históricos.' },
    lugares: { s: 'Lugar', p: 'Lugares', d: 'Regiones, poleis, santuarios, ríos, montes y fuentes.' },
    objetos: { s: 'Objeto', p: 'Objetos', d: 'Armas, atributos divinos, agalmata y objetos rituales.' },
  };
  const REPO = 'lucumur/helenica';
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const href = (c, id) => `ficha.html?c=${c}&id=${encodeURIComponent(id)}`;

  // ---- datos frescos (misma lógica que Conlang: GitHub Pages cachea 10 min) ----
  const ghPages = /\.github\.io$/i.test(location.hostname);
  const bust = ghPages ? String(Date.now()) : '';
  const getJSON = url => fetch(bust ? `${url}?v=${bust}` : url, { cache: bust ? 'reload' : 'no-cache' })
    .then(r => { if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); });

  let IDX = null;
  async function loadIndex() {
    if (IDX) return IDX;
    const d = await getJSON('data/index.json');
    const by = new Map(), inv = k => { const m = new Map(); return { m, add(a, b) { if (!m.has(a)) m.set(a, new Set()); m.get(a).add(b); }, get(a) { return [...(m.get(a) || [])]; } }; };
    const hijos = inv(), back = inv(), asp = inv(), cont = inv(), evDo = inv(), evAg = inv(), evEl = inv(), hijosDe = inv();
    for (const it of d.items) by.set(`${it.c}:${it.id}`, it);
    for (const it of d.items) {
      const k = `${it.c}:${it.id}`;
      (it.out || []).forEach(o => back.add(o, k));
      (it.pa || []).forEach(p => { hijos.add(p, k); hijosDe.add(k, p); });
      (it.asp || []).forEach(p => asp.add(p, k));
      (it.pe || []).forEach(p => cont.add(p, k));
      if (it.en && it.c === 'lugares') cont.add(it.en, k);
      (it.do || []).forEach(p => evDo.add(p, k));
      (it.ag || []).forEach(p => evAg.add(p, k));
      (it.el || []).forEach(p => evEl.add(p, k));
    }
    IDX = { items: d.items, by, hijos, back, asp, cont, evDo, evAg, evEl };
    return IDX;
  }

  // ---- markdown mínimo: listas anidadas, **negrita**, *cursiva*, enlaces, imágenes ----
  function inline(s) {
    let t = esc(s);
    t = t.replace(/!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g, (m, a, u) => /\.pdf(\?|$)/i.test(u)
      ? `<a class="ext" href="${u}" target="_blank" rel="noopener">📄 ${a || 'PDF'}</a>`
      : `<img loading="lazy" alt="${a}" src="${u}" onerror="this.remove()">`);
    t = t.replace(/\[([^\]]+)\]\((entes|eventos|lugares|objetos):([a-z0-9-]+)\)/g, (m, a, c, id) => `<a href="${href(c, id)}">${a}</a>`);
    t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a class="ext" href="$2" target="_blank" rel="noopener">$1</a>');
    t = t.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, (m, p, u) => `${p}<a class="ext" href="${u}" target="_blank" rel="noopener">${u.length > 60 ? u.slice(0, 57) + '…' : u}</a>`);
    t = t.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/(^|[^\w*])\*([^*\s][^*]*?)\*(?!\w)/g, '$1<em>$2</em>');
    t = t.replace(/(^|[^\w])_([^_\s][^_]*?)_(?!\w)/g, '$1<em>$2</em>');
    return t;
  }
  function md(src) {
    if (!src) return '';
    const blocks = [];
    for (const raw of String(src).split('\n')) {
      const m = raw.match(/^(\s*)- (.*)$/);
      if (m) blocks.push({ li: true, d: Math.floor(m[1].length / 2), t: m[2] });
      else if (raw.trim()) {
        const last = blocks[blocks.length - 1];
        if (last && last.li) last.t += '\n' + raw.trim(); else blocks.push({ li: false, t: raw.trim() });
      }
    }
    let html = '', stack = [];
    const close = () => { while (stack.length) { html += '</li></ul>'; stack.pop(); } };
    for (const b of blocks) {
      if (!b.li) { close(); html += `<p>${inline(b.t).replace(/\n/g, '<br>')}</p>`; continue; }
      while (stack.length && stack[stack.length - 1] > b.d) { html += '</li></ul>'; stack.pop(); }
      if (stack.length && stack[stack.length - 1] === b.d) html += '</li>';
      else { html += '<ul>'; stack.push(b.d); }
      html += '<li>' + b.t.split('\n').map(inline).join('<br>');
    }
    close();
    return `<div class="md">${html}</div>`;
  }

  // ---- cabecera común ----
  function header(active) {
    const nav = Object.entries(COLS).map(([c, v]) => `<a href="${c}.html"${active === c ? ' class="on"' : ''}>${v.p}</a>`).join('');
    document.body.insertAdjacentHTML('afterbegin', `
<header class="page-header"><div class="wrap">
  <div class="brand"><a href="index.html">ΕΛΛΗΝΙΚΑ</a></div>
  <nav class="site-nav" aria-label="Navegación principal"><a href="index.html"${active === 'home' ? ' class="on"' : ''}>Inicio</a>${nav}
    <button type="button" id="edit-toggle" title="Modo edición (token de GitHub)">✎ Editar</button></nav>
</div></header>`);
    document.body.insertAdjacentHTML('beforeend', `<footer class="page-footer"><div class="wrap">Helénica · mitología y cultura griega. Contenido importado de Tana y editable en <a href="https://github.com/${REPO}">GitHub</a>.</div></footer>`);
    if (window.HEL_EDIT) window.HEL_EDIT.init();
  }

  const tagHTML = ts => (ts || []).map(t => `<span class="tag ${esc(t)}">${esc(t)}</span>`).join(' ');
  const linkKey = (k, extra) => {
    const it = IDX.by.get(k); if (!it) return '';
    return `<a href="${href(it.c, it.id)}">${esc(it.n)}</a>${it.alt ? ` <span class="muted">(${esc(it.alt)})</span>` : ''}${extra || ''}`;
  };
  const listKeys = ks => ks.length ? `<ul>${ks.map(k => `<li>${linkKey(k)}</li>`).join('')}</ul>` : '';

  // ---- portada ----
  async function home() {
    header('home');
    const I = await loadIndex();
    const n = c => I.items.filter(i => i.c === c).length;
    $('main').innerHTML = `
<section class="hero"><p class="eyebrow">Repositorio de mitología griega</p><h1>Helénica</h1>
<p>Entes, eventos, lugares y objetos del mundo helénico, con sus genealogías, epítetos, cultos y fuentes.</p></section>
<section class="cards">${Object.entries(COLS).map(([c, v]) => `<a class="card" href="${c}.html"><span class="count">${n(c)}</span><h2>${v.p}</h2><p>${v.d}</p></a>`).join('')}</section>
<section style="margin-top:34px" class="tool-row"><input type="search" id="q" placeholder="Buscar en todo el repositorio…" autocomplete="off"></section>
<div id="res" class="list"></div>`;
    const q = $('#q'), res = $('#res');
    q.addEventListener('input', () => {
      const v = fold(q.value.trim());
      if (v.length < 2) { res.innerHTML = ''; return; }
      const hits = I.items.filter(i => fold(i.n + ' ' + (i.alt || '')).includes(v)).slice(0, 60);
      res.innerHTML = hits.map(rowHTML).join('') || '<p class="muted">Sin resultados.</p>';
    });
  }

  let AREAS = null;
  let TIPO = null;
  const loadAreas = async () => { if (!AREAS) [AREAS, TIPO] = await Promise.all([getJSON('data/areas.json'), getJSON('data/tipologia.json')]); return AREAS; };
  const tName = (k, id) => { const x = TIPO && TIPO[k].find(a => a.id === id); return x ? x.nombre : id; };
  const areaName = id => { const x = AREAS && AREAS.areas.find(a => a.id === id); return x ? x.nombre : id; };
  function rowHTML(i) {
    return `<a class="row" href="${href(i.c, i.id)}"><div class="nm">${esc(i.n)}${i.alt ? `<small>${esc(i.alt)}</small>` : ''}</div>
<div><div>${tagHTML(i.t)} <span class="muted" style="font-size:.75rem">${COLS[i.c].s}${i.cu ? ' · ' + esc(i.cu) : ''}${i.ar && i.ar.length && AREAS ? ' · ' + esc(i.ar.map(areaName).join(', ')) : ''}</span></div><div class="rs">${esc(i.r || '')}</div></div></a>`;
  }

  // ---- listas ----
  async function list(col) {
    header(col);
    const I = await loadIndex();
    if (col === 'lugares') await loadAreas();
    const all = I.items.filter(i => i.c === col).sort((a, b) => fold(a.n).localeCompare(fold(b.n)));
    const tipos = [...new Set(all.flatMap(i => i.t || []))].sort((a, b) => a.localeCompare(b));
    const QP = new URLSearchParams(location.search);
    const st = { q: '', t: new Set(), a: QP.get('area') || '', es: QP.get('escala') || '', fo: QP.get('forma') || '', fu: QP.get('funcion') || '' };
    const FACETS = [['es', 'escala', 'escalas', 'Escala', i => [i.es]], ['fo', 'forma', 'formas', 'Forma', i => i.fo || []], ['fu', 'funcion', 'funciones', 'Función', i => i.fu || []]];
    const facetPanel = col !== 'lugares' ? '' : `<div id="facets">${FACETS.map(([k, qp, tk, lbl, get]) => `<div class="area-grp"><span class="area-lbl">${lbl}</span>${TIPO[tk].map(x => { const n = all.filter(i => get(i).includes(x.id)).length; return n ? `<button class="chip area" data-k="${k}" data-v="${x.id}" title="${esc(x.descripcion || '')}">${esc(x.nombre)} <span class="muted">${n}</span></button>` : ''; }).join('')}</div>`).join('')}</div>`;
    const areaPanel = col !== 'lugares' ? '' : `<div id="areas">${AREAS.grupos.map(g => `<div class="area-grp"><span class="area-lbl">${esc(g.nombre)}</span>${AREAS.areas.filter(x => x.grupo === g.id).map(x => { const n = all.filter(i => (i.ar || []).includes(x.id)).length; return `<button class="chip area${n ? '' : ' empty'}" data-a="${x.id}" title="${esc(x.descripcion)}">${esc(x.nombre)} <span class="muted">${n}</span></button>`; }).join('')}</div>`).join('')}<p id="area-desc" class="muted"></p></div>`;
    $('main').innerHTML = `
<section class="hero compact"><p class="eyebrow">${all.length} fichas</p><h1>${COLS[col].p}</h1><p>${COLS[col].d}</p></section>
<div class="tool-row"><input type="search" id="q" placeholder="Filtrar por nombre o descripción…" autocomplete="off">
<button class="btn edit-only" id="new">+ Nueva ficha</button></div>
${areaPanel}${facetPanel}<div class="chips" id="chips">${tipos.map(t => `<button class="chip" data-t="${esc(t)}">${esc(t)} <span class="muted">${all.filter(i => (i.t || []).includes(t)).length}</span></button>`).join('')}</div>
<nav class="alphabet" id="abc"></nav><div id="out"></div>`;
    const draw = () => {
      const v = fold(st.q);
      const rows = all.filter(i => (!v || fold(`${i.n} ${i.alt || ''} ${i.r || ''}`).includes(v)) && (!st.t.size || (i.t || []).some(t => st.t.has(t))) && (!st.a || (i.ar || []).includes(st.a))
        && (col !== 'lugares' || FACETS.every(([k, , , , get]) => !st[k] || get(i).includes(st[k]))));
      if (col === 'lugares') {
        document.querySelectorAll('#areas .chip.area').forEach(b => b.classList.toggle('on', b.dataset.a === st.a));
        document.querySelectorAll('#facets .chip.area').forEach(b => b.classList.toggle('on', st[b.dataset.k] === b.dataset.v));
        const ar = AREAS.areas.find(x => x.id === st.a);
        const parts = [ar ? `<strong>${esc(ar.nombre)}</strong> — ${esc(ar.descripcion)}` : '', ...FACETS.filter(([k]) => st[k]).map(([k, , tk]) => { const x = TIPO[tk].find(y => y.id === st[k]); return x ? `<strong>${esc(x.nombre)}</strong>${x.descripcion ? ' — ' + esc(x.descripcion) : ''}` : ''; })].filter(Boolean);
        $('#area-desc').innerHTML = parts.length ? parts.join('<br>') + ` · ${rows.length} lugares` : '';
      }
      const groups = new Map();
      for (const i of rows) { const f0 = fold(i.n).replace(/^[^a-z0-9]+/, '')[0] || '#'; const L = /[a-z]/.test(f0) ? f0.toUpperCase() : '#'; if (!groups.has(L)) groups.set(L, []); groups.get(L).push(i); }
      const ordered = [...groups].sort((a, b) => a[0] === '#' ? 1 : b[0] === '#' ? -1 : a[0].localeCompare(b[0]));
      groups.clear(); ordered.forEach(([k, v]) => groups.set(k, v));
      $('#abc').innerHTML = [...groups.keys()].map(L => `<a href="#L-${L}">${L}</a>`).join('');
      $('#out').innerHTML = [...groups].map(([L, is]) => `<h2 class="letter" id="L-${L}">${L}</h2><div class="list">${is.map(rowHTML).join('')}</div>`).join('') || '<p class="muted">Sin resultados.</p>';
    };
    $('#q').addEventListener('input', e => { st.q = e.target.value.trim(); draw(); });
    $('#chips').addEventListener('click', e => {
      const b = e.target.closest('.chip'); if (!b) return;
      const t = b.dataset.t; st.t.has(t) ? st.t.delete(t) : st.t.add(t); b.classList.toggle('on'); draw();
    });
    if (col === 'lugares') $('#areas').addEventListener('click', e => {
      const b = e.target.closest('.chip.area'); if (!b) return;
      st.a = st.a === b.dataset.a ? '' : b.dataset.a;
      const u = new URL(location.href); st.a ? u.searchParams.set('area', st.a) : u.searchParams.delete('area'); history.replaceState(null, '', u);
      draw();
    });
    if (col === 'lugares') $('#facets').addEventListener('click', e => {
      const b = e.target.closest('.chip.area'); if (!b) return;
      const [k, qp] = FACETS.find(f => f[0] === b.dataset.k);
      st[k] = st[k] === b.dataset.v ? '' : b.dataset.v;
      const u = new URL(location.href); st[k] ? u.searchParams.set(qp, st[k]) : u.searchParams.delete(qp); history.replaceState(null, '', u);
      draw();
    });
    $('#new').addEventListener('click', () => window.HEL_EDIT && window.HEL_EDIT.create(col));
    draw();
  }

  // ---- ficha ----
  const val = v => (v && typeof v === 'object' && !Array.isArray(v)) ? v.texto : v;
  const dd = (label, html, always) => (html && String(html).trim()) ? `<dt>${label}</dt><dd>${html}</dd>` : (always ? `<dt>${label}</dt><dd class="muted">Sin datos</dd>` : '');

  async function ficha() {
    const p = new URLSearchParams(location.search), col = p.get('c'), id = p.get('id');
    header(col);
    const main = $('main');
    if (!COLS[col] || !id) { main.innerHTML = '<p class="notice">Ficha no encontrada.</p>'; return; }
    let r;
    try { [r] = await Promise.all([getJSON(`data/${col}/${id}.json`), loadIndex()]); }
    catch (e) { main.innerHTML = `<p class="notice">No se pudo cargar la ficha (${esc(e.message)}).</p>`; return; }
    document.title = `${r.nombre} · Helénica`;
    const K = `${col}:${id}`, I = IDX, shown = new Set([K]);
    const mark = ks => { ks.forEach(k => shown.add(k)); return ks; };
    const refKeys = v => ((v && v.refs) || []).filter(x => x.id).map(x => `${x.col}:${x.id}`);
    let attrs = '', side = '';

    if (col === 'entes') {
      const padres = refKeys(r.padres), cony = refKeys(r.conyuges), hijosDecl = refKeys(r.hijos);
      const hijosCalc = I.hijos.get(K).filter(k => !hijosDecl.includes(k));
      const herm = [...new Set(padres.flatMap(pk => I.hijos.get(pk)))].filter(k => k !== K);
      mark([...padres, ...cony, ...hijosDecl, ...hijosCalc]);
      const hijosHTML = [md(val(r.hijos)), hijosCalc.length ? `<p class="muted" style="font-size:.82rem;margin:.4em 0 0">Deducidos de las fichas que lo declaran como progenitor:</p>${listKeys(hijosCalc)}` : ''].join('');
      const nac = [md(val(r.nacimiento)), r.estirpe ? `<p class="muted" style="font-size:.8rem;margin:.6em 0 .1em">Estirpe</p>${md(val(r.estirpe))}` : ''].join('');
      const atr = [md(val(r.atributos)), r.especie ? `<p><span class="muted" style="font-size:.8rem">Especie / raza:</span> ${inline(val(r.especie).replace(/^- /gm, '').replace(/\n/g, ' · '))}</p>` : ''].join('');
      const core = !(r.tipos || []).includes('Epíteto');
      attrs = `<dl class="attr">
${dd('Nacimiento / origen', nac, core)}${dd('Padres', md(val(r.padres)), core)}${dd('Cónyuges / amantes', md(val(r.conyuges)), core)}
${dd('Hijos', hijosHTML, core)}${dd('Atributos', atr, core)}${dd('Posesiones', md(val(r.posesiones)), core)}
${dd('Residencias', md(val(r.residencias)), core)}${dd('Fallecimiento', md(val(r.fallecimiento)), core)}
${dd('Nombre', md(val(r.nombre_notas)))}${dd('Epítetos', md(val(r.epitetos)))}${dd('Títulos', md(val(r.titulos)))}
${dd('Contrincantes', md(val(r.contrincantes)))}${dd('Aliados', md(val(r.aliados)))}${dd('Mentores / discípulos', md(val(r.mentores)))}
${dd('Asociaciones', md(val(r.asociaciones)))}${dd('Funciones', md(val(r.funciones)))}${dd('Culto', md(val(r.culto)))}
${dd('Eventos', md(val(r.eventos)))}${dd('Notas', md(val(r.notas)))}
${r.aspecto_de && r.aspecto_de.id ? dd('Aspecto de', linkKey(`entes:${r.aspecto_de.id}`)) : ''}
</dl>`;
      const aspectos = mark(I.asp.get(K));
      const evs = mark(I.evAg.get(K));
      side += tree(padres, cony, [...hijosDecl, ...hijosCalc], herm, r.nombre);
      if (aspectos.length) side += `<div class="box"><h3>Epítetos cultuales</h3>${listKeys(aspectos)}</div>`;
      if (evs.length) side += `<div class="box"><h3>Participa en</h3>${listKeys(evs)}</div>`;
    } else if (col === 'eventos') {
      mark([...refKeys(r.agentes_activos), ...refKeys(r.agentes_pasivos), ...refKeys(r.donde), ...refKeys(r.elementos)]);
      attrs = `<dl class="attr">${r.tipo_tana ? dd('Clase', md(val(r.tipo_tana))) : ''}${dd('Cuándo', md(val(r.cuando)), true)}
${dd('Agentes activos', md(val(r.agentes_activos)), true)}${dd('Agentes pasivos', md(val(r.agentes_pasivos)))}${dd('Dónde', md(val(r.donde)), true)}
${dd('Elementos', md(val(r.elementos)))}${dd('Problema', md(val(r.problema)))}${dd('Desenlace', md(val(r.desenlace)))}</dl>`;
      if (r.serie) {
        const ser = I.items.filter(i => i.se && i.se.nombre === r.serie.nombre).sort((a, b) => a.se.orden - b.se.orden);
        const ix = ser.findIndex(i => i.id === id), prev = ser[ix - 1], next = ser[ix + 1];
        attrs = `<div class="series"><span>${prev ? `← <a href="${href('eventos', prev.id)}">${esc(prev.n)}</a>` : ''}</span><span class="muted">${esc(r.serie.nombre)} · ${r.serie.orden}/${ser.length}</span><span>${next ? `<a href="${href('eventos', next.id)}">${esc(next.n)}</a> →` : ''}</span></div>` + attrs;
      }
    } else if (col === 'lugares') {
      await loadAreas();
      const chain = []; let cur = K, guard = 0;
      while (guard++ < 12) { const it = I.by.get(cur); const up = it && ((it.pe && it.pe[0]) || it.en); if (!up || chain.includes(up)) break; chain.unshift(up); cur = up; }
      mark(chain);
      const contiene = mark(I.cont.get(K)), evs = mark(I.evDo.get(K));
      const tt = (r.campos || []).find(c => c.clave === 'T🏷️');
      attrs = `<dl class="attr">${dd('Tipo', tagHTML(r.tipos) + (tt ? ' · ' + inline(tt.texto.replace(/^- /gm, '').replace(/\n/g, ' · ')) : ''))}${dd('Escala', r.escala ? `<a href="lugares.html?escala=${r.escala}">${esc(tName('escalas', r.escala))}</a>` : '')}
${dd('Forma', (r.forma || []).length ? `<ul class="md">${r.forma.map(x => { const p = x.periodo && TIPO.periodos.find(y => y.id === x.periodo); return `<li><a href="lugares.html?forma=${encodeURIComponent(x.tipo)}">${esc(tName('formas', x.tipo))}</a>${p || x.fechas ? ` <span class="muted">— ${esc(p ? p.nombre : '')}${x.fechas ? (p ? ', ' : '') + esc(x.fechas) : ''}</span>` : ''}${x.nota ? `<br><span style="font-size:.9rem">${inline(x.nota)}</span>` : ''}</li>`; }).join('')}</ul>` : '')}
${dd('Funciones', (r.funciones || []).map(x => `<a class="tag" style="text-decoration:none" href="lugares.html?funcion=${x}">${esc(tName('funciones', x))}</a>`).join(' '))}
${dd('Área', (r.areas || []).map(x => `<a href="lugares.html?area=${encodeURIComponent(x)}">${esc(areaName(x))}</a>`).join(', '))}${dd('Pertenece a', chain.map(k => linkKey(k)).join(' › '))}</dl>`;
      if (contiene.length) side += `<div class="box"><h3>Contiene</h3>${listKeys(contiene)}</div>`;
      if (evs.length) side += `<div class="box"><h3>Eventos aquí</h3>${listKeys(evs)}</div>`;
    } else if (col === 'objetos') {
      const evs = mark(I.evEl.get(K));
      const tt = (r.campos || []).find(c => c.clave === 'T🏷️');
      attrs = `<dl class="attr">${dd('Tipo', tagHTML(r.tipos) + (tt ? ' · ' + inline(tt.texto.replace(/^- /gm, '').replace(/\n/g, ' · ')) : ''))}</dl>`;
      if (evs.length) side += `<div class="box"><h3>Aparece en</h3>${listKeys(evs)}</div>`;
    }
    const campos = (r.campos || []).filter(c => !(col === 'lugares' && c.clave === 'H🔼') && !(col !== 'entes' && col !== 'eventos' && c.clave === 'T🏷️'));
    if (campos.length) attrs += `<dl class="attr">${campos.map(c => dd(esc(c.etiqueta), md(c.texto))).join('')}</dl>`;
    const secs = r.secciones || [];
    const secHTML = secs.map((s, i) => s.titulo
      ? `<details class="sec"${secs.length <= 3 || i === 0 ? ' open' : ''}><summary>${inline(s.titulo)}</summary>${md(s.texto)}</details>`
      : `<div class="sec">${md(s.texto)}</div>`).join('');
    const fuentes = (r.fuentes || []).filter(f => f.titulo || f.url);
    const fuentesHTML = fuentes.length ? `<details class="sec" open><summary>Fuentes</summary><ul class="md">${fuentes.map(f => `<li>${f.url ? `<a class="ext" href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.titulo || f.url)}</a>` : inline(f.titulo)}</li>`).join('')}</ul></details>` : '';
    const back = I.back.get(K).filter(k => !shown.has(k));
    if (back.length) side += `<div class="box"><h3>Mencionado en</h3>${listKeys(back.slice(0, 80))}</div>`;
    if (r.contenido_en && r.contenido_en.id) side = `<div class="box"><h3>Forma parte de</h3>${linkKey(`${r.contenido_en.col}:${r.contenido_en.id}`)}</div>` + side;
    const desc = val(r.descripcion);
    main.innerHTML = `
<section class="hero compact"><p class="eyebrow"><a href="${col}.html" style="text-decoration:none">${COLS[col].p}</a></p>
<h1>${esc(r.nombre)}</h1>${r.nombre_alt ? `<p style="font:1.2rem var(--serif)">${esc(r.nombre_alt)}</p>` : ''}
<p>${tagHTML(r.tipos || (r.tipo ? [r.tipo] : []))}${r.genero ? ` <span class="tag">${r.genero === 'M' ? '♂' : '♀'}</span>` : ''}</p>
${desc ? `<div style="font-size:1.06rem;max-width:780px">${md(desc)}</div>` : ''}
<p><button class="btn edit-only" id="ed">✎ Editar esta ficha</button></p></section>
<div class="ficha"><article>${attrs}${secHTML}${fuentesHTML}
<p class="muted" style="font-size:.78rem;margin-top:28px">Archivo: <a href="https://github.com/${REPO}/blob/main/data/${col}/${id}.json">data/${col}/${id}.json</a>${r.tana_id ? ` · Tana: <code>${esc(r.tana_id)}</code>` : ''}</p></article>
<aside>${r.imagen ? `<img src="${esc(r.imagen)}" alt="${esc(r.nombre)}" loading="lazy" onerror="this.remove()">` : ''}${side}</aside></div>`;
    $('#ed').addEventListener('click', () => window.HEL_EDIT && window.HEL_EDIT.edit(col, id, r));
  }

  function tree(pa, co, hi, he, name) {
    if (!pa.length && !co.length && !hi.length) return '';
    const L = (lbl, ks) => ks.length ? `<div class="lvl"><span class="lbl">${lbl}</span>${ks.map(k => { const it = IDX.by.get(k); return it ? `<a href="${href(it.c, it.id)}">${esc(it.n)}</a>` : ''; }).join('')}</div>` : '';
    return `<div class="box"><h3>Genealogía</h3><div class="tree">${L('Padres', pa)}
<div class="lvl"><b>${esc(name)}</b>${co.map(k => { const it = IDX.by.get(k); return it ? `<a href="${href(it.c, it.id)}">⚭ ${esc(it.n)}</a>` : ''; }).join('')}</div>
${L('Hijos', [...new Set(hi)])}${L('Hermanos', he.slice(0, 30))}</div></div>`;
  }

  window.HEL = { COLS, REPO, loadIndex, md, getJSON };
  const page = document.body.dataset.page;
  const run = page === 'home' ? home : page === 'ficha' ? ficha : () => list(page);
  const go = () => run().catch(e => { $('main').innerHTML = `<p class="notice">Error: ${esc(e.message)}</p>`; console.error(e); });
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', go) : go();
})();
