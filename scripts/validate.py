#!/usr/bin/env python3
"""Valida las fichas de data/: JSON correcto, campos mínimos, ids únicos y enlaces internos.

Errores (rompen el build): JSON inválido, falta id/nombre, id distinto al nombre de archivo.
Avisos (no rompen): enlaces internos a fichas inexistentes.
"""
import json, os, re, glob, sys, math

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')
COLS = ['entes', 'eventos', 'lugares', 'objetos']
SLUG = re.compile(r'^[a-z0-9]+(?:-[a-z0-9]+)*$')
LINK = re.compile(r'\]\((entes|eventos|lugares|objetos):([a-z0-9-]+)\)')

errors, warns, known, recs = [], [], set(), []
try:
    AREAS = {a['id'] for a in json.load(open(os.path.join(DATA, 'areas.json'), encoding='utf-8'))['areas']}
except Exception as e:
    AREAS = set(); errors.append(f'data/areas.json: no se pudo leer ({e})')
try:
    _T = json.load(open(os.path.join(DATA, 'tipologia.json'), encoding='utf-8'))
    ESC, FOR, FUN, PER = ({x['id'] for x in _T[k]} for k in ('escalas', 'formas', 'funciones', 'periodos'))
except Exception as e:
    ESC = FOR = FUN = PER = set(); errors.append(f'data/tipologia.json: no se pudo leer ({e})')
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
        for a in rec.get('areas') or []:
            if a not in AREAS:
                errors.append(f'{rel}: área "{a}" no definida en data/areas.json')
        if col == 'lugares':
            if rec.get('escala') and rec['escala'] not in ESC:
                errors.append(f'{rel}: escala "{rec["escala"]}" no definida en data/tipologia.json')
            for fo in rec.get('forma') or []:
                if fo.get('tipo') not in FOR:
                    errors.append(f'{rel}: forma "{fo.get("tipo")}" no definida en data/tipologia.json')
                if fo.get('periodo') and fo['periodo'] not in PER:
                    errors.append(f'{rel}: periodo "{fo["periodo"]}" no definido en data/tipologia.json')
            for fu in rec.get('funciones') or []:
                if fu not in FUN:
                    errors.append(f'{rel}: función "{fu}" no definida en data/tipologia.json')
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

# Catálogo del mapa: referencias, tier, coordenadas y cobertura regional.
try:
    atlas = json.load(open(os.path.join(DATA, 'mapa', 'regiones.json'), encoding='utf-8'))
    regiones = {r['id'] for rel, r in recs if rel.startswith('data/lugares/') and r.get('escala') == 'region'}
    puntos, mapeadas, numeros = set(), set(), set()
    for punto in atlas['lugares']:
        pid = punto.get('id')
        pref = f'data/mapa/regiones.json ({pid})'
        if not isinstance(pid, str) or not SLUG.match(pid) or pid in puntos:
            errors.append(f'{pref}: id inválido o duplicado')
        puntos.add(pid)
        if not punto.get('nombre') or punto.get('tipo') not in ('region', 'mar', 'mitica'):
            errors.append(f'{pref}: nombre o tipo inválido')
        fichas = punto.get('fichas')
        if not isinstance(fichas, list) or not fichas:
            errors.append(f'{pref}: falta la lista de fichas'); continue
        for rid in fichas:
            if rid not in regiones:
                errors.append(f'{pref}: ficha {rid} inexistente o sin escala region')
            if rid in mapeadas:
                errors.append(f'{pref}: ficha {rid} asignada a más de una entrada')
            mapeadas.add(rid)
        coords = punto.get('coordenadas')
        if punto.get('tipo') == 'mitica':
            if coords is not None:
                errors.append(f'{pref}: un lugar mítico no debe tener coordenadas terrestres')
        else:
            valid = isinstance(coords, list) and len(coords) == 2 and all(type(x) in (int, float) and math.isfinite(x) for x in coords)
            if not valid or not (-180 <= coords[0] <= 180 and -90 <= coords[1] <= 90):
                errors.append(f'{pref}: coordenadas inválidas; usar [longitud, latitud]')
            numero = punto.get('numero')
            if type(numero) is not int or numero < 1 or numero in numeros:
                errors.append(f'{pref}: número de punto inválido o duplicado')
            numeros.add(numero)
    for rid in sorted(regiones - mapeadas):
        warns.append(f'data/lugares/{rid}.json: región pendiente de ubicación en el mapa')
except Exception as e:
    errors.append(f'data/mapa/regiones.json: catálogo inválido ({e})')

for w in warns[:200]: print('AVISO', w)
for e in errors: print('ERROR', e)
print(f'{len(recs)} fichas · {len(errors)} errores · {len(warns)} avisos')
sys.exit(1 if errors else 0)
