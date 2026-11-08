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
  const TIER_ICON = { chora: 'diamond', ethnos: 'diamond', 'polis-kome': 'circle', demos: 'small', moira: 'small', oikema: 'small' };

  let DATA = null;
  async function load() {
    if (DATA) return DATA;
    const g = window.HEL.getJSON;
    const [I, tierra, rios, lagos, geo, areas, tipo, per] = await Promise.all([window.HEL.loadIndex(), g('data/mapa/tierra.json'), g('data/mapa/rios.json'),
      g('data/mapa/lagos.json'), g('data/mapa/areas.geo.json'), g('data/areas.json'), g('data/tipologia.json'), g('data/mapa/periodos.json')]);
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
    const puntos = lugares.filter(i => i.pt && !i.ph && i.es !== 'region' && ['chora', 'ethnos', 'polis-kome'].includes(i.es));
    // agrupar puntos casi idénticos (fases de un mismo sitio)
    const seen = new Map();
    for (const i of puntos) {
      const k = i.pt.map(v => v.toFixed(2)).join(',');
      if (!seen.has(k)) seen.set(k, { pt: i.pt, items: [] });
      seen.get(k).items.push(i);
    }
    const sites = [...seen.values()].map(s => {
      s.items.sort((a, b) => (a.es === 'polis-kome' ? 0 : 1) - (b.es === 'polis-kome' ? 0 : 1) || a.n.length - b.n.length);
      s.main = s.items[0]; s.tier = s.items.some(i => i.es === 'polis-kome') ? 'polis-kome' : s.main.es;
      const t = s.main.t || [];
      s.kind = s.tier !== 'polis-kome' && t.includes('Monte') ? 'monte' : s.tier !== 'polis-kome' && t.includes('Río') ? 'rio' : s.tier;
      s.label = s.main.n.replace(/\s*\(.*$/, '').split(',')[0].trim();
      s.rank = (s.tier === 'polis-kome' ? 0 : s.kind === 'monte' || s.kind === 'rio' ? 2 : 1) - Math.min(s.items.length, 4) * .1;
      return s;
    });
    const seas = lugares.filter(i => i.es === 'region' && i.pt);
    const subs = geo.subareas || {};
    const SUBC = ['#e0a27c', '#d3b07f', '#cf9670', '#e6bf92', '#c9a07d', '#dcb48a', '#d8a073'];
    Object.keys(subs).forEach((k, n) => { subs[k].color = SUBC[n % SUBC.length]; });
    const poder = Object.fromEntries(per.poderes.map(p => [p.id, p]));
    DATA = { I, tierra, rios, lagos, geo: geo.areas, subs, per, poder, areaInfo, color, regionFicha, lugares, sites, seas, tipo };
    return DATA;
  }

  const tierName = (D, id) => (D.tipo.escalas.find(x => x.id === id) || {}).nombre || id;
  const areaOf = i => (i.ar || [])[0];

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
<g class="subs">${Object.entries(D.subs || {}).map(([id, s]) => `<path class="sb" data-sub="${id}" fill="${s.color}" d="${s.poligonos.map(polyPath).join('')}"/><path class="sbh" data-sub="${id}" d="${s.poligonos.map(polyPath).join('')}"/>`).join('')}</g>
<g class="lakes">${lakes}</g>
<g class="rivers">${rivers}</g>
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
    <g class="seas"></g><g class="slabels"></g><g class="alabels"></g><g class="sites"></g><g class="hl"></g>
  </svg>
  <div class="ui tl">
    <div class="search"><input id="q" type="search" placeholder="Buscar área o lugar…" autocomplete="off" aria-label="Buscar en el mapa"><div id="qr" class="qr" hidden></div></div>
    <div class="layers"><label><input type="checkbox" id="l-rv" checked> Ríos</label><label><input type="checkbox" id="l-pt" checked> Lugares</label><label><input type="checkbox" id="l-lb" checked> Nombres</label></div>
  </div>
  <div class="ui tc"><div class="when" role="group" aria-label="Fecha">${[['', 'Geografía'], ...D.per.periodos.map(p => [p.id, p.etiqueta])].map(([v, l]) => `<button type="button" data-t="${v}">${l}</button>`).join('')}</div>
    <div id="era" class="era" hidden></div></div>
  <div class="ui tr zoom"><button id="zi" title="Acercar">+</button><button id="zo" title="Alejar">−</button><button id="zr" title="Vista completa">⤢</button></div>
  <div class="ui bl"><div class="scale"><span id="sbar"></span><b id="slab"></b></div>
    <div class="legend"><span><i style="background:${HELADE[0]}"></i>Hélade</span><span><i style="background:${FUERA[0]}"></i>Tierras extranjeras</span><span><i class="dm"></i>Chora</span><span><i class="ci"></i>Polis / Kome</span><span>⛰️ Monte</span><span>🌊 Río</span></div>
    <div class="offmap">${offmap.map(a => `<button data-area="${a}">✧ ${esc(D.areaInfo.get(a).nombre)}</button>`).join('')}</div>
  </div>
  <aside id="panel" class="panel" hidden></aside>
  <div id="tip" class="tip" hidden></div>
</div>
<p class="atlas-src">Costa, ríos y lagos: <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">Natural Earth</a> 1:10m (dominio público). Las fronteras entre áreas son convencionales y aproximadas, no límites históricos; los puntos marcados "aprox." son ubicaciones de referencia.</p>`;
    const svg = main.querySelector('#map'), panel = main.querySelector('#panel'), tip = main.querySelector('#tip');
    const gSites = svg.querySelector('.sites'), gLab = svg.querySelector('.alabels'), gSeas = svg.querySelector('.seas'), gHl = svg.querySelector('.hl');
    let view = [0, 0, W, H], selArea = null, selSite = null, T = null;
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
        lab.textContent = st && st.poder !== OWN[id] && pw ? `bajo ${pw.nombre.split(' —')[0]}` : '';
      }
      const era = main.querySelector('#era');
      if (p) {
        const used = [...new Set(Object.values(p.subregiones).map(x => x.poder))].map(id => D.poder[id]).filter(Boolean);
        era.innerHTML = `<button type="button" class="emin" title="Plegar o desplegar">▾</button><b>${esc(p.etiqueta)}</b> · ${esc((D.tipo.periodos.find(x => x.id === p.periodo) || {}).nombre || '')}<p>${esc(p.resumen)}</p><div class="pw">${used.map(x => `<span><i style="background:${x.color}"></i>${esc(x.nombre)}</span>`).join('')}<span><i class="hz"></i>dominado por otro poder</span></div>`;
        era.hidden = false;
      } else era.hidden = true;
      D.sites.forEach((s, k) => { const g = gSites.querySelector(`[data-k="${k}"]`); if (g) g.classList.toggle('gone', !s.items.some(alive)); });
      const u = new URL(location.href); T ? u.searchParams.set('t', T) : u.searchParams.delete('t'); history.replaceState(null, '', u);
      apply();
      if (selSite) showSite(selSite, false); else if (selSub) showSub(selSub, false);
    }
    let selSub = null;
    main.querySelector('#era').addEventListener('click', e => { if (e.target.closest('.emin') || e.target.closest('b')) main.querySelector('#era').classList.toggle('min'); });
    main.querySelector('.when').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      T = b.dataset.t || null; applyTime();
      if (T && W / view[2] < 2.4) fitBox(D.geo.peloponeso.bbox, 0.08);
    });

    // etiquetas de área
    gLab.innerHTML = Object.entries(D.geo).map(([id, a]) => {
      const [x, y] = P(a.etiqueta), info = D.areaInfo.get(id) || {}, rf = D.regionFicha[id];
      const gr = rf && rf.n && fold(rf.n) !== fold(info.nombre) ? rf.n : '';
      return `<g class="al${info.grupo === 'helade' ? ' hel' : ''}" data-area="${id}" data-w="${a.bbox[2] - a.bbox[0]}" transform="translate(${x},${y})"><text class="n" text-anchor="middle">${esc(info.nombre || id)}</text>${gr ? `<text class="g" text-anchor="middle" dy="14">${esc(gr)}</text>` : ''}</g>`;
    }).join('');
    gSeas.innerHTML = D.seas.map(i => { const [x, y] = P(i.pt); return `<g class="sea-l" transform="translate(${x},${y})"><text text-anchor="middle">${esc(i.alt || i.n)}</text></g>`; }).join('')
      + [['Mar Egeo', [25.2, 38.9]], ['Mar Jónico', [19.2, 37.6]], ['Ponto Euxino', [34.5, 43.3]], ['Mar Mediterráneo', [18.5, 34.6]], ['Propóntide', [28.0, 40.72]], ['Mar Adriático', [16.0, 42.6]], ['Mar Tirreno', [12.0, 39.6]]]
        .map(([t, c]) => { const [x, y] = P(c); return `<g class="sea-l big" transform="translate(${x},${y})"><text text-anchor="middle">${t}</text></g>`; }).join('');
    gSites.innerHTML = D.sites.map((s, k) => {
      const [x, y] = P(s.pt), t = s.tier;
      const shape = s.kind === 'monte' ? '<circle class="hit" r="9"/><text class="em" text-anchor="middle" dy=".35em">⛰️</text>' : s.kind === 'rio' ? '<circle class="hit" r="9"/><text class="em" text-anchor="middle" dy=".35em">🌊</text>' : TIER_ICON[t] === 'diamond' ? '<path class="mk" d="M0 -6L6 0L0 6L-6 0Z"/>' : '<circle class="mk" r="4.6"/>';
      return `<g class="site ${t} k-${s.kind}" data-k="${k}" transform="translate(${x},${y})" tabindex="0">${shape}<text class="sl" x="8" dy=".35em">${esc(s.label)}</text></g>`;
    }).join('');

    function unitsPerPx() { return view[2] / (svg.clientWidth || 1000); }
    function apply() {
      svg.setAttribute('viewBox', view.join(' '));
      const u = unitsPerPx(), k = W / view[2];
      svg.style.setProperty('--u', u);
      const placed = [], sx = x => (x - view[0]) / u, sy = y => (y - view[1]) / u;
      const fits = b => { for (const p of placed) if (!(b[2] < p[0] || b[0] > p[2] || b[3] < p[1] || b[1] > p[3])) return false; placed.push(b); return true; };
      const subsVisible = W / view[2] >= 2.4 || !!T;
      svg.querySelectorAll('.al').forEach(g => {
        if (subsVisible && Object.values(D.subs).some(s => s.padre === g.dataset.area)) { g.style.display = 'none'; return; }
        const [x, y] = g.getAttribute('transform').match(/translate\(([^)]+)\)/)[1].split(',').map(Number);
        const wpx = (+g.dataset.w * COS * U) / u, name = g.querySelector('.n').textContent;
        g.setAttribute('transform', `translate(${x},${y}) scale(${u})`);
        const tw = name.length * 8.4, show = wpx > name.length * 7.2 && fits([sx(x) - tw / 2, sy(y) - 14, sx(x) + tw / 2, sy(y) + (g.querySelector('.g') ? 18 : 4)]);
        g.style.display = show ? '' : 'none';
        g.classList.toggle('dim', k > 9);
      });
      gSeas.querySelectorAll('.sea-l').forEach(g => {
        const m = g.getAttribute('transform').match(/translate\(([^)]+)\)/)[1].split(',').map(Number);
        g.setAttribute('transform', `translate(${m[0]},${m[1]}) scale(${u})`);
        const vis = g.classList.contains('big') ? k < 7 : k >= 5, tw = g.textContent.length * 7.5;
        g.style.display = vis && fits([sx(m[0]) - tw / 2, sy(m[1]) - 12, sx(m[0]) + tw / 2, sy(m[1]) + 4]) ? '' : 'none';
      });
      const subOn = k >= 2.4 || !!T;
      svg.classList.toggle('subs-on', subOn);
      gSL.querySelectorAll('.slb').forEach(g => {
        const x = +g.dataset.x, y = +g.dataset.y, name = g.querySelector('.n').textContent;
        g.setAttribute('transform', `translate(${x},${y}) scale(${u})`);
        const tw = Math.max(name.length * 8.6, g.querySelector('.p').textContent.length * 6.4);
        g.style.display = subOn && k >= 2.4 && fits([sx(x) - tw / 2, sy(y) - 13, sx(x) + tw / 2, sy(y) + 16]) ? '' : 'none';
      });
      const nodes = [...gSites.querySelectorAll('.site')].map(g => [g, D.sites[+g.dataset.k]]);
      for (const [g, s] of nodes) {
        const [x, y] = P(s.pt);
        g.setAttribute('transform', `translate(${x},${y}) scale(${u})`);
        g.style.display = (s.tier === 'polis-kome' ? k >= 3.2 : k >= 2.2) && !g.classList.contains('gone') ? '' : 'none';
        g.classList.remove('lab');
      }
      if (!svg.classList.contains('no-lb')) {
        nodes.filter(([g, s]) => g.style.display !== 'none' && (g.classList.contains('on') || k >= (s.tier === 'polis-kome' ? 4.5 : s.kind === 'chora' || s.kind === 'ethnos' ? 4 : 7)))
          .sort((a, b) => (b[0].classList.contains('on') - a[0].classList.contains('on')) || a[1].rank - b[1].rank)
          .forEach(([g, s]) => { const [x, y] = P(s.pt), X = sx(x), Y = sy(y); if (X < -50 || Y < -20 || X > svg.clientWidth + 50 || Y > svg.clientHeight + 20) return; if (fits([X - 6, Y - 8, X + 10 + s.label.length * 6.6, Y + 8])) g.classList.add('lab'); });
      }
      svg.classList.toggle('z-hi', k >= 2.5);

      const pl = gHl.querySelector('.pulse'); if (pl) pl.setAttribute('transform', pl.getAttribute('transform').replace(/scale\([^)]*\)/, `scale(${u})`));
      // escala
      const kmPerPx = u / U * 111.2, nice = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000].find(v => v / kmPerPx >= 70) || 1000;
      main.querySelector('#sbar').style.width = `${nice / kmPerPx}px`; main.querySelector('#slab').textContent = `${nice} km`;
      main.querySelector('#zi').disabled = k >= 60; main.querySelector('#zo').disabled = k <= 1.001;
    }
    function setView(v, animate) {
      const asp = (svg.clientHeight || 600) / (svg.clientWidth || 1000);
      let w = Math.min(W, Math.max(W / 60, v[2])), h = w * asp;
      if (h > H) { h = H; w = h / asp; }
      const cx = v[0] + v[2] / 2, cy = v[1] + v[3] / 2;
      let x = cx - w / 2, y = cy - h / 2;
      x = Math.max(Math.min(x, W - w), Math.min(0, W - w)); y = Math.max(Math.min(y, H - h), Math.min(0, H - h));
      const target = [x, y, w, h];
      if (!animate) { view = target; apply(); return; }
      const from = [...view], t0 = performance.now(), dur = 420;
      const step = t => { const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3); view = from.map((a, i) => a + (target[i] - a) * e); apply(); if (p < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
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
    const listLink = (i, extra = '') => `<li><button type="button" class="pl" data-go="${esc(i.id)}">${esc(i.n)}${i.alt ? ` <span class="muted">${esc(i.alt)}</span>` : ''}</button>${extra}</li>`;
    function showArea(id, move = true) {
      selArea = id; selSite = null; selSub = null; svg.querySelectorAll('.sb').forEach(p => p.classList.remove('sel'));
      const info = D.areaInfo.get(id) || { nombre: id }, rf = D.regionFicha[id], geo = D.geo[id];
      const inArea = D.lugares.filter(i => (i.ar || []).includes(id));
      const by = es => inArea.filter(i => i.es === es && (i.pt || i.ptx));
      const choras = [...by('chora'), ...by('ethnos')], poleis = by('polis-kome');
      const counts = D.tipo.escalas.map(e => [e, inArea.filter(i => i.es === e.id).length]).filter(([, n]) => n);
      panel.innerHTML = `<button class="x" aria-label="Cerrar">×</button>
<p class="eyebrow"><span class="sw" style="background:${D.color[id]}"></span>${esc(info.grupo === 'helade' ? 'Hélade' : info.grupo === 'mitica' ? 'Geografía mítica' : 'Tierra extranjera')}</p>
<h2>${esc(info.nombre)}</h2>${rf && fold(rf.n) !== fold(info.nombre) ? `<p class="gr">${esc(rf.n)}</p>` : ''}
<p>${esc(info.descripcion || '')}</p>
<div class="acts">${rf ? `<a class="btn" href="${ficha('lugares', rf.id)}">Ficha de la región ↗</a>` : ''}<a class="btn ghost" href="lugares.html?area=${encodeURIComponent(id)}">${inArea.length} lugares en la lista ↗</a></div>
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
    const inRing = ([x, y], r) => { let c = false; for (let a = 0, b = r.length - 1; a < r.length; b = a++) { const [xi, yi] = r[a], [xj, yj] = r[b]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
    const inSub = (pt, s) => s.poligonos.some(p => inRing(pt, p[0]) && !p.slice(1).some(h => inRing(pt, h)));
    function showSub(id, move = true) {
      const s = D.subs[id]; if (!s) return;
      selSub = id; selSite = null; selArea = s.padre;
      const here = D.lugares.filter(i => i.pt && !i.ph && ['chora', 'ethnos', 'polis-kome'].includes(i.es) && inSub(i.pt, s) && alive(i));
      const pol = here.filter(i => i.es === 'polis-kome').sort((a, b) => fold(a.n).localeCompare(fold(b.n)));
      const cho = here.filter(i => i.es !== 'polis-kome');
      const fi = s.ficha && D.lugares.find(i => i.id === s.ficha);
      const rows = D.per.periodos.map(p => { const st = p.subregiones[id] || {}, pw = D.poder[st.poder] || {}; return `<li class="${p.id === T ? 'on' : ''}"><button type="button" class="tt" data-t="${p.id}">${esc(p.etiqueta)}</button><span><i style="background:${pw.color || '#ccc'}"></i><b>${esc(pw.nombre || '—')}</b>${st.nota ? ` — ${esc(st.nota)}` : ''}</span></li>`; }).join('');
      panel.innerHTML = `<button class="x" aria-label="Cerrar">×</button>
<p class="eyebrow"><span class="sw" style="background:${s.color}"></span>Subregión · <button type="button" class="lnk" data-area="${s.padre}">${esc((D.areaInfo.get(s.padre) || {}).nombre || s.padre)}</button></p>
<h2>${esc(s.nombre)}</h2>${s.griego ? `<p class="gr">${esc(s.griego)}</p>` : ''}${s.nota ? `<p>${esc(s.nota)}</p>` : ''}
${fi ? `<div class="acts"><a class="btn" href="${ficha('lugares', fi.id)}">Ficha ↗</a></div>` : ''}
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
      const pt = i.pt || i.ptx, a = areaOf(i), info = D.areaInfo.get(a);
      const site = D.sites.find(s => s.items.includes(i));
      const fo = (i.fo || []).map(f => (D.tipo.formas.find(x => x.id === f) || {}).nombre || f);
      const fu = (i.fu || []).map(f => (D.tipo.funciones.find(x => x.id === f) || {}).nombre || f);
      const near = pt ? D.sites.filter(s => s !== site && Math.hypot((s.pt[0] - pt[0]) * COS, s.pt[1] - pt[1]) < 0.35).slice(0, 12) : [];
      panel.innerHTML = `<button class="x" aria-label="Cerrar">×</button>
<p class="eyebrow">${esc(tierName(D, i.es))}${info ? ` · <button type="button" class="lnk" data-area="${a}">${esc(info.nombre)}</button>` : ''}</p>
<h2>${esc(i.n)}</h2>${i.alt ? `<p class="gr">${esc(i.alt)}</p>` : ''}
${i.r ? `<p>${esc(i.r)}</p>` : ''}
${fo.length ? `<p class="kv"><b>Forma</b> ${esc(fo.join(' → '))}</p>` : ''}${fu.length ? `<p class="kv"><b>Función</b> ${esc(fu.join(', '))}</p>` : ''}
<div class="acts"><a class="btn" href="${ficha('lugares', i.id)}">Abrir ficha ↗</a></div>
${site && site.items.length > 1 ? `<h3>En este mismo punto</h3><ul>${site.items.filter(x => x !== i).map(x => listLink(x)).join('')}</ul>` : ''}
${near.length ? `<h3>Cerca</h3><ul>${near.map(s => listLink(s.main)).join('')}</ul>` : ''}
<p class="muted small">${pt ? `${pt[1].toFixed(3)}° N, ${pt[0].toFixed(3)}° E · ubicación aproximada` : 'Sin coordenadas'}</p>`;
      panel.hidden = false; selSub = null;
      svg.querySelectorAll('.sb').forEach(p => p.classList.remove('sel'));
      svg.querySelectorAll('.ar').forEach(p => p.classList.toggle('sel', p.dataset.area === a));
      svg.classList.add('has-sel');
      if (pt) { const [x, y] = P(pt); gHl.innerHTML = `<g class="pulse" transform="translate(${x},${y})"><circle r="1"/></g>`; gHl.firstChild.setAttribute('transform', `translate(${x},${y}) scale(${unitsPerPx()})`); }
      gSites.querySelectorAll('.site').forEach(g => g.classList.toggle('on', D.sites[+g.dataset.k] === site)); apply();
      if (move && pt) flyTo(pt, Math.max(W / view[2], i.es === 'chora' || i.es === 'ethnos' ? 10 : 18));
      url({ lugar: i.id });
    }
    function clear() {
      panel.hidden = true; selArea = selSite = selSub = null; gHl.innerHTML = '';
      svg.querySelectorAll('.sb.sel').forEach(n => n.classList.remove('sel'));
      svg.classList.remove('has-sel'); svg.querySelectorAll('.ar.sel,.site.on').forEach(n => n.classList.remove('sel', 'on'));
      url({});
    }
    function url(q) { const u = new URL(location.href); ['area', 'lugar', 'region', 'sub'].forEach(k => u.searchParams.delete(k)); Object.entries(q).forEach(([k, v]) => u.searchParams.set(k, v)); history.replaceState(null, '', u); }
    const byId = id => D.lugares.find(i => i.id === id);
    panel.addEventListener('click', e => {
      if (e.target.closest('.x')) return clear();
      const tt = e.target.closest('.tt'); if (tt) { T = tt.dataset.t; applyTime(); return; }
      const go = e.target.closest('[data-go]'); if (go) { const i = byId(go.dataset.go); if (i) showSite(i); }
      const ar = e.target.closest('[data-area]'); if (ar) showArea(ar.dataset.area);
    });
    main.querySelector('.offmap').addEventListener('click', e => { const b = e.target.closest('[data-area]'); if (b) showArea(b.dataset.area, false); });

    // ---------- interacción en el mapa ----------
    let drag = null, moved = false;
    const pts = new Map();
    const toSvg = (cx, cy) => { const r = svg.getBoundingClientRect(); return [view[0] + (cx - r.left) / r.width * view[2], view[1] + (cy - r.top) / r.height * view[3]]; };
    svg.addEventListener('pointerdown', e => { if (e.button > 0) return; pts.set(e.pointerId, [e.clientX, e.clientY]); svg.setPointerCapture(e.pointerId); moved = false; drag = { v: [...view], pts: new Map(pts) }; });
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
      if (moved) return;
      const site = e.target.closest('.site'); if (site) return showSite(D.sites[+site.dataset.k].main);
      const sb = e.target.closest('.sb,.slb'); if (sb && svg.classList.contains('subs-on')) return showSub(sb.dataset.sub);
      const ar = e.target.closest('.ar,.al'); if (ar) return showArea(ar.dataset.area);
      clear();
    });
    svg.addEventListener('pointercancel', up);
    svg.addEventListener('wheel', e => {
      e.preventDefault();
      const f = Math.exp(e.deltaY * (e.deltaMode ? 0.05 : 0.0016)), [cx, cy] = toSvg(e.clientX, e.clientY);
      setView([cx - (cx - view[0]) * f, cy - (cy - view[1]) * f, view[2] * f, view[3] * f]);
    }, { passive: false });
    svg.addEventListener('dblclick', e => { const [cx, cy] = toSvg(e.clientX, e.clientY); setView([cx - view[2] * .3, cy - view[3] * .3, view[2] * .6, view[3] * .6], true); });
    function hover(e) {
      const site = e.target.closest('.site'), ar = e.target.closest('.ar'), sb = svg.classList.contains('subs-on') && e.target.closest('.sb');
      svg.querySelectorAll('.sb.hov').forEach(n => n !== sb && n.classList.remove('hov')); if (sb) sb.classList.add('hov');
      svg.querySelectorAll('.ar.hov').forEach(n => n !== ar && n.classList.remove('hov'));
      if (ar) ar.classList.add('hov');
      let html = '';
      if (site) { const s = D.sites[+site.dataset.k]; html = `<b>${esc(s.main.n)}</b>${s.main.alt ? ` · ${esc(s.main.alt)}` : ''}<br><span>${esc(tierName(D, s.main.es))}${s.items.length > 1 ? ` · ${s.items.length} fichas` : ''}</span>`; }
      else if (sb) { const s = D.subs[sb.dataset.sub], p = per(), st = p && p.subregiones[sb.dataset.sub], pw = st && D.poder[st.poder]; html = `<b>${esc(s.nombre)}</b>${pw ? `<br><span>${esc(pw.nombre)}</span>` : ''}`; }
      else if (ar) { const info = D.areaInfo.get(ar.dataset.area) || {}; html = `<b>${esc(info.nombre || ar.dataset.area)}</b>`; }
      if (!html) { tip.hidden = true; return; }
      const r = main.querySelector('.atlas').getBoundingClientRect();
      tip.innerHTML = html; tip.hidden = false; tip.style.left = `${e.clientX - r.left + 14}px`; tip.style.top = `${e.clientY - r.top + 12}px`;
    }
    svg.addEventListener('pointerleave', () => { tip.hidden = true; });
    main.querySelector('#zi').onclick = () => setView([view[0] + view[2] * .2, view[1] + view[3] * .2, view[2] * .6, view[3] * .6], true);
    main.querySelector('#zo').onclick = () => setView([view[0] - view[2] * .333, view[1] - view[3] * .333, view[2] * 1.667, view[3] * 1.667], true);
    main.querySelector('#zr').onclick = () => setView([0, 0, W, H], true);
    main.querySelector('#l-rv').onchange = e => svg.classList.toggle('no-rv', !e.target.checked);
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
    if (T && !lg && !ar && !reg) fitBox(D.geo.peloponeso.bbox, 0.08, false);
    if (lg && byId(lg)) { const i = byId(lg); if (i.es === 'region' && areaOf(i)) showArea(areaOf(i)); else showSite(i); }
    else if (ar && D.areaInfo.has(ar)) showArea(ar);
    else if (reg) { const i = byId(reg); if (i && areaOf(i)) showArea(areaOf(i)); }
  }

  // ---------------- mini-mapa para las fichas ----------------
  async function mini(el, rec) {
    const D = await load();
    const i = D.lugares.find(x => x.id === rec.id); if (!i) return;
    const a = areaOf(i), pt = i.pt || i.ptx, geo = a && D.geo[a];
    if (!pt && !geo) return;
    let box;
    if (pt && i.es !== 'region') { const w = i.es === 'chora' || i.es === 'ethnos' ? 2.4 : 1.6; box = [pt[0] - w, pt[1] - w * .62, pt[0] + w, pt[1] + w * .62]; }
    else box = geo.bbox;
    const [x0, y0] = P([box[0], box[3]]), [x1, y1] = P([box[2], box[1]]);
    let w = (x1 - x0) * 1.25, h = w * 0.62; if ((y1 - y0) * 1.25 > h) { h = (y1 - y0) * 1.25; w = h / 0.62; }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, u = w / 300;
    const mk = pt ? (() => { const [x, y] = P(pt); return `<g transform="translate(${x},${y}) scale(${u})"><circle r="9" class="mm-halo"/><circle r="4.5" class="mm-dot"/></g>`; })() : '';
    el.innerHTML = `<a class="minimap" href="mapa.html?lugar=${encodeURIComponent(i.id)}" title="Abrir en el mapa"><svg viewBox="${cx - w / 2} ${cy - h / 2} ${w} ${h}" style="--u:${u}">${baseSVG(D)}<g class="mm-sel">${geo ? `<path d="${geo.poligonos.map(polyPath).join('')}"/>` : ''}</g>${mk}</svg><span>${esc(a ? (D.areaInfo.get(a) || {}).nombre || '' : '')}${rec.geo && rec.geo.precision === 'heredada' ? ` · punto de ${esc(rec.geo.de || 'su sitio')}` : ''} · Ver en el mapa ↗</span></a>`;
  }

  window.HEL_MAP = { init, mini, project: P };
})();
