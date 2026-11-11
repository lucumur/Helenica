#!/usr/bin/env python3
"""Genera data/index.json a partir de data/<coleccion>/*.json.

El índice es lo que cargan las listas y lo que usa cada ficha para resolver
nombres, relaciones inversas (hijos, apariciones en eventos, lugares contenidos)
y enlaces de retorno. Se regenera solo en GitHub Actions; también puede
correrse localmente:  python scripts/build_index.py
"""
import json, os, re, glob, sys, base64, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')
COLS = ['entes', 'eventos', 'lugares', 'objetos']
LINK = re.compile(r'\]\((entes|eventos|lugares|objetos):([a-z0-9-]+)\)')


def plain(md, n=220):
    s = re.sub(r'!\[[^\]]*\]\([^)]*\)', '', md or '')
    s = re.sub(r'\[([^\]]*)\]\([^)]*\)', r'\1', s)
    s = re.sub(r'[*_`#>]|^\s*-\s*', '', s, flags=re.M)
    s = re.sub(r'\s+', ' ', s).strip()
    return (s[:n].rsplit(' ', 1)[0] + '…') if len(s) > n else s


def ids(rec, key):
    """Refs explícitas + enlaces [x](col:slug) escritos en el texto del campo."""
    v = rec.get(key)
    out = []
    if isinstance(v, dict):
        out = [f"{r['col']}:{r['id']}" for r in v.get('refs', []) if r.get('id') and r.get('col')]
        out += [f'{c}:{i}' for c, i in LINK.findall(v.get('texto') or '')]
    elif isinstance(v, list):
        out = [f"{r['col']}:{r['id']}" for r in v if isinstance(r, dict) and r.get('id') and r.get('col')]
    seen = []
    for k in out:
        if k not in seen: seen.append(k)
    return seen


def outlinks(obj, acc):
    if isinstance(obj, dict):
        if obj.get('col') in COLS and obj.get('id'):
            acc.add(f"{obj['col']}:{obj['id']}")
        for v in obj.values():
            outlinks(v, acc)
    elif isinstance(obj, list):
        for v in obj:
            outlinks(v, acc)
    elif isinstance(obj, str):
        for m in LINK.finditer(obj):
            acc.add(f'{m.group(1)}:{m.group(2)}')


ICON_DIR = os.path.join(DATA, 'iconos')
EXT = {'png': 'png', 'jpeg': 'jpg', 'jpg': 'jpg', 'webp': 'webp', 'gif': 'gif', 'svg+xml': 'svg', 'x-icon': 'ico', 'vnd.microsoft.icon': 'ico'}


def icon_ref(col, rid, icon, written):
    """Icono para el índice: emoji, URL o ruta tal cual; las imágenes data: se vuelcan a data/iconos/ para no inflar el índice."""
    icon = (icon or '').strip()
    m = re.match(r'^data:image/([\w.+-]+)(;base64)?,(.*)$', icon, re.S)
    if not m:
        return icon or None
    ext = EXT.get(m.group(1).lower(), 'png')
    raw = base64.b64decode(m.group(3)) if m.group(2) else urllib.parse.unquote_to_bytes(m.group(3))
    name = f'{col}--{rid}.{ext}'
    os.makedirs(ICON_DIR, exist_ok=True)
    path = os.path.join(ICON_DIR, name)
    if not os.path.exists(path) or open(path, 'rb').read() != raw:
        with open(path, 'wb') as fh:
            fh.write(raw)
    written.add(name)
    return f'data/iconos/{name}'


