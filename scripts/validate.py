#!/usr/bin/env python3
"""Valida las fichas de data/: JSON correcto, campos mínimos, ids únicos y enlaces internos.

Errores (rompen el build): JSON inválido, falta id/nombre, id distinto al nombre de archivo.
Avisos (no rompen): enlaces internos a fichas inexistentes.
"""
import json, os, re, glob, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')
COLS = ['entes', 'eventos', 'lugares', 'objetos']
SLUG = re.compile(r'^[a-z0-9]+(?:-[a-z0-9]+)*$')
LINK = re.compile(r'\]\((entes|eventos|lugares|objetos):([a-z0-9-]+)\)')

errors, warns, known, recs = [], [], set(), []
for col in COLS:
    for path in glob.glob(os.path.join(DATA, col, '*.json')):
        rel = os.path.relpath(path, ROOT)
        try:
            rec = json.load(open(path, encoding='utf-8'))
        except Exception as e:
            errors.append(f'{rel}: JSON inválido ({e})'); continue
        rid = rec.get('id')
        if not rid or not SLUG.match(rid):
            errors.append(f'{rel}: id ausente o con caracteres no válidos')
        elif rid != os.path.basename(path)[:-5]:
            errors.append(f'{rel}: el id "{rid}" no coincide con el nombre del archivo')
        if not rec.get('nombre'):
            errors.append(f'{rel}: falta "nombre"')
        known.add(f'{col}:{rid}'); recs.append((rel, rec))

def scan(obj, rel):
    if isinstance(obj, dict):
        if obj.get('col') in COLS and obj.get('id') and f"{obj['col']}:{obj['id']}" not in known:
            warns.append(f"{rel}: referencia a {obj['col']}:{obj['id']} que no existe")
        for v in obj.values(): scan(v, rel)
    elif isinstance(obj, list):
        for v in obj: scan(v, rel)
    elif isinstance(obj, str):
        for m in LINK.finditer(obj):
            if f'{m.group(1)}:{m.group(2)}' not in known:
                warns.append(f'{rel}: enlace a {m.group(1)}:{m.group(2)} que no existe')

for rel, rec in recs:
    scan(rec, rel)

for w in warns[:200]: print('AVISO', w)
for e in errors: print('ERROR', e)
print(f'{len(recs)} fichas · {len(errors)} errores · {len(warns)} avisos')
sys.exit(1 if errors else 0)
