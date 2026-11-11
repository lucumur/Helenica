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

# Mapa: puntos de las fichas y zonas de áreas.
for rel, r in recs:
    g = r.get('geo')
    if g is None:
        continue
    pt = g.get('punto') if isinstance(g, dict) else None
    if pt is None and isinstance(g, dict) and ('desde' in g or 'hasta' in g):
        continue
    ok = isinstance(pt, list) and len(pt) == 2 and all(type(x) in (int, float) and math.isfinite(x) for x in pt)
    if not ok or not (-30 <= pt[0] <= 80 and 0 <= pt[1] <= 70):
        errors.append(f'{rel}: geo.punto debe ser [longitud, latitud]')
try:
    zonas = json.load(open(os.path.join(DATA, 'mapa', 'zonas.json'), encoding='utf-8'))['zonas']
    for z in zonas:
        if z.get('area') not in AREAS:
            errors.append(f'data/mapa/zonas.json: área "{z.get("area")}" no definida en data/areas.json')
        if z.get('tipo') not in ('continente', 'islas'):
            errors.append(f'data/mapa/zonas.json ({z.get("area")}): tipo debe ser "continente" o "islas"')
    lug = {r.get('id'): r for rel, r in recs if '/lugares/' in rel or rel.startswith('lugares')}
    for anio, zs in (json.load(open(os.path.join(DATA, 'mapa', 'zonas.json'), encoding='utf-8')).get('tier0') or {}).items():
        if not isinstance(zs, list):
            continue
        for z in zs:
            r = lug.get(z.get('ficha'))
            lab = f'data/mapa/zonas.json (tier0 {anio}, {z.get("ficha")})'
            if r is None:
                errors.append(f'{lab}: ficha inexistente'); continue
            if r.get('escala') != 'continental':
                errors.append(f'{lab}: la ficha debe tener escala "continental"')
            if (r.get('epoca') or {}).get('anio') != int(anio):
                warns.append(f'{lab}: la época de la ficha no coincide con la fecha')
            if not r.get('nombre_griego') or not r.get('nombre_alt'):
                warns.append(f'{lab}: faltan nombre_griego o nombre_alt')
    # Tiers 1 y 2 por fecha: ficha, escala, época, zona madre con contorno en la misma fecha y contorno bien formado.
    _Z = json.load(open(os.path.join(DATA, 'mapa', 'zonas.json'), encoding='utf-8'))
    ESCALA = {'tier0': {'continental'}, 'tier1': {'region'}, 'tier2': {'ethnos', 'dominio'}}
    SUPERIOR = {'tier1': 'tier0', 'tier2': 'tier1'}
    con_contorno = {k: {a: {z.get('ficha') for z in zs} for a, zs in (_Z.get(k) or {}).items() if isinstance(zs, list)} for k in ESCALA}
    for key in ESCALA:
        for anio, zs in (_Z.get(key) or {}).items():
            if not isinstance(zs, list):
                continue
            vistos = set()
            for z in zs:
                lab = f'data/mapa/zonas.json ({key} {anio}, {z.get("ficha")})'
                if z.get('ficha') in vistos:
                    errors.append(f'{lab}: ficha repetida en la misma fecha')
                vistos.add(z.get('ficha'))
                p = z.get('poligono')
                anillos = p if isinstance(p, list) and p and isinstance(p[0], list) and p[0] and isinstance(p[0][0], list) else [p]
                for an in anillos:
                    if not (isinstance(an, list) and len(an) >= 3 and all(isinstance(c, list) and len(c) == 2 and all(type(x) in (int, float) and math.isfinite(x) for x in c) and -30 <= c[0] <= 80 and 0 <= c[1] <= 70 for c in an)):
                        errors.append(f'{lab}: contorno inválido (mínimo tres vértices [longitud, latitud])'); break
                if key == 'tier0':
                    continue
                r = lug.get(z.get('ficha'))
                if r is None:
                    errors.append(f'{lab}: ficha inexistente'); continue
                if r.get('escala') not in ESCALA[key]:
                    errors.append(f'{lab}: la ficha debe tener escala {" o ".join(sorted(ESCALA[key]))}')
                if (r.get('epoca') or {}).get('anio') != int(anio):
                    warns.append(f'{lab}: la época de la ficha no coincide con la fecha')
                if not any(x.get('id') in con_contorno[SUPERIOR[key]].get(anio, set()) for x in r.get('pertenece_a') or []):
                    warns.append(f'{lab}: pertenece_a no apunta a ninguna zona de {SUPERIOR[key]} con contorno en esa fecha')
                if not r.get('nombre_griego') or not r.get('nombre_alt'):
                    warns.append(f'{lab}: faltan nombre_griego o nombre_alt')
    # Fichas fechadas de tier 0–2 que no tienen contorno en su fecha.
    for rid, r in lug.items():
        an = (r.get('epoca') or {}).get('anio')
        if an is None or not str(rid).endswith(str(an)):
            continue
        for key, escalas in ESCALA.items():
            if r.get('escala') in escalas and str(an) in con_contorno[key] and rid not in con_contorno[key][str(an)]:
                warns.append(f'data/lugares/{rid}.json: ficha de {key} sin contorno en data/mapa/zonas.json para {an}')
