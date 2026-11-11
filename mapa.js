/* Helénica — atlas. SVG propio, sin librerías ni teselas.
   Capas: mar · tierra (Natural Earth) · áreas recortadas a la costa · ríos y lagos · lugares (choras y poleis) · etiquetas.
   Datos: data/mapa/{tierra,rios,lagos,areas.geo}.json, data/areas.json y los puntos geo.punto de las fichas (vía data/index.json). */
(function () {
  'use strict';
  const LON0 = -10, LAT0 = 48.5, LON1 = 46, LAT1 = 24, COS = Math.cos(38 * Math.PI / 180), U = 100;
  const W = (LON1 - LON0) * COS * U, H = (LAT0 - LAT1) * U;
  const P = ([lon, lat]) => [(lon - LON0) * COS * U, (LAT0 - lat) * U];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const ring = r => r.map((c, i) => { const [x, y] = P(c); return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`; }).join('') + 'Z';
  const polyPath = rings => rings.map(ring).join('');
  const line = cs => cs.map((c, i) => { const [x, y] = P(c); return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`; }).join('');
  const ficha = (c, id) => `ficha.html?c=${c}&id=${encodeURIComponent(id)}`;
  const HELADE = ['#d9a079', '#e3b98f', '#c98e6a', '#e8c79d', '#d4a483', '#dcae7d', '#c7956f', '#e6bc8b', '#d09a74', '#e0b48c', '#cf9f7e', '#e4c095', '#d6a988', '#dfb184', '#cb936d'];
  const FUERA = ['#b9c6c1', '#c4cbbd', '#b3c0c7', '#c8c3b5', '#bcc8b8', '#c0c4cc', '#b6c3bb', '#c6c0b0', '#bdc7c4', '#c2bfb6', '#b8c4be', '#c5cac0'];
  const TIER_ICON = { chora: 'diamond', nesos: 'diamond', ethnos: 'diamond', dominio: 'diamond', 'polis-kome': 'circle', demos: 'small', moira: 'small', oikema: 'small' };
  // Nivel = último umbral alcanzado. k = ancho del atlas / ancho del encuadre.
  const ZL = [
    { n: 1, k: 1, que: 'Tier 0: zonas continentales si la fecha las tiene; si no, áreas. Las cinco capitales' },
    { n: 2, reduccion: 0.75, que: 'Tier 1: regiones de la fecha si las tiene; si no, áreas. Capitales' },
    { n: 3, reduccion: 0.55, que: 'Tier 2: subregiones con su poder en la fecha, sobre las regiones de tier 1' },
    { n: 4, reduccion: 0.55, que: 'Tier 3: choras y ethne; cauces y macizos' },
    { n: 5, reduccion: 0.55, que: 'Tier 4: asentamientos, cada isla, iconos y nombres de ríos y montes; tope de zoom' },
  ];
  // Cada porcentaje reduce el ancho visible respecto al nivel anterior.
  for (let i = 1; i < ZL.length; i++) ZL[i].k = ZL[i - 1].k / (1 - ZL[i].reduccion);
  const MAX_ZOOM = ZL[ZL.length - 1].n;
  const zk = n => ZL[n - 1].k;
  const zlevel = k => { let n = 1; for (const z of ZL) if (k + 1e-9 >= z.k) n = z.n; return n; };
  // Distancia y anchura de la barra de escala.
  const SCALE_STEPS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
  const scaleBar = unitsPerPixel => {
    const kmPerPx = unitsPerPixel / U * 111.2;
    const km = SCALE_STEPS.find(v => v / kmPerPx >= 70) || 1000;
    return { km, pixels: km / kmPerPx };
  };
  const siteLevel = s => s.tier === 'chora' || s.tier === 'ethnos' ? 4 : 5;
  const naturalKind = i => (i.t || []).includes('Monte') ? 'monte' : (i.t || []).includes('Río') ? 'rio' : null;
  // Visibles en todo nivel. Choras y ethne, desde el nivel 4; asentamientos e islas, desde el 5.
  const CAPITAL = {
    'argos-argolis': 'Argos',
    'qorinthos-korinthia': 'Korinthos',
    'esparta-laconia': 'Spartē',
    'elis-peloponnesos': 'Ēlis',
    'orkhomenos-arkadia': 'Orchomenos',
  };

  let DATA = null;
  async function load() {
    if (DATA) return DATA;
    const g = window.HEL.getJSON;
    const [I, tierra, rios, lagos, geo, areas, tipo, per, fisico] = await Promise.all([window.HEL.loadIndex(), g('data/mapa/tierra.json'), g('data/mapa/rios.json'),
      g('data/mapa/lagos.json'), g('data/mapa/areas.geo.json'), g('data/areas.json'), g('data/tipologia.json'), g('data/mapa/periodos.json'), g('data/mapa/fisico.json')]);
    const physicalByPlace = new Map();
    for (const f of fisico.accidentes) for (const id of f.lugares) physicalByPlace.set(id, f);
    const areaInfo = new Map(areas.areas.map(a => [a.id, a]));
    let h = 0, f = 0;
    const color = {};
    for (const a of areas.areas) color[a.id] = a.grupo === 'helade' ? HELADE[h++ % HELADE.length] : a.grupo === 'mitica' ? '#c9bcd4' : FUERA[f++ % FUERA.length];
    const lugares = I.items.filter(i => i.c === 'lugares');
    const regionFicha = {};
    for (const i of lugares) {
      if (i.es !== 'region' || !(i.ar || [])[0]) continue;
      const a = i.ar[0], cur = regionFicha[a], score = x => (x.id === a ? 0 : 2) + (x.pt ? 4 : 0) + (/mar|kolpos/i.test(x.n) ? 4 : 0);
      if (!cur || score(i) < score(cur)) regionFicha[a] = i;
    }
    const puntos = lugares.filter(i => i.pt && !i.ph && i.es !== 'region' && ['chora', 'ethnos', 'nesos', 'polis-kome'].includes(i.es));
    // agrupar puntos casi idénticos (fases de un mismo sitio)
    const seen = new Map();
    for (const i of puntos) {
      const geometry = physicalByPlace.get(i.id);
      const k = geometry ? `fisico:${geometry.id}` : `${naturalKind(i) || 'lugar'}:${i.pt.map(v => v.toFixed(2)).join(',')}`;
      if (!seen.has(k)) seen.set(k, { pt: geometry ? geometry.punto : i.pt, items: [], geometry });
      seen.get(k).items.push(i);
    }
    const sites = [...seen.values()].map(s => {
      s.items.sort((a, b) => (a.es === 'polis-kome' ? 0 : 1) - (b.es === 'polis-kome' ? 0 : 1) || a.n.length - b.n.length);
      const cap = s.items.find(i => CAPITAL[i.id]);
      s.capital = !!cap;
      s.main = cap || s.items[0]; s.tier = s.items.some(i => i.es === 'polis-kome') ? 'polis-kome' : s.main.es;
      s.kind = naturalKind(s.main) || s.tier;
      s.label = cap ? CAPITAL[cap.id] : s.main.n.replace(/\s*\(.*$/, '').split(',')[0].trim();
      s.rank = (cap ? -1 : s.tier === 'polis-kome' ? 0 : s.kind === 'monte' || s.kind === 'rio' ? 2 : 1) - Math.min(s.items.length, 4) * .1;
      return s;
    });
    const seas = lugares.filter(i => i.es === 'region' && i.pt);
    const subs = geo.subareas || {};
    const SUBC = ['#e0a27c', '#d3b07f', '#cf9670', '#e6bf92', '#c9a07d', '#dcb48a', '#d8a073'];
    const ISLC = ['#efd0a4', '#e2b98a', '#f0c8b0', '#d9c29a', '#e8d0ae', '#f2c4a2', '#dcc4a6', '#e6be9a', '#f4d2b4', '#d4b896'];
    let hi = 0, ai = 0;
    for (const sub of Object.values(subs)) sub.color = sub.padre === 'islas-egeo' ? ISLC[ai++ % ISLC.length] : SUBC[hi++ % SUBC.length];
    for (const site of sites) {
      const capSub = Object.values(subs).find(sub => sub.capital && site.items.some(i => i.id === sub.capital.ficha));
      if (capSub) {
        site.main = site.items.find(i => i.id === capSub.capital.ficha);
        site.isle = capSub;
        site.label = capSub.capital.nombre;
        site.tier = 'polis-kome';
        site.kind = 'polis-kome';
        site.rank = -0.5;
      } else if (site.items.length && site.items.every(i => Object.values(subs).some(sub => sub.ficha === i.id && !(sub.capital && sub.capital.ficha === i.id)))) {
        site.isleBody = true;
      }
    }
    const poder = Object.fromEntries(per.poderes.map(p => [p.id, p]));
    const t0 = geo.tier0 || {}, t1 = geo.tier1 || {}, t2 = geo.tier2 || {};
    DATA = { I, tierra, rios, lagos, geo: geo.areas, subs, t0, t1, t2, per, poder, areaInfo, color, regionFicha, lugares, sites, seas, tipo, fisico, physicalByPlace };
    return DATA;
  }

  // Nombre griego del área (el de su ficha de región) si difiere del nombre español de navegación.
  const greekName = (info, rf) => rf && rf.n && fold(rf.n) !== fold(info.nombre || '') ? rf.n.split(',')[0].trim() : '';
  const tierName = (D, id) => (D.tipo.escalas.find(x => x.id === id) || {}).nombre || id;
  const areaOf = i => (i.ar || [])[0];
  const physicalPath = f => f.tipo === 'rio' ? f.lineas.map(line).join('') : f.poligonos.map(polyPath).join('');
  function physicalSVG(D, selectedId) {
    return `<g class="physical">${D.fisico.accidentes.map(f => `<g class="feature ${f.tipo}${f.id === selectedId ? ' selected' : ''}" data-feature="${esc(f.id)}" tabindex="0" role="button" aria-label="${esc(f.nombre)}"><path class="extent" d="${physicalPath(f)}" fill-rule="evenodd"/>${f.tipo === 'rio' ? `<path class="feature-hit" d="${physicalPath(f)}"/>` : ''}<title>${esc(f.nombre)}</title></g>`).join('')}</g>`;
  }

  function baseSVG(D, opts = {}) {
    const land = D.tierra.poligonos.map(polyPath).join('');
    const areas = Object.entries(D.geo).map(([id, a]) => `<path class="ar" data-area="${id}" fill="${D.color[id]}" d="${a.poligonos.map(polyPath).join('')}"><title>${esc((D.areaInfo.get(id) || {}).nombre || id)}</title></path>`).join('');
    const rivers = D.rios.rios.map(r => `<path class="rv${r.r <= 4 ? ' major' : ''}" d="${line(r.c)}"/>`).join('');
    const lakes = D.lagos.lagos.map(l => `<path d="${polyPath(l)}"/>`).join('');
    const grat = [];
    for (let lon = -10; lon <= 46; lon += 5) { const [x] = P([lon, 0]); grat.push(`<path d="M${x} 0V${H}"/>`); }
    for (let lat = 25; lat <= 48; lat += 5) { const [, y] = P([0, lat]); grat.push(`<path d="M0 ${y}H${W}"/>`); }
    return `<defs>
<radialGradient id="sea" cx="55%" cy="45%" r="75%"><stop offset="0" stop-color="#d9e6e2"/><stop offset="1" stop-color="#bfd2cf"/></radialGradient>
<filter id="shadow" x="-5%" y="-5%" width="110%" height="110%"><feDropShadow dx="0" dy="1.2" stdDeviation="1.6" flood-color="#3b4a45" flood-opacity=".28"/></filter>
<pattern id="hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><path d="M0 0V9" stroke="#2a1a10" stroke-width="2.2" opacity=".28"/></pattern>
</defs>
<rect class="sea" x="${-W}" y="${-H}" width="${3 * W}" height="${3 * H}" fill="url(#sea)"/>
<g class="grat">${grat.join('')}</g>
<g class="land" filter="url(#shadow)"><path d="${land}"/></g>
<g class="areas">${areas}</g>
<g class="t0">${Object.entries(D.t0 || {}).map(([y, zs]) => zs.map(z => `<path class="z0" data-t0="${y}" data-z0="${esc(z.ficha)}" fill="${z.color || '#d8c8a8'}" d="${z.poligonos.map(polyPath).join('')}"/>`).join('')).join('')}</g>
<g class="t1">${Object.entries(D.t1 || {}).map(([y, zs]) => zs.map(z => `<path class="z1" data-t1="${y}" data-z1="${esc(z.ficha)}" fill="${z.color || '#d8c8a8'}" d="${z.poligonos.map(polyPath).join('')}"/>`).join('')).join('')}</g>
<g class="t2">${Object.entries(D.t2 || {}).map(([y, zs]) => zs.map(z => `<path class="z2" data-t2="${y}" data-z2="${esc(z.ficha)}" fill="${z.color || '#d8c8a8'}" d="${z.poligonos.map(polyPath).join('')}"/>`).join('')).join('')}</g>
<g class="subs">${Object.entries(D.subs || {}).map(([id, s]) => `<path class="sb" data-sub="${id}" fill="${s.color}" d="${s.poligonos.map(polyPath).join('')}"/><path class="sbh" data-sub="${id}" d="${s.poligonos.map(polyPath).join('')}"/>`).join('')}</g>
<g class="lakes">${lakes}</g>
<g class="rivers">${rivers}</g>
${physicalSVG(D, opts.selectedId)}
<g class="coast"><path d="${land}"/></g>`;
  }

  // ---------------- atlas completo ----------------
  async function init() {
    const D = await load();
    const main = document.querySelector('main');
    main.classList.add('atlas-main');
    const offmap = ['inframundo', 'geografia-mitica', 'hiperborea', 'aithiopia'].filter(a => D.areaInfo.has(a));
    main.innerHTML = `
<div class="atlas">
  <svg id="map" viewBox="0 0 ${W} ${H}" role="application" aria-label="Mapa del mundo helénico">${baseSVG(D)}
    <g class="seas"></g><g class="slabels"></g><g class="alabels"></g><g class="z1labels"></g><g class="z2labels"></g><g class="z0labels"></g><g class="sites"></g><g class="hl"></g><g class="bedit"></g>
  </svg>
  <div class="ui tl">
    <div class="search"><input id="q" type="search" placeholder="Buscar área o lugar…" autocomplete="off" aria-label="Buscar en el mapa"><div id="qr" class="qr" hidden></div></div>
    <div class="layers"><label><input type="checkbox" id="l-rv" checked> Ríos</label><label><input type="checkbox" id="l-mt" checked> Montes</label><label><input type="checkbox" id="l-pt" checked> Lugares</label><label><input type="checkbox" id="l-lb" checked> Nombres</label></div>
    <div id="era" class="era" hidden></div>
  </div>
  <div class="ui tc"><div class="when" role="group" aria-label="Fecha">${D.per.periodos.map(p => [p.id, p.etiqueta]).map(([v, l]) => `<button type="button" data-t="${v}">${l}</button>`).join('')}</div></div>
  <div class="ui tr zoom"><b id="zl" title="Nivel de zoom">1</b><button id="zi" title="Acercar">+</button><button id="zo" title="Alejar">−</button><button id="zr" title="Vista completa">⤢</button></div>
  <div class="ui bl"><div class="scale"><span id="sbar"></span><b id="slab"></b></div>
    <div class="legend"><span><i style="background:${HELADE[0]}"></i>Hélade</span><span><i style="background:${FUERA[0]}"></i>Tierras extranjeras</span><span><i class="dm"></i>Eupolis / isla</span><span><i class="ci"></i>Asentamiento</span><span>⛰️ Monte</span><span>🌊 Río</span></div>
    <div class="offmap">${offmap.map(a => `<button data-area="${a}">✧ ${esc(D.areaInfo.get(a).nombre)}</button>`).join('')}</div>
  </div>
  <aside id="panel" class="panel" hidden></aside>
  <div id="tip" class="tip" hidden></div>
</div>
<p class="atlas-src">Costa y agua de base: <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">Natural Earth</a>. Trazados fluviales: © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a> (ODbL). Macizos: <a href="https://doi.org/10.48601/earthenv-t9k2-1407" target="_blank" rel="noopener">GMBA Mountain Inventory v2</a> (CC BY 4.0). Las extensiones son cartográficas y aproximadas; los cauces modernos no reconstruyen sus cambios antiguos. Las fronteras regionales son convencionales. Subregiones desde el nivel 3; choras, ethne, cauces y extensiones montañosas desde el nivel 4; asentamientos, cada isla del Egeo e iconos y nombres de ríos y montes, desde el nivel 5. En el nivel 1, las fechas con zonas continentales (tier 0) las muestran en lugar de las áreas; en los niveles 2 y 3, las fechas con regiones (tier 1) las muestran en lugar de las áreas.</p>`;
    const svg = main.querySelector('#map'), panel = main.querySelector('#panel'), tip = main.querySelector('#tip');
    const gSites = svg.querySelector('.sites'), gLab = svg.querySelector('.alabels'), gSeas = svg.querySelector('.seas'), gHl = svg.querySelector('.hl');
    let view = [0, 0, W, H], selArea = null, selSite = null, T = '-300';
    const gSL = svg.querySelector('.slabels');
    const OWN = { achaia: 'achaia', elis: 'elis', messenia: 'messenia', lakonia: 'esparta', arkadia: 'arkadia', argolis: 'argos', korinthia: 'corinto' };
    gSL.innerHTML = Object.entries(D.subs).map(([id, s]) => { const [x, y] = P(s.etiqueta); return `<g class="slb" data-sub="${id}" data-x="${x}" data-y="${y}"><text class="n" text-anchor="middle">${esc(s.nombre)}</text><text class="p" text-anchor="middle" dy="13"></text></g>`; }).join('');
    const per = () => T && D.per.periodos.find(p => p.id === T);
    const alive = i => { if (!T || !i.vi) return true; const y = per().anio, [a, b] = i.vi; return (a == null || a <= y) && (b == null || y <= b); };
    function applyTime() {
      const p = per();
      main.querySelectorAll('.when button').forEach(b => b.classList.toggle('on', b.dataset.t === (T || '')));
      svg.classList.toggle('timed', !!p);
      for (const [id, s] of Object.entries(D.subs)) {
        const st = p && p.subregiones[id], pw = st && D.poder[st.poder];
        svg.querySelector(`.sb[data-sub="${id}"]`).setAttribute('fill', pw ? pw.color : s.color);
        svg.querySelector(`.sbh[data-sub="${id}"]`).classList.toggle('on', !!(st && st.poder !== OWN[id]));
        const lab = gSL.querySelector(`[data-sub="${id}"] .p`);
        lab.textContent = st && st.poder !== OWN[id] && pw ? `bajo ${pw.nombre.split(' —')[0]}` : (s.capital && fold(s.capital.nombre) !== fold(s.nombre) ? s.capital.nombre : '');
      }
      const era = main.querySelector('#era');
      if (p) {
        const used = [...new Set(Object.values(p.subregiones).map(x => x.poder))].map(id => D.poder[id]).filter(Boolean);
        era.innerHTML = `<button type="button" class="ex" title="Cerrar (se reabre al pulsar la fecha)" aria-label="Cerrar">×</button><b title="Plegar o desplegar">${esc(p.etiqueta)}</b> · ${esc((D.tipo.periodos.find(x => x.id === p.periodo) || {}).nombre || '')}<p>${esc(p.resumen)}</p><div class="pw">${used.map(x => `<span><i style="background:${x.color}"></i>${esc(x.nombre)}</span>`).join('')}<span><i class="hz"></i>dominado por otro poder</span></div>`;
        era.hidden = eraClosed;
      } else era.hidden = true;
      D.sites.forEach((s, k) => { const g = gSites.querySelector(`[data-k="${k}"]`); if (g) g.classList.toggle('gone', !s.items.some(alive)); });
      const u = new URL(location.href); T ? u.searchParams.set('t', T) : u.searchParams.delete('t'); history.replaceState(null, '', u);
      apply();
      if (selSite) showSite(selSite, false); else if (selSub) showSub(selSub, false);
      else if (selZone && !BE) {
        // La zona elegida pertenece a otra fecha: saltar a la ficha de su linaje (sucede_a) en la fecha nueva.
        const z = anyZone(selZone);
        if (z && z.anio !== T) { const rel = D.I.linaje(`lugares:${selZone}`).find(i => String(i.ep) === T && anyZone(i.id)); if (rel) showZone0(rel.id); else clear(); }
      }
    }
    let selSub = null, selZone = null;
    const anyZone = id => zone0(id) || zone1(id) || zone2(id);
    const fmtY = a => a < 0 ? `${-a} a.C.` : `${a} d.C.`;
    let eraClosed = false;
    main.querySelector('#era').addEventListener('click', e => {
      const era = main.querySelector('#era');
      if (e.target.closest('.ex')) { eraClosed = true; era.hidden = true; } else if (e.target.closest('b')) era.classList.toggle('min');
    });
    main.querySelector('.when').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (!D.per.periodos.some(p => p.id === b.dataset.t)) return;
      if (BE && !borderStop()) return;
      T = b.dataset.t; eraClosed = false; applyTime();
      const lv = zlevel(W / view[2]);
      if (T && W / view[2] < zk(3) && !(D.t0[T] && lv === 1) && !(D.t1[T] && lv === 2)) fitBox(D.geo.peloponeso.bbox, 0.08);
    });

    // etiquetas de área
    gLab.innerHTML = Object.entries(D.geo).map(([id, a]) => {
      const [x, y] = P(a.etiqueta), info = D.areaInfo.get(id) || {}, rf = D.regionFicha[id];
      const gr = greekName(info, rf);
      return `<g class="al${info.grupo === 'helade' ? ' hel' : ''}" data-area="${id}" data-w="${a.bbox[2] - a.bbox[0]}" transform="translate(${x},${y})"><text class="n" text-anchor="middle">${esc(gr || info.nombre || id)}</text>${gr ? `<text class="g" text-anchor="middle" dy="14">${esc(info.nombre)}</text>` : ''}</g>`;
    }).join('');
    const gZ0 = svg.querySelector('.z0labels');
    gZ0.innerHTML = Object.entries(D.t0).map(([y, zs]) => zs.map(z => { const [x, yy] = P(z.etiqueta); return `<g class="z0l" data-t0="${y}" data-z0="${esc(z.ficha)}" data-w="${z.bbox[2] - z.bbox[0]}" data-x="${x}" data-y="${yy}"><text class="n" text-anchor="middle">${esc(z.nombre)}</text><text class="g" text-anchor="middle" dy="14">${esc(z.nombre_alt || '')}</text></g>`; }).join('')).join('');
    const gZ1 = svg.querySelector('.z1labels');
    gZ1.innerHTML = Object.entries(D.t1).map(([y, zs]) => zs.map(z => { const [x, yy] = P(z.etiqueta); return `<g class="z1l" data-t1="${y}" data-z1="${esc(z.ficha)}" data-x="${x}" data-y="${yy}"><text class="n" text-anchor="middle">${esc(z.nombre)}</text><text class="g" text-anchor="middle" dy="13">${esc(z.nombre_alt || '')}</text></g>`; }).join('')).join('');
    const zoneIn = (T0, id) => { for (const [y, zs] of Object.entries(T0)) { const z = zs.find(x => x.ficha === id); if (z) return Object.assign(z, { anio: y }); } return null; };
    const zone0 = id => zoneIn(D.t0, id), zone1 = id => zoneIn(D.t1, id), zone2 = id => zoneIn(D.t2, id);
    const gZ2 = svg.querySelector('.z2labels');
    gZ2.innerHTML = Object.entries(D.t2).map(([y, zs]) => zs.map(z => { const [x, yy] = P(z.etiqueta); return `<g class="z2l" data-t2="${y}" data-z2="${esc(z.ficha)}" data-x="${x}" data-y="${yy}"><text class="n" text-anchor="middle">${esc(z.nombre)}</text><text class="g" text-anchor="middle" dy="13">${esc(z.nombre_alt || '')}</text></g>`; }).join('')).join('');
    gSeas.innerHTML = D.seas.map(i => { const [x, y] = P(i.pt); return `<g class="sea-l" transform="translate(${x},${y})"><text text-anchor="middle">${esc(i.alt || i.n)}</text></g>`; }).join('')
      + [['Mar Egeo', [25.2, 38.9]], ['Mar Jónico', [19.2, 37.6]], ['Ponto Euxino', [34.5, 43.3]], ['Mar Mediterráneo', [18.5, 34.6]], ['Propóntide', [28.0, 40.72]], ['Mar Adriático', [16.0, 42.6]], ['Mar Tirreno', [12.0, 39.6]]]
        .map(([t, c]) => { const [x, y] = P(c); return `<g class="sea-l big" transform="translate(${x},${y})"><text text-anchor="middle">${t}</text></g>`; }).join('');
    gSites.innerHTML = D.sites.map((s, k) => {
      const [x, y] = P(s.pt), t = s.tier;
      const shape = (s.capital || s.isle) ? '<circle class="mk cap" r="5.2"/>' : s.kind === 'monte' ? '<circle class="hit" r="9"/><text class="em" text-anchor="middle" dy=".35em">⛰️</text>' : s.kind === 'rio' ? '<circle class="hit" r="9"/><text class="em" text-anchor="middle" dy=".35em">🌊</text>' : TIER_ICON[t] === 'diamond' ? '<path class="mk" d="M0 -6L6 0L0 6L-6 0Z"/>' : '<circle class="mk" r="4.6"/>';
      return `<g class="site ${t} k-${s.kind}${s.capital || s.isle ? ' capital' : ''}" data-k="${k}" transform="translate(${x},${y})" tabindex="0">${shape}<text class="sl" x="8" dy=".35em">${esc(s.label)}</text></g>`;
    }).join('');

    function unitsPerPx() { return view[2] / (svg.clientWidth || 1000); }
    function apply() {
      svg.setAttribute('viewBox', view.join(' '));
      const u = unitsPerPx(), k = W / view[2], scale = scaleBar(u);
      const lvl = zlevel(k), naturalVisible = lvl >= 4, naturalSitesVisible = lvl >= MAX_ZOOM;
      const t0on = lvl === 1 && !!(T && D.t0[T]), t1on = (lvl === 2 || lvl === 3) && !!(T && D.t1[T]);
      svg.classList.toggle('t0-on', t0on);
      const t1part = t1on && !D.t0[T], t1areas = new Set(t1part ? D.t1[T].flatMap(z => z.areas) : []);
      svg.classList.toggle('t1-on', t1on && !t1part);
      svg.querySelectorAll('.ar').forEach(p => { p.style.display = t1part && t1areas.has(p.dataset.area) ? 'none' : ''; });
      svg.classList.toggle('natural-detail', naturalVisible);
      svg.style.setProperty('--u', u);
      const placed = [], sx = x => (x - view[0]) / u, sy = y => (y - view[1]) / u;
      const fits = b => { for (const p of placed) if (!(b[2] < p[0] || b[0] > p[2] || b[3] < p[1] || b[1] > p[3])) return false; placed.push(b); return true; };
      const t2areas = new Set(lvl >= 3 && T && D.t2[T] ? D.t2[T].flatMap(z => z.areas) : []);
      const subVisible = s => k + 1e-9 >= zk(s.nivel ?? 3) && !t2areas.has(s.padre);
      svg.querySelectorAll('.z0').forEach(p => { p.style.display = t0on && p.dataset.t0 === T ? 'inline' : 'none'; });
      gZ0.querySelectorAll('.z0l').forEach(g => {
        if (!t0on || g.dataset.t0 !== T) { g.style.display = 'none'; return; }
        const x = +g.dataset.x, y = +g.dataset.y, name = g.querySelector('.n').textContent;
        g.setAttribute('transform', `translate(${x},${y}) scale(${u})`);
        const tw = Math.max(name.length, g.querySelector('.g').textContent.length) * 8.4;
        g.style.display = fits([sx(x) - tw / 2, sy(y) - 14, sx(x) + tw / 2, sy(y) + 18]) ? '' : 'none';
      });
      // Tier 1: domina el nivel 2; en el nivel 3 queda bajo las subregiones (sin nombre donde estas lo tapan).
      svg.querySelectorAll('.z1').forEach(p => { p.style.display = t1on && p.dataset.t1 === T ? 'inline' : 'none'; });
      const subAreas = new Set([...Object.values(D.subs).filter(subVisible).map(s => s.padre), ...t2areas]);
      svg.querySelectorAll('.z2').forEach(p => { p.style.display = t2areas.size && p.dataset.t2 === T ? 'inline' : 'none'; });
      gZ2.querySelectorAll('.z2l').forEach(g => {
        if (!t2areas.size || g.dataset.t2 !== T) { g.style.display = 'none'; return; }
        const x = +g.dataset.x, y = +g.dataset.y, name = g.querySelector('.n').textContent;
        g.setAttribute('transform', `translate(${x},${y}) scale(${u})`);
        const tw = Math.max(name.length * 8, g.querySelector('.g').textContent.length * 6.6);
        g.style.display = fits([sx(x) - tw / 2, sy(y) - 13, sx(x) + tw / 2, sy(y) + 16]) ? '' : 'none';
      });
      gZ1.querySelectorAll('.z1l').forEach(g => {
        const z = t1on && g.dataset.t1 === T && zone1(g.dataset.z1);
        if (!z || (lvl === 3 && z.areas.some(a => subAreas.has(a)))) { g.style.display = 'none'; return; }
        const x = +g.dataset.x, y = +g.dataset.y, name = g.querySelector('.n').textContent;
        g.setAttribute('transform', `translate(${x},${y}) scale(${u})`);
        const tw = Math.max(name.length * 8, g.querySelector('.g').textContent.length * 6.6);
        g.style.display = fits([sx(x) - tw / 2, sy(y) - 13, sx(x) + tw / 2, sy(y) + 16]) ? '' : 'none';
      });
      svg.querySelectorAll('.al').forEach(g => {
        if (t0on || (t1on && (!t1part || t1areas.has(g.dataset.area)))) { g.style.display = 'none'; return; }
        const mine = Object.values(D.subs).filter(s => s.padre === g.dataset.area);
        if ((mine.length && k >= zk(Math.min(...mine.map(s => s.nivel ?? 3)))) || t2areas.has(g.dataset.area)) { g.style.display = 'none'; return; }
        const [x, y] = g.getAttribute('transform').match(/translate\(([^)]+)\)/)[1].split(',').map(Number);
        const wpx = (+g.dataset.w * COS * U) / u, name = g.querySelector('.n').textContent;
        g.setAttribute('transform', `translate(${x},${y}) scale(${u})`);
        const tw = name.length * 8.4, show = wpx > name.length * 7.2 && fits([sx(x) - tw / 2, sy(y) - 14, sx(x) + tw / 2, sy(y) + (g.querySelector('.g') ? 18 : 4)]);
        g.style.display = show ? '' : 'none';
        g.classList.toggle('dim', k >= zk(5));
      });
      gSeas.querySelectorAll('.sea-l').forEach(g => {
        const m = g.getAttribute('transform').match(/translate\(([^)]+)\)/)[1].split(',').map(Number);
        g.setAttribute('transform', `translate(${m[0]},${m[1]}) scale(${u})`);
        const vis = g.classList.contains('big') ? k < zk(3) : k >= zk(2), tw = g.textContent.length * 7.5;
        g.style.display = vis && fits([sx(m[0]) - tw / 2, sy(m[1]) - 12, sx(m[0]) + tw / 2, sy(m[1]) + 4]) ? '' : 'none';
      });
      const anySub = Object.values(D.subs).some(subVisible) || t2areas.size > 0;
      svg.classList.toggle('subs-on', anySub);
      svg.querySelectorAll('.sb, .sbh').forEach(p => { const sub = D.subs[p.dataset.sub]; p.style.display = sub && subVisible(sub) ? '' : 'none'; });
      gSL.querySelectorAll('.slb').forEach(g => {
        const sub = D.subs[g.dataset.sub];
        const x = +g.dataset.x, y = +g.dataset.y, name = g.querySelector('.n').textContent;
        g.setAttribute('transform', `translate(${x},${y}) scale(${u})`);
        const tw = Math.max(name.length * 8.6, g.querySelector('.p').textContent.length * 6.4);
        g.style.display = sub && subVisible(sub) && fits([sx(x) - tw / 2, sy(y) - 13, sx(x) + tw / 2, sy(y) + 16]) ? '' : 'none';
      });
      const nodes = [...gSites.querySelectorAll('.site')].map(g => [g, D.sites[+g.dataset.k]]);
      for (const [g, s] of nodes) {
        const [x, y] = P(s.pt);
        g.setAttribute('transform', `translate(${x},${y}) scale(${u})`);
        const natural = s.kind === 'monte' || s.kind === 'rio';
        g.style.display = (!s.isleBody && (natural ? naturalSitesVisible : (s.capital || (s.isle ? subVisible(s.isle) : k >= zk(siteLevel(s)))))) && !g.classList.contains('gone') ? '' : 'none';
        g.classList.remove('lab');
      }
      if (!svg.classList.contains('no-lb')) {
        nodes.filter(([g, s]) => g.style.display !== 'none' && (g.classList.contains('on') || s.capital || k >= zk(siteLevel(s))))
          .sort((a, b) => (b[0].classList.contains('on') - a[0].classList.contains('on')) || a[1].rank - b[1].rank)
          .forEach(([g, s]) => { const [x, y] = P(s.pt), X = sx(x), Y = sy(y); if (X < -50 || Y < -20 || X > svg.clientWidth + 50 || Y > svg.clientHeight + 20) return; if (fits([X - 6, Y - 8, X + 10 + s.label.length * 6.6, Y + 8])) g.classList.add('lab'); });
      }
      svg.classList.toggle('z-hi', k >= zk(4));

      const pl = gHl.querySelector('.pulse'); if (pl) pl.setAttribute('transform', pl.getAttribute('transform').replace(/scale\([^)]*\)/, `scale(${u})`));
      // escala
      main.querySelector('#sbar').style.width = `${scale.pixels}px`; main.querySelector('#slab').textContent = `${scale.km} km`;
      const badge = main.querySelector('#zl');
      badge.textContent = lvl; badge.title = `Nivel ${lvl} · ${ZL[lvl - 1].que}`;
      main.querySelector('#zi').disabled = k + 1e-9 >= zk(MAX_ZOOM); main.querySelector('#zo').disabled = k <= 1.001;
      borderHandles();
    }
    let viewFrame = 0, wheelTarget = null, wheelVelocity = 0, wheelTime = 0;
    let wheelDelta = 0, wheelLast = 0, wheelDirection = 0, wheelAnchor = null;
    function stopViewMotion() {
      if (viewFrame) cancelAnimationFrame(viewFrame);
      viewFrame = 0; wheelTarget = null; wheelVelocity = 0;
      wheelDelta = 0; wheelDirection = 0; wheelAnchor = null;
    }
    function constrainView(v) {
      const asp = (svg.clientHeight || 600) / (svg.clientWidth || 1000);
      let w = Math.min(W, Math.max(W / zk(MAX_ZOOM), v[2])), h = w * asp;
      if (h > H) { h = H; w = h / asp; }
      const cx = v[0] + v[2] / 2, cy = v[1] + v[3] / 2;
      let x = cx - w / 2, y = cy - h / 2;
      x = Math.max(Math.min(x, W - w), Math.min(0, W - w)); y = Math.max(Math.min(y, H - h), Math.min(0, H - h));
      return [x, y, w, h];
    }
    function setView(v, animate) {
      stopViewMotion();
      const target = constrainView(v);
      if (!animate) { view = target; apply(); return; }
      const from = [...view], t0 = performance.now(), duration = 420;
      const step = t => {
        const p = Math.min(1, (t - t0) / duration), e = p * p * (3 - 2 * p);
        const w = Math.exp(Math.log(from[2]) + Math.log(target[2] / from[2]) * e);
        const h = w * target[3] / target[2];
        const cx = from[0] + from[2] / 2 + (target[0] + target[2] / 2 - from[0] - from[2] / 2) * e;
        const cy = from[1] + from[3] / 2 + (target[1] + target[3] / 2 - from[1] - from[3] / 2) * e;
        view = p === 1 ? target : constrainView([cx - w / 2, cy - h / 2, w, h]); apply();
        if (p < 1) viewFrame = requestAnimationFrame(step);
        else viewFrame = 0;
      };
      viewFrame = requestAnimationFrame(step);
    }
    // el panel tapa parte del mapa: desplazar el encuadre para que el objetivo quede a la vista
    const offset = vw => { const cw = svg.clientWidth || 1000, ch = svg.clientHeight || 600, s = vw / cw;
      return innerWidth <= 760 ? [0, ch * 0.24 * s] : [Math.min(380, cw * 0.3) / 2 * s, 0]; };
    const fitBox = ([a, b, c, d], pad = 0.18, animate = true) => {
      const [x0, y0] = P([a, d]), [x1, y1] = P([c, b]), cw = svg.clientWidth || 1000, ch = svg.clientHeight || 600;
      const free = innerWidth <= 760 ? [cw, ch * 0.5] : [cw - Math.min(380, cw * 0.3), ch];
      const vw = Math.max((x1 - x0) * (1 + pad * 2) * cw / free[0], (y1 - y0) * (1 + pad * 2) * cw / free[1]), asp = ch / cw, [ox, oy] = offset(vw);
      setView([(x0 + x1) / 2 - vw / 2 + ox, (y0 + y1) / 2 - vw * asp / 2 + oy, vw, vw * asp], animate);
    };
    const flyTo = (pt, k = 14) => { const [x, y] = P(pt), w = W / k, asp = svg.clientHeight / svg.clientWidth, [ox, oy] = offset(w); setView([x - w / 2 + ox, y - w * asp / 2 + oy, w, w * asp], true); };

    // ---------- panel ----------
    const editBtn = id => id ? `<button type="button" class="btn ghost edit-only" data-edit="${esc(id)}">✎ Editar</button>` : '';
    async function editFicha(id) {
      if (!window.HEL_EDIT) return;
      try { window.HEL_EDIT.edit('lugares', id, await window.HEL.getJSON(`data/lugares/${id}.json`)); } catch (e) { alert(e.message); }
    }
    // Componentes: grupos de «contiene» y, además, los hijos que declaran pertenecer a la ficha.
    async function fillParts(id) {
      const box = panel.querySelector('.parts'); if (!box) return;
      let rec = {};
      try { rec = await window.HEL.getJSON(`data/lugares/${id}.json`); } catch (e) { /* sin ficha */ }
      if (panel.querySelector('.parts') !== box) return;
      const name = x => (byId(x.id) || {}).n || x.nombre || x.id, alt = x => (byId(x.id) || {}).alt || '';
      const item = x => `<li><button type="button" class="pl" ${zone0(x.id) || zone1(x.id) || zone2(x.id) ? 'data-zone' : 'data-go'}="${esc(x.id)}">${esc(name(x))}${alt(x) ? ` <span class="muted">${esc(alt(x))}</span>` : ''}</button></li>`;
      const groups = (rec.contiene || []).map(g => ({ grupo: g.grupo, nota: g.nota, lugares: (g.lugares || []).filter(x => x.id) }));
      const listed = new Set(groups.flatMap(g => g.lugares.map(x => x.id)));
      const extra = D.lugares.filter(i => (i.pe || []).includes(`lugares:${id}`) && !listed.has(i.id)).map(i => ({ id: i.id }));
      if (extra.length) groups.push({ grupo: groups.length ? 'Otros' : null, lugares: extra });
      box.innerHTML = groups.length
        ? `<h3>Componentes</h3>${groups.map(g => `${g.grupo ? `<p class="pg">${esc(g.grupo)}${g.nota ? ` <span class="muted">— ${esc(g.nota)}</span>` : ''}</p>` : ''}<ul>${g.lugares.map(item).join('')}</ul>`).join('')}`
        : `<h3>Componentes</h3><p class="muted">Sin componentes todavía.<span class="edit-only"> Añádelos con ✎ Editar → «Contiene».</span></p>`;
    }
    const listLink = (i, extra = '') => `<li><button type="button" class="pl" data-go="${esc(i.id)}">${esc(i.n)}${i.alt ? ` <span class="muted">${esc(i.alt)}</span>` : ''}</button>${extra}</li>`;
    function showArea(id, move = true) {
      selArea = id; selSite = null; selSub = null; selZone = null; svg.querySelectorAll('.sb').forEach(p => p.classList.remove('sel'));
      svg.querySelectorAll('.feature.selected').forEach(p => p.classList.remove('selected'));
      const info = D.areaInfo.get(id) || { nombre: id }, rf = D.regionFicha[id], geo = D.geo[id];
      const inArea = D.lugares.filter(i => (i.ar || []).includes(id));
      const by = es => inArea.filter(i => i.es === es && (i.pt || i.ptx));
      const choras = [...by('chora'), ...by('ethnos')], poleis = by('polis-kome');
      const counts = D.tipo.escalas.map(e => [e, inArea.filter(i => i.es === e.id).length]).filter(([, n]) => n);
      panel.innerHTML = `<button class="x" aria-label="Cerrar">×</button>
<p class="eyebrow"><span class="sw" style="background:${D.color[id]}"></span>${esc(info.grupo === 'helade' ? 'Hélade' : info.grupo === 'mitica' ? 'Geografía mítica' : 'Tierra extranjera')}</p>
<h2>${esc(greekName(info, rf) || info.nombre)}</h2>${greekName(info, rf) ? `<p class="gr">${esc(info.nombre)}</p>` : ''}
<p>${esc(info.descripcion || '')}</p>
<div class="acts">${rf ? `<a class="btn" href="${ficha('lugares', rf.id)}">Ficha de la región ↗</a>${editBtn(rf.id)}` : ''}<a class="btn ghost" href="lugares.html?area=${encodeURIComponent(id)}">${inArea.length} lugares en la lista ↗</a></div>
${counts.length ? `<div class="tiers">${counts.map(([e, n]) => `<span><b>${n}</b> ${esc(e.nombre)}</span>`).join('')}</div>` : ''}
${choras.length ? `<h3>Choras y ethne</h3><ul>${choras.map(i => listLink(i)).join('')}</ul>` : ''}
${poleis.length ? `<h3>Poleis y komai</h3><ul>${poleis.sort((a, b) => fold(a.n).localeCompare(fold(b.n))).map(i => listLink(i)).join('')}</ul>` : ''}
${!geo ? '<p class="muted">Sin localización terrestre: no aparece sobre el mapa.</p>' : ''}`;
      panel.hidden = false;
      svg.querySelectorAll('.ar').forEach(p => p.classList.toggle('sel', p.dataset.area === id));
      svg.classList.add('has-sel');
      gHl.innerHTML = '';
      if (move && geo) fitBox(geo.bbox);
      url({ area: id });
    }
    function showZone0(id) {
      const z = zone0(id) || zone1(id) || zone2(id); if (!z) return;
      const t1 = !zone0(id), lv = zone0(id) ? 0 : zone1(id) ? 1 : 2;
      selArea = selSite = selSub = null; selZone = id;
      const lin = D.I.linaje(`lugares:${id}`).filter(x => x.id !== id);
      const i = byId(id) || {}, y = z.anio, p = D.per.periodos.find(x => x.id === y);
      const up = t1 && z.padre && (zone0(z.padre) || zone1(z.padre));
      const row = (k, v, n) => v ? `<p class="kv"><b>${k}</b> ${esc(v)}${n ? `<br><span class="muted small">${esc(n)}</span>` : ''}</p>` : '';
      panel.innerHTML = `<button class="x" aria-label="Cerrar">×</button>
<p class="eyebrow"><span class="sw" style="background:${z.color}"></span>${t1 ? (tn => z.tipos[0] && fold(z.tipos[0]).includes(fold(tn)) ? esc(z.tipos[0]) : `${tn}${z.tipos[0] ? ` (${esc(z.tipos[0])})` : ''}`)(lv === 2 ? tierName(D, (byId(id) || {}).es || 'ethnos') : 'Región') : 'Zona continental'} · ${esc(p ? p.etiqueta : y)}${up ? ` · <button type="button" class="lnk" data-zone="${esc(up.ficha)}">${esc(up.nombre)}</button>` : ''}</p>
<h2>${esc(z.nombre)}</h2>${z.nombre_griego ? `<p class="gr">${esc(z.nombre_griego)}</p>` : ''}
${row('Nombre tradicional', z.nombre_alt)}${row('Griego transliterado', z.nombre)}${row('Griego', z.nombre_griego)}${row('Endónimo', z.endonimo || '—', z.endonimo_nota)}
${i.r ? `<p>${esc(i.r)}</p>` : ''}
${lin.length ? `<p class="kv"><b>Otras fechas</b> ${lin.map(x => `<button type="button" class="lnk" data-rel="${esc(x.id)}" data-y="${x.ep}">${fmtY(x.ep)} · ${esc(x.n)}</button>`).join(' &nbsp; ')}</p>` : ''}
<div class="acts"><a class="btn" href="${ficha('lugares', id)}">Abrir ficha ↗</a>${editBtn(id)}<button type="button" class="btn ghost edit-only" data-border="${esc(id)}">⬡ Editar frontera</button></div>
${z.cobertura != null ? `<p class="edit-only cob${z.cobertura < 0.995 ? ' warn' : ''}">Sus subdivisiones cubren el ${(Math.floor(z.cobertura * 1000) / 10).toFixed(1)} %.${(z.huecos || []).length ? ` Huecos: ${z.huecos.map((h, n) => `<button type="button" class="lnk" data-fly="${h[0]},${h[1]}">${n + 1}</button>`).join(' ')}` : ''}</p>` : ''}
<div class="parts"></div>`;
      panel.hidden = false;
      svg.classList.add('has-sel');
      svg.querySelectorAll('.z0').forEach(n => n.classList.toggle('sel', n.dataset.z0 === id));
      svg.querySelectorAll('.z1').forEach(n => n.classList.toggle('sel', n.dataset.z1 === id));
      svg.querySelectorAll('.z2').forEach(n => n.classList.toggle('sel', n.dataset.z2 === id));
      fillParts(id);
      gHl.innerHTML = '';
      url({ lugar: id });
    }
    const inRing = ([x, y], r) => { let c = false; for (let a = 0, b = r.length - 1; a < r.length; b = a++) { const [xi, yi] = r[a], [xj, yj] = r[b]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
    const inSub = (pt, s) => s.poligonos.some(p => inRing(pt, p[0]) && !p.slice(1).some(h => inRing(pt, h)));
    function showSub(id, move = true) {
      const s = D.subs[id]; if (!s) return;
      selSub = id; selSite = null; selArea = s.padre;
      svg.querySelectorAll('.feature.selected').forEach(p => p.classList.remove('selected'));
      const here = D.lugares.filter(i => i.pt && !i.ph && ['chora', 'ethnos', 'nesos', 'polis-kome'].includes(i.es) && inSub(i.pt, s) && alive(i));
      const pol = here.filter(i => i.es === 'polis-kome').sort((a, b) => fold(a.n).localeCompare(fold(b.n)));
      const cho = here.filter(i => i.es !== 'polis-kome');
      const fi = s.ficha && D.lugares.find(i => i.id === s.ficha);
      const rows = D.per.periodos.map(p => { const st = p.subregiones[id] || {}, pw = D.poder[st.poder] || {}; return `<li class="${p.id === T ? 'on' : ''}"><button type="button" class="tt" data-t="${p.id}">${esc(p.etiqueta)}</button><span><i style="background:${pw.color || '#ccc'}"></i><b>${esc(pw.nombre || '—')}</b>${st.nota ? ` — ${esc(st.nota)}` : ''}</span></li>`; }).join('');
      panel.innerHTML = `<button class="x" aria-label="Cerrar">×</button>
<p class="eyebrow"><span class="sw" style="background:${s.color}"></span>Subregión · <button type="button" class="lnk" data-area="${s.padre}">${esc((D.areaInfo.get(s.padre) || {}).nombre || s.padre)}</button></p>
<h2>${esc(s.nombre)}</h2>${s.nombre_es ? `<p class="gr">${esc(s.nombre_es)}</p>` : ''}${s.nota ? `<p>${esc(s.nota)}</p>` : ''}
${fi ? `<div class="acts"><a class="btn" href="${ficha('lugares', fi.id)}">Ficha ↗</a>${editBtn(fi.id)}</div>` : ''}
<h3>A través del tiempo</h3><ul class="tl">${rows}</ul>
${cho.length ? `<h3>Choras, montes y ríos</h3><ul>${cho.map(i => listLink(i)).join('')}</ul>` : ''}
${pol.length ? `<h3>Poleis y komai${T ? ` (${esc(per().etiqueta)})` : ''}</h3><ul>${pol.map(i => listLink(i)).join('')}</ul>` : ''}`;
      panel.hidden = false;
      svg.classList.add('has-sel');
      svg.querySelectorAll('.ar').forEach(p => p.classList.toggle('sel', p.dataset.area === s.padre));
      svg.querySelectorAll('.sb').forEach(p => p.classList.toggle('sel', p.dataset.sub === id));
      gHl.innerHTML = '';
      if (move) fitBox(s.bbox, 0.12);
      url({ sub: id });
    }
    function showSite(i, move = true) {
      selSite = i;
      const geometry = D.physicalByPlace.get(i.id);
      const pt = geometry ? geometry.punto : i.pt || i.ptx, a = areaOf(i), info = D.areaInfo.get(a);
      const site = D.sites.find(s => s.items.includes(i));
      const fo = (i.fo || []).map(f => (D.tipo.formas.find(x => x.id === f) || {}).nombre || f);
      const fu = (i.fu || []).map(f => (D.tipo.funciones.find(x => x.id === f) || {}).nombre || f);
      const near = pt ? D.sites.filter(s => s !== site && Math.hypot((s.pt[0] - pt[0]) * COS, s.pt[1] - pt[1]) < 0.35).slice(0, 12) : [];
      panel.innerHTML = `<button class="x" aria-label="Cerrar">×</button>
<p class="eyebrow">${esc(tierName(D, i.es))}${info ? ` · <button type="button" class="lnk" data-area="${a}">${esc(info.nombre)}</button>` : ''}</p>
<h2>${esc(i.n)}</h2>${i.alt ? `<p class="gr">${esc(i.alt)}</p>` : ''}
${i.r ? `<p>${esc(i.r)}</p>` : ''}
${fo.length ? `<p class="kv"><b>Forma</b> ${esc(fo.join(' → '))}</p>` : ''}${fu.length ? `<p class="kv"><b>Función</b> ${esc(fu.join(', '))}</p>` : ''}
<div class="acts"><a class="btn" href="${ficha('lugares', i.id)}">Abrir ficha ↗</a>${editBtn(i.id)}</div>
${geometry ? `<p class="small">${geometry.tipo === 'rio' ? 'Trazado del cauce' : 'Extensión del macizo'} · <a href="${esc(D.fisico.fuentes[geometry.fuente].url)}" target="_blank" rel="noopener">${esc(D.fisico.fuentes[geometry.fuente].nombre)}</a>. ${esc(geometry.nota || '')}</p>` : naturalKind(i) ? '<p class="muted small">Extensión pendiente de documentar; se muestra el punto de referencia.</p>' : ''}
${site && site.items.length > 1 ? `<h3>En este mismo punto</h3><ul>${site.items.filter(x => x !== i).map(x => listLink(x)).join('')}</ul>` : ''}
${near.length ? `<h3>Cerca</h3><ul>${near.map(s => listLink(s.main)).join('')}</ul>` : ''}
<p class="muted small">${pt ? `${pt[1].toFixed(3)}° N, ${pt[0].toFixed(3)}° E · ubicación aproximada` : 'Sin coordenadas'}</p>`;
      panel.hidden = false; selSub = null; selZone = null;
      svg.querySelectorAll('.sb').forEach(p => p.classList.remove('sel'));
      svg.querySelectorAll('.ar').forEach(p => p.classList.toggle('sel', p.dataset.area === a));
      svg.classList.add('has-sel');
      svg.querySelectorAll('.feature').forEach(p => p.classList.toggle('selected', !!geometry && p.dataset.feature === geometry.id));
      if (pt) { const [x, y] = P(pt); gHl.innerHTML = `<g class="pulse" transform="translate(${x},${y})"><circle r="1"/></g>`; gHl.firstChild.setAttribute('transform', `translate(${x},${y}) scale(${unitsPerPx()})`); }
      gSites.querySelectorAll('.site').forEach(g => g.classList.toggle('on', D.sites[+g.dataset.k] === site)); apply();
      if (move && geometry) fitBox(geometry.bbox, 0.12);
      else if (move && pt) flyTo(pt, Math.max(W / view[2], zk(i.es === 'chora' || i.es === 'ethnos' ? 4 : 5) * 1.02));
      url({ lugar: i.id });
    }
    function clear() {
      if (BE && !borderStop()) return;
      panel.hidden = true; selArea = selSite = selSub = selZone = null; gHl.innerHTML = '';
      svg.querySelectorAll('.sb.sel').forEach(n => n.classList.remove('sel'));
      svg.querySelectorAll('.feature.selected').forEach(n => n.classList.remove('selected'));
      svg.classList.remove('has-sel'); svg.querySelectorAll('.ar.sel,.z0.sel,.z1.sel,.z2.sel,.site.on').forEach(n => n.classList.remove('sel', 'on'));
      url({});
    }
    function url(q) { const u = new URL(location.href); ['area', 'lugar', 'region', 'sub'].forEach(k => u.searchParams.delete(k)); Object.entries(q).forEach(([k, v]) => u.searchParams.set(k, v)); history.replaceState(null, '', u); }
    const byId = id => D.lugares.find(i => i.id === id);
    panel.addEventListener('click', e => {
      if (e.target.closest('.x')) return clear();
      if (e.target.closest('[data-bsave]')) return borderSave();
      if (e.target.closest('[data-bcancel]')) { const id = BE && BE.sel; if (borderStop()) showZone0(id); return; }
      const bd = e.target.closest('[data-border]'); if (bd) return borderStart(bd.dataset.border);
      const fl = e.target.closest('[data-fly]'); if (fl) return flyTo(fl.dataset.fly.split(',').map(Number), zk(4));
      const ed = e.target.closest('[data-edit]'); if (ed) return editFicha(ed.dataset.edit);
      const rl = e.target.closest('[data-rel]'); if (rl) { const y = rl.dataset.y, rid = rl.dataset.rel; if (BE && !borderStop()) return; if (D.per.periodos.some(p => p.id === y) && anyZone(rid)) { T = y; eraClosed = false; applyTime(); return showZone0(rid); } location.href = ficha('lugares', rid); return; }
      const tt = e.target.closest('.tt'); if (tt) { T = tt.dataset.t; applyTime(); return; }
      const zn = e.target.closest('[data-zone]'); if (zn) { const id = zn.dataset.zone, l = zlevel(W / view[2]), z1 = zone1(id), z2 = zone2(id);
        if (z2 && l < 3) fitBox(z2.bbox, 0.25); else if (z1 && l === 1) flyTo(z1.etiqueta, zk(2) * 1.05); else if (z1 && l > 3) flyTo(z1.etiqueta, zk(2) * 1.05); else if (!z1 && !z2 && l > 1) setView([0, 0, W, H], true);
        return showZone0(id); }
      const go = e.target.closest('[data-go]'); if (go) { const i = byId(go.dataset.go); if (i && (i.pt || i.ptx || D.physicalByPlace.has(i.id))) showSite(i); else if (i) location.href = ficha('lugares', i.id); }
      const ar = e.target.closest('[data-area]'); if (ar) showArea(ar.dataset.area);
    });
    main.querySelector('.offmap').addEventListener('click', e => { const b = e.target.closest('[data-area]'); if (b) showArea(b.dataset.area, false); });

    // ---------- editor de fronteras (modo edición) ----------
    // Edita los contornos de data/mapa/zonas.json del mismo tier y fecha. Los vértices con las mismas coordenadas
    // en varios contornos se mueven juntos (frontera compartida); soltar un vértice sobre otro lo une a él.
    const unP = ([x, y]) => [x / (COS * U) + LON0, LAT0 - y / U];
    const gB = svg.querySelector('.bedit');
    const ringsOf = z => Array.isArray(z.poligono[0][0]) ? z.poligono : [z.poligono];
    const samePt = (a, b) => Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6;
    const r3 = v => Math.round(v * 1000) / 1000;
    const TIERKEY = { tier0: 'Tier 0', tier1: 'Tier 1', tier2: 'Tier 2' };
    let BE = null;
    const beGeo = id => (BE.key === 'tier0' ? zone0 : BE.key === 'tier1' ? zone1 : zone2)(id);
    const beCur = () => BE.list.find(z => z.ficha === BE.sel);
    const bePath = z => ringsOf(z).map(ring).join('');
    function beSelect(id) {
      BE.sel = id;
      const me = beGeo(id); BE.padre = me && me.padre || null;
      const par = BE.padre && (zone0(BE.padre) || zone1(BE.padre));
      BE.sib = BE.list.filter(z => { const g = beGeo(z.ficha); return ((g && g.padre) || null) === BE.padre; });
      gB.querySelector('#bclip path').setAttribute('d', par ? par.poligonos.map(polyPath).join('') : D.tierra.poligonos.map(polyPath).join(''));
      borderPanel(); borderShapes();
    }
    function borderShapes() {
      const z = beCur();
      gB.querySelector('.bfills').innerHTML = [...BE.sib].reverse().map(o => `<path class="bf${o === z ? ' on' : ''}" fill="${o.color || '#d8c8a8'}" d="${bePath(o)}"/>`).join('');
      gB.querySelector('.blines').innerHTML = BE.sib.filter(o => o !== z).map(o => `<path class="bo" d="${bePath(o)}"/>`).join('') + `<path class="bo on" d="${bePath(z)}"/>`;
      borderHandles();
    }
    function borderHandles() {
      if (!BE) return;
      const z = beCur(), R = 5.5 * unitsPerPx();
      let mid = '', vs = '';
      ringsOf(z).forEach((rg, ri) => rg.forEach((c, i) => {
        const [x, y] = P(c), [x2, y2] = P(rg[(i + 1) % rg.length]);
        mid += `<circle class="bm" data-r="${ri}" data-i="${i}" cx="${(x + x2) / 2}" cy="${(y + y2) / 2}" r="${R * .6}"/>`;
        const shared = BE.list.some(o => o !== z && ringsOf(o).some(r => r.some(q => samePt(q, c))));
        vs += `<circle class="bv${shared ? ' sh' : ''}" data-r="${ri}" data-i="${i}" cx="${x}" cy="${y}" r="${R}"/>`;
      }));
      gB.querySelector('.bhandles').innerHTML = mid + vs;
    }
    function borderPanel() {
      const g = beGeo(BE.sel) || {}, p = D.per.periodos.find(x => x.id === BE.year), n = BE.dirty.size;
      panel.innerHTML = `<button class="x" aria-label="Cerrar">×</button>
<p class="eyebrow">Editar frontera · ${TIERKEY[BE.key]} · ${esc(p ? p.etiqueta : BE.year)}</p>
<h2>${esc(g.nombre || BE.sel)}</h2>
<p>Arrastra un vértice para moverlo. Los vértices rellenos son compartidos con otra región y se mueven juntos; con <b>Alt</b> se separa solo el de esta.</p>
<p>Suelta un vértice sobre el de otra región para unirlos. Pulsa un punto pequeño para añadir un vértice; doble clic en un vértice lo borra.</p>
<p>Pulsa otra región del mismo nivel para editar la suya. Si dos contornos se solapan, gana el que va antes en la lista.</p>
<p class="muted" id="bstat">${n ? `${n} contorno${n > 1 ? 's' : ''} con cambios sin guardar.` : 'Sin cambios.'}</p>
<div class="acts"><button type="button" class="btn" data-bsave${n ? '' : ' disabled'}>Guardar</button><button type="button" class="btn ghost" data-bcancel>Salir</button></div>`;
      panel.hidden = false;
    }
    async function borderStart(id) {
      if (!window.HEL_EDIT) return;
      let zonas;
      try { zonas = await window.HEL_EDIT.readFile('data/mapa/zonas.json'); } catch (e) { return alert(e.message); }
      let key = null, year = null;
      for (const k of Object.keys(TIERKEY)) for (const [y, zs] of Object.entries(zonas[k] || {})) if (Array.isArray(zs) && zs.some(z => z.ficha === id)) { key = k; year = y; }
      if (!key) return alert('Esta ficha no tiene contorno en data/mapa/zonas.json.');
      // Un contorno «igual_que» se edita sobre una copia del original; al guardarlo pasa a tener polígono propio.
      const todos = new Map(Object.keys(TIERKEY).flatMap(k => Object.values(zonas[k] || {}).filter(Array.isArray).flat()).map(z => [z.ficha, z]));
      for (const z of zonas[key][year]) { let c = z, n = 0; while (c && !c.poligono && n++ < 8) c = todos.get(c.igual_que); if (!z.poligono && c && c.poligono) { z.poligono = JSON.parse(JSON.stringify(c.poligono)); for (const k of ['color', 'tipo', 'toma_islas', 'corta_islas']) if (!(k in z) && k in c) z[k] = c[k]; } }
      BE = { key, year, list: zonas[key][year].filter(z => z.poligono), dirty: new Set(), busy: false };
      gB.innerHTML = '<clipPath id="bclip"><path clip-rule="evenodd"/></clipPath><g class="bfills" clip-path="url(#bclip)"></g><g class="blines"></g><g class="bhandles"></g>';
      svg.classList.add('bediting');
      beSelect(id);
      const g0 = beGeo(id); if (g0) fitBox(g0.bbox, 0.3);
    }
    function borderStop() {
      if (BE && BE.dirty.size && !confirm('Hay cambios de frontera sin guardar. ¿Salir sin guardarlos?')) return false;
      BE = null; gB.innerHTML = ''; svg.classList.remove('bediting');
      return true;
    }
    async function borderSave() {
      const stat = panel.querySelector('#bstat'), ids = [...BE.dirty];
      try {
        stat.textContent = 'Guardando…';
        const latest = await window.HEL_EDIT.readFile('data/mapa/zonas.json'), lst = (latest[BE.key] || {})[BE.year] || [];
        for (const id of ids) { const src = BE.list.find(z => z.ficha === id), dst = lst.find(z => z.ficha === id); if (src && dst) { for (const k of ['color', 'tipo', 'toma_islas', 'corta_islas']) if (dst.igual_que && !(k in dst) && k in src) dst[k] = src[k]; dst.poligono = src.poligono; delete dst.igual_que; } }
        const names = ids.map(id => (beGeo(id) || {}).nombre || id);
        await window.HEL_EDIT.saveFile('data/mapa/zonas.json', JSON.stringify(latest, null, 1) + '\n', `Frontera: ${names.slice(0, 4).join(', ')}${names.length > 4 ? '…' : ''}`);
        BE.dirty.clear(); borderPanel();
        panel.querySelector('#bstat').textContent = 'Guardado. GitHub regenera las siluetas en uno o dos minutos; recarga entonces la página.';
      } catch (e) { stat.textContent = `No se pudo guardar: ${e.message}`; }
    }
    function borderPick(e) {
      const pt = unP(toSvg(e.clientX, e.clientY));
      const hit = BE.sib.find(z => ringsOf(z).some(r => inRing(pt, r))) || BE.list.find(z => ringsOf(z).some(r => inRing(pt, r)));
      if (hit && hit.ficha !== BE.sel) beSelect(hit.ficha);
    }
    gB.addEventListener('pointerdown', e => {
      const h = e.target.closest('.bv,.bm'); if (!h || !BE || e.button > 0) return;
      e.stopPropagation(); e.preventDefault();
      const rg = ringsOf(beCur())[+h.dataset.r]; let i = +h.dataset.i;
      if (h.classList.contains('bm')) {
        const a = rg[i], b = rg[(i + 1) % rg.length], m = [r3((a[0] + b[0]) / 2), r3((a[1] + b[1]) / 2)];
        for (const o of BE.list) for (const r of ringsOf(o)) for (let j = 0; j < r.length; j++) {
          const p = r[j], q = r[(j + 1) % r.length];
          if ((samePt(p, a) && samePt(q, b)) || (samePt(p, b) && samePt(q, a))) { r.splice(j + 1, 0, [...m]); BE.dirty.add(o.ficha); break; }
        }
        i = rg.findIndex(p => samePt(p, m));
      }
      const c0 = [...rg[i]], grp = [];
      if (e.altKey) { grp.push(rg[i]); BE.dirty.add(BE.sel); }
      else for (const o of BE.list) for (const r of ringsOf(o)) for (const q of r) if (samePt(q, c0)) { grp.push(q); BE.dirty.add(o.ficha); }
      BE.busy = true;
      const move = ev => { const [lon, lat] = unP(toSvg(ev.clientX, ev.clientY)); grp.forEach(q => { q[0] = r3(lon); q[1] = r3(lat); }); borderShapes(); };
      const end = ev => {
        window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end); window.removeEventListener('pointercancel', end);
        const here = P(grp[0]), lim = 9 * unitsPerPx(); let best = null, bd = lim;
        for (const o of BE.list) for (const r of ringsOf(o)) for (const q of r) { if (grp.includes(q)) continue; const [x, y] = P(q), d = Math.hypot(x - here[0], y - here[1]); if (d < bd) { bd = d; best = q; } }
        if (best) grp.forEach(q => { q[0] = best[0]; q[1] = best[1]; });
        borderShapes(); borderPanel();
        setTimeout(() => { if (BE) BE.busy = false; }, 0);
      };
      window.addEventListener('pointermove', move); window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end);
    });
    gB.addEventListener('dblclick', e => {
      const h = e.target.closest('.bv'); if (!h || !BE) return;
      e.stopPropagation(); e.preventDefault();
      const c = [...ringsOf(beCur())[+h.dataset.r][+h.dataset.i]];
      for (const o of BE.list) for (const r of ringsOf(o)) { const j = r.findIndex(q => samePt(q, c)); if (j >= 0 && r.length > 3) { r.splice(j, 1); BE.dirty.add(o.ficha); } }
      borderShapes(); borderPanel();
    });

    // ---------- interacción en el mapa ----------
    let drag = null, moved = false, pressedTarget = null;
    const pts = new Map();
    const toSvg = (cx, cy) => { const r = svg.getBoundingClientRect(); return [view[0] + (cx - r.left) / r.width * view[2], view[1] + (cy - r.top) / r.height * view[3]]; };
    svg.addEventListener('pointerdown', e => { if (e.button > 0) return; setView(view); pressedTarget = e.target; pts.set(e.pointerId, [e.clientX, e.clientY]); svg.setPointerCapture(e.pointerId); moved = false; drag = { v: [...view], pts: new Map(pts) }; });
    svg.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) { hover(e); return; }
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      const r = svg.getBoundingClientRect(), s = drag.v[2] / r.width;
      if (pts.size === 1 && drag.pts.size === 1) {
        const [x0, y0] = drag.pts.values().next().value, dx = e.clientX - x0, dy = e.clientY - y0;
        if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
        setView([drag.v[0] - dx * s, drag.v[1] - dy * s, drag.v[2], drag.v[3]]);
      } else if (pts.size >= 2 && drag.pts.size >= 2) {
        const a = [...pts.values()], b = [...drag.pts.values()];
        const d1 = Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]), d0 = Math.hypot(b[0][0] - b[1][0], b[0][1] - b[1][1]);
        const mx = (b[0][0] + b[1][0]) / 2, my = (b[0][1] + b[1][1]) / 2, f = d0 / d1;
        const cx = drag.v[0] + (mx - r.left) / r.width * drag.v[2], cy = drag.v[1] + (my - r.top) / r.height * drag.v[3];
        moved = true;
        setView([cx - (cx - drag.v[0]) * f, cy - (cy - drag.v[1]) * f, drag.v[2] * f, drag.v[3] * f]);
      }
    });
    const up = e => { pts.delete(e.pointerId); drag = pts.size ? { v: [...view], pts: new Map(pts) } : null; };
    svg.addEventListener('pointerup', e => {
      up(e);
      if (BE && BE.busy) return;
      if (moved) return;
      if (BE) return borderPick(e);
      const target = pressedTarget || e.target;
      const site = target.closest('.site'); if (site) return showSite(D.sites[+site.dataset.k].main);
      const feature = target.closest('.feature'); if (feature) return openFeature(feature.dataset.feature);
      const sb = target.closest('.sb,.slb'); if (sb && svg.classList.contains('subs-on')) return showSub(sb.dataset.sub);
      const z0 = target.closest('.z0,.z0l'); if (z0) return showZone0(z0.dataset.z0);
      const z2 = target.closest('.z2,.z2l'); if (z2) return showZone0(z2.dataset.z2);
      const z1 = target.closest('.z1,.z1l'); if (z1) return showZone0(z1.dataset.z1);
      const ar = target.closest('.ar,.al'); if (ar) return showArea(ar.dataset.area);
      clear();
    });
    function openFeature(id) {
      const f = D.fisico.accidentes.find(x => x.id === id), i = f && f.lugares.map(byId).find(Boolean);
      if (i) showSite(i);
    }
    svg.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const f = e.target.closest('.feature'), s = e.target.closest('.site');
      if (f || s) { e.preventDefault(); if (f) openFeature(f.dataset.feature); else showSite(D.sites[+s.dataset.k].main); }
    });
    svg.addEventListener('pointercancel', up);
    function wheelFrame(t) {
      const dt = Math.max(0.001, Math.min(0.05, (t - wheelTime) / 1000));
      wheelTime = t;
      const requested = W / zk(wheelTarget);
      const targetWidth = constrainView([view[0], view[1], requested, requested * view[3] / view[2]])[2];
      const current = Math.log(view[2]), goal = Math.log(targetWidth);
      // Resorte amortiguado en escala logarítmica: conserva la velocidad al recibir más giros.
      const omega = 22, error = current - goal, decay = Math.exp(-omega * dt);
      const temp = (wheelVelocity + omega * error) * dt;
      let next = goal + (error + temp) * decay;
      wheelVelocity = Math.max(-3, Math.min(3, (wheelVelocity - omega * temp) * decay));
      next = current + Math.max(-3 * dt, Math.min(3 * dt, next - current));
      const settled = Math.abs(next - goal) < 0.0002 && Math.abs(wheelVelocity) < 0.003;
      const width = settled ? targetWidth : Math.exp(next), f = width / view[2];
      const [cx, cy] = toSvg(wheelAnchor.x, wheelAnchor.y);
      view = constrainView([cx - (cx - view[0]) * f, cy - (cy - view[1]) * f, width, view[3] * f]);
      apply();
      if (settled) { viewFrame = 0; wheelTarget = null; wheelVelocity = 0; }
      else viewFrame = requestAnimationFrame(wheelFrame);
    }
    function zoomBy(direction, x, y) {
      const active = wheelTarget !== null;
      const base = active && direction === wheelDirection ? wheelTarget : zlevel(W / view[2]);
      if (!active) {
        if (viewFrame) cancelAnimationFrame(viewFrame);
        wheelVelocity = 0; wheelTime = performance.now();
      }
      wheelTarget = Math.max(ZL[0].n, Math.min(MAX_ZOOM, base + direction));
      wheelDirection = direction; wheelAnchor = { x, y };
      if (!active) viewFrame = requestAnimationFrame(wheelFrame);
    }
    svg.addEventListener('wheel', e => {
      e.preventDefault();
      if (!e.deltaY || pts.size) return;
      const now = performance.now(), delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? svg.clientHeight : 1);
      if (now - wheelLast > 180 || Math.sign(delta) !== Math.sign(wheelDelta)) wheelDelta = 0;
      wheelLast = now; wheelDelta += delta;
      if (Math.abs(wheelDelta) < 60) return;
      const direction = wheelDelta < 0 ? 1 : -1;
      wheelDelta = 0;
      zoomBy(direction, e.clientX, e.clientY);
    }, { passive: false });
    svg.addEventListener('dblclick', e => { const [cx, cy] = toSvg(e.clientX, e.clientY); setView([cx - view[2] * .3, cy - view[3] * .3, view[2] * .6, view[3] * .6], true); });
    function hover(e) {
      const site = e.target.closest('.site'), z0 = e.target.closest('.z0') || e.target.closest('.z1') || e.target.closest('.z2'), ar = e.target.closest('.ar'), sb = svg.classList.contains('subs-on') && e.target.closest('.sb'), feature = e.target.closest('.feature');
      svg.querySelectorAll('.sb.hov').forEach(n => n !== sb && n.classList.remove('hov')); if (sb) sb.classList.add('hov');
      svg.querySelectorAll('.ar.hov').forEach(n => n !== ar && n.classList.remove('hov'));
      if (ar) ar.classList.add('hov');
      let html = '';
      if (site) { const s = D.sites[+site.dataset.k]; html = `<b>${esc(s.main.n)}</b>${s.main.alt ? ` · ${esc(s.main.alt)}` : ''}<br><span>${esc(tierName(D, s.main.es))}${s.items.length > 1 ? ` · ${s.items.length} fichas` : ''}</span>`; }
      else if (feature) { const f = D.fisico.accidentes.find(x => x.id === feature.dataset.feature); html = `<b>${esc(f.nombre)}</b><br><span>${f.tipo === 'rio' ? 'Cauce del río' : 'Extensión del macizo'}</span>`; }
      else if (sb) { const s = D.subs[sb.dataset.sub], p = per(), st = p && p.subregiones[sb.dataset.sub], pw = st && D.poder[st.poder]; html = `<b>${esc(s.nombre)}</b>${pw ? `<br><span>${esc(pw.nombre)}</span>` : ''}`; }
      else if (z0) { const z = zone0(z0.dataset.z0) || zone1(z0.dataset.z1) || zone2(z0.dataset.z2); html = `<b>${esc(z.nombre)}</b> · ${esc(z.nombre_alt || '')}<br><span>${esc(z.nombre_griego || '')}${z.endonimo ? ` · ${esc(z.endonimo)}` : ''}</span>`; }
      else if (ar) { const info = D.areaInfo.get(ar.dataset.area) || {}; html = `<b>${esc(info.nombre || ar.dataset.area)}</b>`; }
      if (!html) { tip.hidden = true; return; }
      const r = main.querySelector('.atlas').getBoundingClientRect();
      tip.innerHTML = html; tip.hidden = false; tip.style.left = `${e.clientX - r.left + 14}px`; tip.style.top = `${e.clientY - r.top + 12}px`;
    }
    svg.addEventListener('pointerleave', () => { tip.hidden = true; });
    main.querySelector('#zi').onclick = () => { const r = svg.getBoundingClientRect(); zoomBy(1, r.left + r.width / 2, r.top + r.height / 2); };
    main.querySelector('#zo').onclick = () => { const r = svg.getBoundingClientRect(); zoomBy(-1, r.left + r.width / 2, r.top + r.height / 2); };
    main.querySelector('#zr').onclick = () => setView([0, 0, W, H], true);
    main.querySelector('#l-rv').onchange = e => svg.classList.toggle('no-rv', !e.target.checked);
    main.querySelector('#l-mt').onchange = e => svg.classList.toggle('no-mt', !e.target.checked);
    main.querySelector('#l-pt').onchange = e => svg.classList.toggle('no-pt', !e.target.checked);
    main.querySelector('#l-lb').onchange = e => svg.classList.toggle('no-lb', !e.target.checked);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') clear(); });
    window.addEventListener('resize', () => setView(view));

    // ---------- buscador ----------
    const q = main.querySelector('#q'), qr = main.querySelector('#qr');
    const cands = [...[...D.areaInfo.values()].map(a => ({ t: 'area', id: a.id, n: a.nombre, s: (D.regionFicha[a.id] || {}).n || '' })),
      ...D.lugares.filter(i => i.pt || i.ptx).map(i => ({ t: 'lugar', id: i.id, n: i.n, s: i.alt || tierName(D, i.es), es: i.es }))];
    q.addEventListener('input', () => {
      const v = fold(q.value.trim());
      if (v.length < 2) { qr.hidden = true; return; }
      const rank = c => (fold(c.n).startsWith(v) ? 0 : 1) + (c.t === 'area' ? 0 : c.es === 'polis-kome' || c.es === 'chora' ? .3 : .6);
      const hits = cands.filter(c => fold(`${c.n} ${c.s}`).includes(v)).sort((a, b) => rank(a) - rank(b)).slice(0, 12);
      qr.innerHTML = hits.map(c => `<button type="button" data-t="${c.t}" data-id="${esc(c.id)}"><b>${esc(c.n)}</b><span>${esc(c.t === 'area' ? 'Área' : c.s)}</span></button>`).join('') || '<p>Sin resultados</p>';
      qr.hidden = false;
    });
    qr.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      qr.hidden = true; q.value = '';
      if (b.dataset.t === 'area') showArea(b.dataset.id, true); else { const i = byId(b.dataset.id); if (i) showSite(i); }
    });
    q.addEventListener('keydown', e => { if (e.key === 'Enter') { const b = qr.querySelector('button'); if (b) b.click(); } });

    // ---------- estado inicial ----------
    setView([P([15.5, 0])[0], P([0, 44.6])[1], P([33.5, 0])[0] - P([15.5, 0])[0], 0].map((v, i) => i === 3 ? (svg.clientHeight / svg.clientWidth) * (P([33.5, 0])[0] - P([15.5, 0])[0]) : v));
    const sp = new URLSearchParams(location.search);
    const reg = sp.get('region'), ar = sp.get('area'), lg = sp.get('lugar'), sbq = sp.get('sub');
    if (sp.get('t') && D.per.periodos.some(p => p.id === sp.get('t'))) T = sp.get('t');
    applyTime();
    if (sbq && D.subs[sbq]) { showSub(sbq); return; }
    if (sp.get('t') === T && !D.t0[T] && !lg && !ar && !reg) fitBox(D.geo.peloponeso.bbox, 0.08, false);
    if (lg && zone0(lg)) { const y = zone0(lg).anio; if (y !== T) { T = y; applyTime(); } setView([0, 0, W, H]); showZone0(lg); }
    else if (lg && zone2(lg)) { const z = zone2(lg); if (z.anio !== T) { T = z.anio; applyTime(); } fitBox(z.bbox, 0.25, false); if (zlevel(W / view[2]) < 3) flyTo(z.etiqueta, zk(3) * 1.02); showZone0(lg); }
    else if (lg && zone1(lg)) { const z = zone1(lg); if (z.anio !== T) { T = z.anio; applyTime(); } flyTo(z.etiqueta, zk(2) * 1.05); showZone0(lg); }
    else if (lg && byId(lg)) { const i = byId(lg); if (i.es === 'region' && areaOf(i)) showArea(areaOf(i)); else showSite(i); }
    else if (ar && D.areaInfo.has(ar)) showArea(ar);
    else if (reg) { const i = byId(reg); if (i && areaOf(i)) showArea(areaOf(i)); }
  }

  // ---------------- mini-mapa para las fichas ----------------
  async function mini(el, rec) {
    const D = await load();
    const i = D.lugares.find(x => x.id === rec.id); if (!i) return;
    const geometry = D.physicalByPlace.get(i.id);
    let z0 = null;
    if (i.es === 'continental') for (const zs of Object.values(D.t0)) z0 = z0 || zs.find(z => z.ficha === i.id);
    if (i.es === 'region') for (const zs of Object.values(D.t1)) z0 = z0 || zs.find(z => z.ficha === i.id);
    if (i.es === 'ethnos' || i.es === 'dominio') for (const zs of Object.values(D.t2)) z0 = z0 || zs.find(z => z.ficha === i.id);
    const a = areaOf(i), pt = geometry ? geometry.punto : i.pt || i.ptx, geo = z0 || (a && D.geo[a]);
    if (!pt && !geo) return;
    let box;
    if (geometry) box = geometry.bbox;
    else if (pt && i.es !== 'region') { const w = i.es === 'chora' || i.es === 'ethnos' ? 2.4 : 1.6; box = [pt[0] - w, pt[1] - w * .62, pt[0] + w, pt[1] + w * .62]; }
    else box = geo.bbox;
    const [x0, y0] = P([box[0], box[3]]), [x1, y1] = P([box[2], box[1]]);
    let w = (x1 - x0) * 1.25, h = w * 0.62; if ((y1 - y0) * 1.25 > h) { h = (y1 - y0) * 1.25; w = h / 0.62; }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, u = w / 300;
    const mk = pt ? (() => { const [x, y] = P(pt); return `<g transform="translate(${x},${y}) scale(${u})"><circle r="9" class="mm-halo"/><circle r="4.5" class="mm-dot"/></g>`; })() : '';
    el.innerHTML = `<a class="minimap" href="mapa.html?lugar=${encodeURIComponent(i.id)}" title="Abrir en el mapa"><svg viewBox="${cx - w / 2} ${cy - h / 2} ${w} ${h}" style="--u:${u}">${baseSVG(D, { selectedId: geometry && geometry.id })}<g class="mm-sel">${geo && !geometry ? `<path d="${geo.poligonos.map(polyPath).join('')}"/>` : ''}</g>${mk}</svg><span>${esc(z0 ? (i.es === 'ethnos' || i.es === 'dominio' ? tierName(D, i.es) : i.es === 'region' ? 'Región' : 'Zona continental') : a ? (D.areaInfo.get(a) || {}).nombre || '' : '')}${rec.geo && rec.geo.precision === 'heredada' ? ` · punto de ${esc(rec.geo.de || 'su sitio')}` : ''} · Ver en el mapa ↗</span></a>`;
  }

  window.HEL_MAP = { init, mini, project: P };
})();

