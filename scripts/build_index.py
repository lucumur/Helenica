#!/usr/bin/env python3
"""Genera data/index.json a partir de data/<coleccion>/*.json.

El índice es lo que cargan las listas y lo que usa cada ficha para resolver
nombres, relaciones inversas (hijos, apariciones en eventos, lugares contenidos)
y enlaces de retorno. Se regenera solo en GitHub Actions; también puede
correrse localmente:  python scripts/build_index.py
"""
import json, os, re, glob, sys

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


def main():
    items = []
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
                it['ar'] = rec.get('areas') or []
                it['es'] = rec.get('escala')
                it['fo'] = sorted({x.get('tipo') for x in rec.get('forma') or [] if x.get('tipo')})
                it['fu'] = rec.get('funciones') or []
            if rec.get('contenido_en', {}).get('id'):
                it['en'] = f"{rec['contenido_en']['col']}:{rec['contenido_en']['id']}"
            items.append(it)
    out = {'schema_version': 1, 'total': len(items), 'items': items}
    with open(os.path.join(DATA, 'index.json'), 'w', encoding='utf-8') as fh:
        json.dump(out, fh, ensure_ascii=False, separators=(',', ':'))
    print(f'index.json: {len(items)} fichas')


if __name__ == '__main__':
    sys.exit(main())