def main():
    items = []
    icons_written = set()
    years = [p['anio'] for p in json.load(open(os.path.join(DATA, 'mapa', 'periodos.json'), encoding='utf-8'))['periodos']]
    rng = {p['id']: (p.get('desde'), p.get('hasta')) for p in json.load(open(os.path.join(DATA, 'tipologia.json'), encoding='utf-8'))['periodos']}
    inr = lambda y, a, b: (a is None or a <= y) and (b is None or y <= b)
    for col in COLS:
        for path in sorted(glob.glob(os.path.join(DATA, col, '*.json'))):
            with open(path, encoding='utf-8') as fh:
                rec = json.load(fh)
            desc = rec.get('descripcion', {}).get('texto') if isinstance(rec.get('descripcion'), dict) else ''
            if not desc:
                c = next((c for c in rec.get('campos', []) if c.get('etiqueta') in ('Descripción', 'Función')), None)
                desc = c['texto'] if c else ''
            if not desc and rec.get('secciones'):
                desc = rec['secciones'][0].get('texto', '')
            links = set()
            outlinks(rec, links)
            links.discard(f'{col}:{rec["id"]}')
            it = {
                'c': col, 'id': rec['id'], 'n': rec.get('nombre'), 'alt': rec.get('nombre_alt'),
                't': rec.get('tipos') or ([rec['tipo']] if rec.get('tipo') else []),
                'r': plain(desc), 'img': rec.get('imagen') or None,
                'out': sorted(links),
            }
            ic = icon_ref(col, rec['id'], rec.get('icono'), icons_written)
            if ic:
                it['ic'] = ic
            if col == 'entes':
                it.update({'g': rec.get('genero'), 'pa': ids(rec, 'padres'), 'co': ids(rec, 'conyuges'),
                           'hi': ids(rec, 'hijos'), 'asp': ids(rec, 'aspecto_de')})
                if rec.get('aspecto_de') and rec['aspecto_de'].get('id'):
                    it['asp'] = [f"entes:{rec['aspecto_de']['id']}"]
            elif col == 'eventos':
                it.update({'ag': ids(rec, 'agentes_activos') + ids(rec, 'agentes_pasivos'), 'do': ids(rec, 'donde'),
                           'el': ids(rec, 'elementos'), 'cu': plain(rec.get('cuando', {}).get('texto', ''), 60) if isinstance(rec.get('cuando'), dict) else ''})
                if rec.get('serie'):
                    it['se'] = rec['serie']
            elif col == 'lugares':
                it['pe'] = ids(rec, 'pertenece_a')
                if rec.get('sucede_a'):
                    it['sa'] = ids(rec, 'sucede_a')
                    if rec.get('hereda') and len(it['sa']) == 1:
                        it['he'] = 1
                if isinstance((rec.get('epoca') or {}).get('anio'), int):
                    it['ep'] = rec['epoca']['anio']
                it['ar'] = rec.get('areas') or []
                it['es'] = rec.get('escala')
                it['fo'] = sorted({x.get('tipo') for x in rec.get('forma') or [] if x.get('tipo')})
                it['fu'] = rec.get('funciones') or []
                pt = (rec.get('geo') or {}).get('punto')
                if pt:
                    it['pt'] = pt
                    if (rec.get('geo') or {}).get('precision') == 'heredada':
                        it['ph'] = 1
                g = rec.get('geo') or {}
                if g.get('desde') is not None or g.get('hasta') is not None:
                    it['vi'] = [g.get('desde'), g.get('hasta')]
                # Fechas del selector que cubre: época de referencia, vigencia (geo.desde/hasta) o periodos de su forma.
                fe = set()
                if (rec.get('epoca') or {}).get('anio') in years:
                    fe.add(rec['epoca']['anio'])
                if 'vi' in it:
                    fe.update(y for y in years if inr(y, *it['vi']))
                for x in rec.get('forma') or []:
                    if x.get('periodo') in rng:
                        fe.update(y for y in years if inr(y, *rng[x['periodo']]))
                if fe:
                    it['fe'] = sorted(fe)
            if rec.get('contenido_en', {}).get('id'):
                it['en'] = f"{rec['contenido_en']['col']}:{rec['contenido_en']['id']}"
            items.append(it)
    # Punto heredado: un lugar sin coordenadas toma las del primer contenedor que las tenga.
    by = {f"{i['c']}:{i['id']}": i for i in items}
    # Herencia entre fechas: una ficha con hereda toma del antecesor el resumen y el punto que le falten.
    for it in items:
        seen, cur = set(), it
        while cur.get('he') and cur['id'] not in seen and not (it.get('r') and it.get('pt')):
            seen.add(cur['id'])
            cur = by.get(cur['sa'][0])
            if not cur:
                break
            if not it.get('r') and cur.get('r'):
                it['r'] = cur['r']
            if not it.get('pt') and cur.get('pt'):
                it['pt'] = cur['pt']
    for it in items:
        if it['c'] != 'lugares' or it.get('pt'):
            continue
        seen, cur = set(), it
        while cur and f"{cur['c']}:{cur['id']}" not in seen:
            seen.add(f"{cur['c']}:{cur['id']}")
            up = (cur.get('pe') or [None])[0] or cur.get('en')
            cur = by.get(up) if up else None
            if cur and cur.get('pt'):
                it['ptx'] = cur['pt']
                break
    if os.path.isdir(ICON_DIR):
        for f in os.listdir(ICON_DIR):
            if f not in icons_written:
                os.remove(os.path.join(ICON_DIR, f))
    out = {'schema_version': 1, 'total': len(items), 'items': items}
    with open(os.path.join(DATA, 'index.json'), 'w', encoding='utf-8') as fh:
        json.dump(out, fh, ensure_ascii=False, separators=(',', ':'))
    print(f'index.json: {len(items)} fichas')


if __name__ == '__main__':
    sys.exit(main())
