/* Helénica — atlas local, sin dependencias de mapas ni servicios de teselas. */
(function () {
  'use strict';
  const W = 1100, H = 860;
  const project = ([lon, lat]) => [(lon - 17) * W / 19.5, (43.7 - lat) * H / 12.7];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fold = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const fichaURL = id => `ficha.html?c=lugares&id=${encodeURIComponent(id)}`;
  const categories = { region: 'Región terrestre o insular', mar: 'Mar o golfo', mitica: 'Geografía mítica' };
  const pathFor = rings => rings.map(ring => ring.map((c, i) => {
    const p = project(c); return `${i ? 'L' : 'M'}${p[0].toFixed(2)},${p[1].toFixed(2)}`;
  }).join('') + 'Z').join('');

  async function init() {
    const [index, atlas, coast, areas] = await Promise.all([
      window.HEL.loadIndex(), window.HEL.getJSON('data/mapa/regiones.json'),
      window.HEL.getJSON('data/mapa/costas.geojson'), window.HEL.getJSON('data/areas.json')
    ]);
    const regionItems = index.items.filter(i => i.c === 'lugares' && i.es === 'region');
    const by = new Map(regionItems.map(i => [i.id, i]));
    const entries = atlas.lugares.filter(r => r.fichas.some(id => by.has(id))).map(r => ({ ...r, fichas: r.fichas.filter(id => by.has(id)) }));
    // Las futuras fichas de tier 1 siguen siendo accesibles aunque falte situarlas.
    const covered = new Set(entries.flatMap(r => r.fichas));
    regionItems.filter(i => !covered.has(i.id)).forEach(i => entries.push({ id: `pendiente-${i.id}`, nombre: i.n, fichas: [i.id], tipo: 'pendiente', coordenadas: null, nota: 'Esta ficha todavía no tiene un punto de referencia en el atlas.' }));
    const validGeo = r => Array.isArray(r.coordenadas) && r.coordenadas.length === 2 && r.coordenadas.every(Number.isFinite);
    const geo = entries.filter(validGeo), mythical = entries.filter(r => r.tipo === 'mitica');
    const params = new URLSearchParams(location.search);
    let selected = entries.find(r => r.id === params.get('region') || r.fichas.includes(params.get('region'))) || entries[0];
    let filter = 'todas', search = '', view = [0, 0, W, H];
    const main = document.querySelector('main');
    main.innerHTML = `
<section class="hero compact atlas-hero"><div><p class="eyebrow">Atlas de Helénica · tier 1</p><h1>El mundo de las regiones</h1><p>Un recorrido por la tierra, el mar y los confines del mito.</p></div><div class="atlas-count"><strong>${regionItems.length}</strong><span>fichas regionales</span></div></section>
<div class="atlas-layout">
<section class="atlas-map-column" aria-label="Mapa geográfico">
 <div class="atlas-frame">
  <div class="atlas-map-tools"><button type="button" id="map-reset" title="Mostrar todo el mapa">Vista completa</button><div><button type="button" id="map-in" aria-label="Acercar mapa">+</button><button type="button" id="map-out" aria-label="Alejar mapa">−</button></div></div>
  <svg id="atlas-map" viewBox="0 0 ${W} ${H}" role="group" aria-label="Mapa interactivo del Mediterráneo oriental. Selecciona un punto numerado o usa la lista de regiones.">
   <title>Regiones del mundo helénico</title><desc>Puntos de referencia sobre una costa geográfica. Los lugares míticos aparecen fuera del mapa.</desc>
   <defs><pattern id="atlas-water" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".5" fill="#6a8b8a" opacity=".16"/></pattern></defs>
   <rect x="-5000" y="-5000" width="10000" height="10000" fill="#dce8e3"/>
   <rect x="-5000" y="-5000" width="10000" height="10000" fill="url(#atlas-water)"/>
   <g class="atlas-grid">${[18,21,24,27,30,33,36].map(lon => { const [x] = project([lon,40]); return `<path d="M${x},-200 V1300"/><text x="${x+5}" y="32">${lon}° E</text>`; }).join('')}${[32,35,38,41,44].map(lat => { const [,y] = project([20,lat]); return `<path d="M-200,${y} H1400"/><text x="12" y="${y-6}">${lat}° N</text>`; }).join('')}</g>
   <g class="atlas-land" aria-hidden="true">${coast.features.map(f => (f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates]).map(rings => `<path d="${pathFor(rings)}"/>`).join('')).join('')}</g>
   <g class="atlas-context" aria-hidden="true">${[['ANATOLIA',[31.1,39.6]],['MAR EGEO',[25,36.4]],['MAR JÓNICO',[19.4,36.6]],['MEDITERRÁNEO',[29,33.15]]].map(([text,coords]) => { const [x,y]=project(coords); return `<text x="${x}" y="${y}" text-anchor="middle">${text}</text>`; }).join('')}</g>
   <g id="atlas-markers">${geo.map(r => { const [x,y] = project(r.coordenadas); return `<g class="atlas-marker${r.tipo === 'mar' ? ' sea' : ''}" data-region="${esc(r.id)}" transform="translate(${x},${y})" tabindex="0" role="button" aria-label="${r.numero}. ${esc(r.nombre)}" aria-pressed="false"><title>${esc(r.nombre)}</title>${r.desplazamiento ? `<circle class="marker-anchor" r="3"/><path class="marker-leader" d="M0,0 L${r.desplazamiento.join(',')}"/>` : ''}<g transform="translate(${(r.desplazamiento || [0,0]).join(',')})"><circle class="marker-halo" r="23"/><circle class="marker-dot" r="15"/><text text-anchor="middle" dy=".35em">${r.numero}</text></g></g>`; }).join('')}</g>
  </svg>
  <div class="atlas-compass" aria-hidden="true"><span>N</span><span>↑</span></div>
  <p class="atlas-map-hint">Arrastra para desplazarte · + / − para acercar</p>
 </div>
 <div class="atlas-legend"><span><i></i> Tierra e islas</span><span><i class="sea"></i> Mares y golfos</span><span><i class="myth"></i> Lugares míticos, fuera del mapa</span></div>
 <p class="atlas-caption">Los puntos señalan una ubicación de referencia, no capitales ni límites territoriales. Costa actual generalizada; las agrupaciones siguen el criterio de Helénica.</p>
 <section class="atlas-myths" aria-labelledby="myth-title"><p class="eyebrow">Más allá de la geografía</p><h2 id="myth-title">Los espacios del mito</h2><p>Sin coordenadas terrestres fijas.</p><div>${mythical.map(r => `<button type="button" data-select="${esc(r.id)}"><span>✧</span>${esc(r.nombre)}<span aria-hidden="true">↗</span></button>`).join('')}</div></section>
 <p class="atlas-source">Costa: <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">Natural Earth</a>, escala 1:50 millones · <a href="lugares.html?escala=region">Ver todas las fichas de Región →</a></p>
</section>
<aside class="atlas-sidebar" aria-label="Explorar regiones">
 <section class="atlas-selection" id="atlas-selection" aria-live="polite"></section>
 <section class="atlas-directory"><label for="atlas-search">Buscar una región</label><input id="atlas-search" type="search" placeholder="Nombre, ficha o área…" autocomplete="off"><div class="atlas-filters" aria-label="Filtrar lugares">${[['todas','Todas'],['region','Tierras'],['mar','Mares'],['mitica','Míticas']].map(([id,label])=>`<button type="button" data-filter="${id}" aria-pressed="${id === 'todas'}">${label}</button>`).join('')}</div><p id="atlas-results" class="atlas-result-count" role="status"></p><div id="atlas-directory-list"></div></section>
</aside>
</div>`;
    const svg = document.getElementById('atlas-map');
    const setView = next => {
      const w = Math.max(W / 4, Math.min(W, next[2]));
      view = [Math.max(0, Math.min(W-w,next[0])), Math.max(0,Math.min(H-w*H/W,next[1])),w,w*H/W];
      svg.setAttribute('viewBox', view.join(' '));
      const scale = view[2]/W;
      svg.querySelectorAll('.atlas-marker').forEach(node => {
        const r = geo.find(r => r.id === node.dataset.region), [x,y] = project(r.coordenadas);
        node.setAttribute('transform',`translate(${x},${y}) scale(${scale})`);
      });
      document.getElementById('map-in').disabled = view[2] <= W/4;
      document.getElementById('map-out').disabled = view[2] >= W;
    };
    const zoom = factor => { const w=view[2]*factor; setView([view[0]+(view[2]-w)/2,view[1]+(view[3]-w*H/W)/2,w,w*H/W]); };
    function matches(r) {
      return (filter === 'todas' || r.tipo === filter) && (!search || fold([r.nombre,...r.fichas.map(id=>`${by.get(id).n} ${by.get(id).alt || ''} ${(by.get(id).ar || []).map(a => areas.areas.find(x => x.id === a)?.nombre || a).join(' ')}`)].join(' ')).includes(search));
    }
    function directory() {
      const visible = entries.filter(matches);
      document.getElementById('atlas-results').textContent = `${visible.reduce((n,r)=>n+r.fichas.length,0)} fichas · ${visible.length} ${visible.length===1?'entrada':'entradas'}`;
      document.getElementById('atlas-directory-list').innerHTML = visible.map(r => `<button class="atlas-directory-item${selected.id===r.id?' active':''}" type="button" data-select="${esc(r.id)}" aria-pressed="${selected.id===r.id}"><span class="atlas-number ${r.tipo==='mar'?'sea':r.tipo==='mitica'?'myth':''}">${r.numero || '✧'}</span><span>${esc(r.nombre)}<small>${esc(categories[r.tipo] || 'Pendiente de ubicación')}${r.fichas.length>1?` · ${r.fichas.length} fichas`:''}</small></span><span aria-hidden="true">↗</span></button>`).join('') || '<p class="muted">No hay regiones con ese nombre.</p>';
      svg.querySelectorAll('.atlas-marker').forEach(node => { const r=geo.find(r=>r.id===node.dataset.region); node.style.display = matches(r)?'':'none'; });
    }
    function select(r, move=false) {
      selected=r;
      const items=r.fichas.map(id=>by.get(id));
      const area=areas.areas.find(a=>items[0].ar?.includes(a.id));
      const description=items.find(i=>i.r)?.r || (r.tipo==='mitica'?r.nota:area?.descripcion) || r.nota || 'Consulta la ficha para explorar esta región.';
      document.getElementById('atlas-selection').innerHTML=`<p class="eyebrow">${esc(categories[r.tipo] || 'Región por situar')}</p><h2>${esc(r.nombre)}</h2><p>${esc(description)}</p>${r.nota && r.nota!==description?`<p class="atlas-selection-note">${esc(r.nota)}</p>`:''}<div class="atlas-selection-links">${items.map(i=>`<a class="btn" href="${fichaURL(i.id)}">Abrir ${esc(items.length>1?i.n:'ficha')} ↗</a>`).join('')}${area?`<a href="lugares.html?area=${encodeURIComponent(area.id)}">Explorar lugares del área →</a>`:''}</div>`;
      svg.querySelectorAll('.atlas-marker').forEach(node=>{const on=node.dataset.region===r.id;node.classList.toggle('active',on);node.setAttribute('aria-pressed',String(on));});
      document.querySelectorAll('.atlas-myths [data-select]').forEach(node=>node.classList.toggle('active',node.dataset.select===r.id));
      if(move && validGeo(r)) { const [x,y]=project(r.coordenadas);setView([x-view[2]/2,y-view[3]/2,view[2],view[3]]); }
      const u=new URL(location.href);u.searchParams.set('region',r.id);history.replaceState(null,'',u);
      directory();
    }
    main.addEventListener('click',event=>{
      const selectNode=event.target.closest('[data-select]');
      if(selectNode){const r=entries.find(r=>r.id===selectNode.dataset.select);if(r)select(r,true);}
      const filterNode=event.target.closest('[data-filter]');
      if(filterNode){filter=filterNode.dataset.filter;main.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===filterNode)));directory();}
    });
    svg.addEventListener('click',event=>{const n=event.target.closest('[data-region]');if(n)select(geo.find(r=>r.id===n.dataset.region));});
    svg.addEventListener('keydown',event=>{const n=event.target.closest('[data-region]');if(n && ['Enter',' '].includes(event.key)){event.preventDefault();select(geo.find(r=>r.id===n.dataset.region));}});
    document.getElementById('atlas-search').addEventListener('input',event=>{search=fold(event.target.value.trim());directory();});
    document.getElementById('map-in').addEventListener('click',()=>zoom(.75));
    document.getElementById('map-out').addEventListener('click',()=>zoom(1/.75));
    document.getElementById('map-reset').addEventListener('click',()=>setView([0,0,W,H]));
    const pointers=new Map();let drag=null;
    const svgPoint=event=>{const p=svg.createSVGPoint();p.x=event.clientX;p.y=event.clientY;return p.matrixTransform(svg.getScreenCTM().inverse());};
    function beginGesture(){
      const pts=[...pointers.values()];
      if(pts.length===1){const p=svgPoint({clientX:pts[0].x,clientY:pts[0].y});drag={type:'pan',start:{sx:p.x,sy:p.y},view:[...view]};}
      else if(pts.length>=2)drag={type:'pinch',distance:Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y),view:[...view]};
    }
    svg.addEventListener('pointerdown',event=>{if(event.target.closest('[data-region]') || (event.pointerType==='mouse' && event.button!==0))return;const point=svgPoint(event);pointers.set(event.pointerId,{x:event.clientX,y:event.clientY,sx:point.x,sy:point.y});svg.setPointerCapture(event.pointerId);beginGesture();});
    svg.addEventListener('pointermove',event=>{
      if(!pointers.has(event.pointerId)||!drag)return;
      const prev=pointers.get(event.pointerId);pointers.set(event.pointerId,{...prev,x:event.clientX,y:event.clientY});
      const pts=[...pointers.values()];
      if(drag.type==='pinch'&&pts.length>=2){const dist=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);if(dist>0&&drag.distance>0){const w=drag.view[2]*drag.distance/dist;setView([drag.view[0]+(drag.view[2]-w)/2,drag.view[1]+(drag.view[3]-w*H/W)/2,w,w*H/W]);}}
      else if(drag.type==='pan'){const p=svgPoint(event);setView([view[0]+drag.start.sx-p.x,view[1]+drag.start.sy-p.y,view[2],view[3]]);}
    });
    const endGesture=event=>{pointers.delete(event.pointerId);drag=null;if(pointers.size)beginGesture();};
    svg.addEventListener('pointerup',endGesture);svg.addEventListener('pointercancel',endGesture);
    setView(view);select(selected);
  }
  window.HEL_MAP={init,project,pathFor};
})();