except Exception as e:
    errors.append(f'data/mapa/zonas.json: no se pudo leer ({e})')

# Physical overlays must stay tied to real place records and explicit sources.
try:
    physical = json.load(open(os.path.join(DATA, 'mapa', 'fisico.json'), encoding='utf-8'))
    physical_ids, physical_places = set(), set()
    for f in physical['accidentes']:
        label = f'data/mapa/fisico.json ({f.get("id")})'
        if not SLUG.fullmatch(f.get('id', '')) or f['id'] in physical_ids:
            errors.append(f'{label}: id inválido o duplicado')
        physical_ids.add(f['id'])
        if f.get('tipo') not in ('rio', 'monte') or f.get('fuente') not in physical['fuentes']:
            errors.append(f'{label}: tipo o fuente inválidos'); continue
        if not f.get('lugares'):
            errors.append(f'{label}: falta ficha vinculada')
        for place in f['lugares']:
            if f'lugares:{place}' not in known or place in physical_places:
                errors.append(f'{label}: ficha inexistente o asignada a dos geometrías ({place})')
            physical_places.add(place)
        lines = f['lineas'] if f['tipo'] == 'rio' else [ring for poly in f['poligonos'] for ring in poly]
        if not lines:
            errors.append(f'{label}: geometría vacía')
        for line in lines:
            if len(line) < (2 if f['tipo'] == 'rio' else 4):
                errors.append(f'{label}: trazado demasiado corto')
            if f['tipo'] == 'monte' and line[0] != line[-1]:
                errors.append(f'{label}: anillo sin cerrar')
        coords = [pt for line in lines for pt in line] + [f['punto']]
        box = f['bbox']
        if len(box) != 4 or not all(type(x) in (int, float) and math.isfinite(x) for x in box) or not (box[0] < box[2] and box[1] < box[3]):
            errors.append(f'{label}: bbox inválida'); continue
        for pt in coords:
            if not (len(pt) == 2 and all(type(x) in (int, float) and math.isfinite(x) for x in pt)
                    and -30 <= pt[0] <= 80 and 0 <= pt[1] <= 70
                    and box[0] - .00001 <= pt[0] <= box[2] + .00001 and box[1] - .00001 <= pt[1] <= box[3] + .00001):
                errors.append(f'{label}: coordenada inválida o fuera de su bbox'); break
except Exception as e:
    errors.append(f'data/mapa/fisico.json: no se pudo validar ({e})')

# «Contiene» curado: cada lugar listado debe declarar pertenece_a → la ficha, y cada hijo directo debe estar listado.
byid = {r.get('id'): (rel, r) for rel, r in recs if rel.startswith('lugares/') or '/lugares/' in rel}
for rel, r in list(byid.values()):
    if not r.get('contiene'): continue
    listed = set()
    for g in r['contiene']:
        if not isinstance(g, dict) or not isinstance(g.get('lugares'), list):
            errors.append(f'{rel}: contiene debe ser una lista de grupos {{grupo, nota, lugares}}'); continue
        for x in g['lugares']:
            cid = x.get('id'); listed.add(cid)
            if cid in byid and not any(p.get('id') == r['id'] for p in byid[cid][1].get('pertenece_a') or []):
                warns.append(f"{rel}: contiene {cid}, pero {cid} no declara pertenece_a {r['id']}")
    for cid, (crel, c) in byid.items():
        if cid not in listed and any(p.get('id') == r['id'] for p in c.get('pertenece_a') or []):
            warns.append(f"{rel}: {cid} pertenece a esta ficha pero no está en ningún grupo de contiene")

for rel, r in list(byid.values()):
    ep = r.get('epoca')
    if ep is not None and not (isinstance(ep, dict) and isinstance(ep.get('anio'), int)):
        errors.append(f'{rel}: epoca debe ser {{"anio": -300, "nota": "…"}}')
    if r.get('escala') in ('region', 'archipielago') and ep is None and not set(r.get('areas') or []) & {'inframundo'} and 'Mar' not in ' '.join(r.get('tipos') or []):
        warns.append(f'{rel}: región sin epoca (estándar: 300 a.C.)')

for w in warns[:200]: print('AVISO', w)
for e in errors: print('ERROR', e)
print(f'{len(recs)} fichas · {len(errors)} errores · {len(warns)} avisos')
sys.exit(1 if errors else 0)
