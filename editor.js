/* Modo edición: guarda fichas como commits en GitHub con un token fine-grained
   (solo el repo helenica, permiso Contents: Read and write). El token vive solo en este navegador. */
(function () {
  'use strict';
  const REPO = 'lucumur/helenica', BRANCH = 'main', TK = 'helenica-token', ON = 'helenica-edit';
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
    lugares: n => ({ id: '', nombre: n, nombre_alt: null, tipos: ['Lugar'], imagen: null, pertenece_a: [],
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
