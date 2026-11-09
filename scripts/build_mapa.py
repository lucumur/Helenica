#!/usr/bin/env python3
"""Genera data/mapa/areas.geo.json: la silueta de cada gran área recortada contra la costa real.

Entrada:
  data/mapa/tierra.json  costa de Natural Earth 1:10m (dominio público), ya recortada y simplificada
  data/mapa/zonas.json   contornos aproximados de cada área, en [lon, lat], en orden de prioridad;
                         también los de tier 0 por fecha (clave "tier0"), que toman nombres de su ficha,
                         y los de tier 1 por fecha (clave "tier1"), recortados además contra la zona de tier 0
                         a la que pertenece su ficha (pertenece_a)

Reglas:
  - zona "continente": corta la tierra firme (el gran polígono Eurasia-África) y toma además
    las islas cuyo punto interior cae dentro.
  - zona "islas": solo toma islas completas. "toma_islas": false impide que una zona continental se quede con islas.
  - si dos zonas se solapan, gana la que aparece antes en zonas.json.

Requiere shapely (pip install shapely). Uso: python scripts/build_mapa.py
"""
import json, os, sys
from shapely.geometry import Polygon, MultiPolygon, Point, mapping, shape
from shapely.ops import unary_union, polylabel

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
M = os.path.join(ROOT, 'data', 'mapa')


def poly(rings):
    return Polygon(rings[0], rings[1:]).buffer(0)


def zone_geom(z):
    p = z['poligono']
    if isinstance(p[0][0], list):
        return unary_union([Polygon(r).buffer(0) for r in p])
    return Polygon(p).buffer(0)


def rings_of(g, tol):
    g = g.simplify(tol, preserve_topology=True)
    parts = list(g.geoms) if hasattr(g, 'geoms') else [g]
    out = []
    for p in parts:
        if p.geom_type != 'Polygon' or p.is_empty or p.area < 1e-5:
            continue
        rr = []
        for ring in [p.exterior, *p.interiors]:
            c = [[round(x, 3), round(y, 3)] for x, y in ring.coords]
            if len(c) >= 4:
                rr.append(c)
        if rr:
            out.append(rr)
    return out


def main():
    tierra = json.load(open(os.path.join(M, 'tierra.json'), encoding='utf-8'))['poligonos']
    zonas = json.load(open(os.path.join(M, 'zonas.json'), encoding='utf-8'))['zonas']
    lands = [poly(r) for r in tierra]
    lands = [l for l in lands if not l.is_empty]
    big = max(lands, key=lambda g: g.area)
    islands = [l for l in lands if l is not big]
    taken_isl = set()
    assigned = []  # geometrías ya asignadas de tierra firme
    res = {}
    for z in zonas:
        zg = zone_geom(z)
        parts = []
        if z.get('tipo') == 'continente':
            cut = big.intersection(zg)
            for a in assigned:
                cut = cut.difference(a)
            if not cut.is_empty:
                parts.append(cut)
                assigned.append(cut)
        for i, isl in enumerate(islands):
            if i in taken_isl or z.get('toma_islas') is False:
                continue
            if zg.contains(isl.representative_point()):
                parts.append(isl)
                taken_isl.add(i)
        if not parts:
            continue
        g = unary_union(parts)
        main_part = max(list(g.geoms) if hasattr(g, 'geoms') else [g], key=lambda p: p.area)
        try:
            lab = polylabel(main_part, tolerance=0.01)
        except Exception:
            lab = main_part.representative_point()
        res[z['area']] = {
            'poligonos': rings_of(g, 0.003),
            'etiqueta': [round(lab.x, 3), round(lab.y, 3)],
            'bbox': [round(v, 3) for v in g.bounds],
        }
    # Subregiones: contorno ∩ silueta del área madre (sin solapes: gana la primera).
    subs, taken = {}, None
    area_geom = {}
    for z in zonas:
        pass
    for sz in json.load(open(os.path.join(M, 'zonas.json'), encoding='utf-8')).get('subzonas', []):
        par = res.get(sz['padre'])
        if not par:
            continue
        pg = area_geom.get(sz['padre'])
        if pg is None:
            pg = unary_union([poly(r) for r in par['poligonos']]).buffer(0)
            area_geom[sz['padre']] = pg
        g = pg.intersection(Polygon(sz['poligono']).buffer(0))
        if taken is not None:
            g = g.difference(taken)
        if g.is_empty and sz.get('sintetica'):
            g = Polygon(sz['poligono']).buffer(0)
        elif g.is_empty:
            continue
        taken = g if taken is None else unary_union([taken, g])
        main_part = max(list(g.geoms) if hasattr(g, 'geoms') else [g], key=lambda p: p.area)
        lab = polylabel(main_part, tolerance=0.005)
        keep = {k: sz[k] for k in ('nombre', 'nombre_es', 'griego', 'padre', 'ficha', 'nota', 'nivel') if sz.get(k) not in (None, '')}
        if sz.get('capital'):
            keep['capital'] = sz['capital']
        subs[sz['id']] = keep
        subs[sz['id']].update({'poligonos': rings_of(g, 0.002), 'etiqueta': [round(lab.x, 3), round(lab.y, 3)], 'bbox': [round(v, 3) for v in g.bounds]})
    # Tier 0: zonas continentales por fecha. Mismo recorte que las áreas, independiente de ellas.
    tier0, t0geom = {}, {}
    for anio, zs in (json.load(open(os.path.join(M, 'zonas.json'), encoding='utf-8')).get('tier0') or {}).items():
        if not isinstance(zs, list):
            continue
        taken_t, taken_i, out_z = [], set(), []
        for z in zs:
            zg = zone_geom(z)
            cut = big.intersection(zg)
            for a in taken_t:
                cut = cut.difference(a)
            parts = [cut] if not cut.is_empty else []
            if parts:
                taken_t.append(cut)
            for i, isl in enumerate(islands):
                if i not in taken_i and zg.contains(isl.representative_point()):
                    parts.append(isl); taken_i.add(i)
            if not parts:
                continue
            g = unary_union(parts)
            t0geom.setdefault(anio, {})[z['ficha']] = g
            main_part = max(list(g.geoms) if hasattr(g, 'geoms') else [g], key=lambda p: p.area)
            lab = polylabel(main_part, tolerance=0.01)
            rec = json.load(open(os.path.join(ROOT, 'data', 'lugares', z['ficha'] + '.json'), encoding='utf-8'))
            out_z.append({'ficha': z['ficha'], 'color': z.get('color'), 'nombre': rec.get('nombre'), 'nombre_alt': rec.get('nombre_alt'),
                          'nombre_griego': rec.get('nombre_griego'), 'endonimo': rec.get('endonimo'), 'endonimo_nota': rec.get('endonimo_nota'),
                          'poligonos': rings_of(g, 0.01), 'etiqueta': [round(lab.x, 3), round(lab.y, 3)], 'bbox': [round(v, 3) for v in g.bounds]})
        tier0[anio] = out_z
    # Tier 1: regiones por fecha. "tipo": "islas" solo toma islas completas; "toma_islas": false no toma islas.
    # Cada región se recorta además contra la zona de tier 0 de su ficha (pertenece_a), si existe en esa fecha.
    tier1 = {}
    for anio, zs in (json.load(open(os.path.join(M, 'zonas.json'), encoding='utf-8')).get('tier1') or {}).items():
        if not isinstance(zs, list):
            continue
        taken_t, taken_i, out_z = [], set(), []
        for z in zs:
            zg = zone_geom(z)
            parts = []
            if z.get('tipo') != 'islas':
                cut = big.intersection(zg)
                for a in taken_t:
                    cut = cut.difference(a)
                if not cut.is_empty:
                    parts.append(cut); taken_t.append(cut)
            if z.get('toma_islas') is not False:
                for i, isl in enumerate(islands):
                    if i not in taken_i and zg.contains(isl.representative_point()):
                        parts.append(isl); taken_i.add(i)
            if not parts:
                continue
            rec = json.load(open(os.path.join(ROOT, 'data', 'lugares', z['ficha'] + '.json'), encoding='utf-8'))
            g = unary_union(parts)
            padre = next((r['id'] for r in rec.get('pertenece_a') or [] if r['id'] in t0geom.get(anio, {})), None)
            if padre:
                g = g.intersection(t0geom[anio][padre])
            if g.is_empty:
                continue
            main_part = max(list(g.geoms) if hasattr(g, 'geoms') else [g], key=lambda p: p.area)
            lab = polylabel(main_part, tolerance=0.005)
            out_z.append({'ficha': z['ficha'], 'color': z.get('color'), 'padre': padre, 'areas': rec.get('areas') or [],
                          'tipos': rec.get('tipos') or [], 'nombre': rec.get('nombre'), 'nombre_alt': rec.get('nombre_alt'),
                          'nombre_griego': rec.get('nombre_griego'), 'endonimo': rec.get('endonimo'), 'endonimo_nota': rec.get('endonimo_nota'),
                          'poligonos': rings_of(g, 0.003), 'etiqueta': [round(lab.x, 3), round(lab.y, 3)], 'bbox': [round(v, 3) for v in g.bounds]})
        tier1[anio] = out_z
    out = {'schema_version': 1,
           'fuente': 'Generado por scripts/build_mapa.py a partir de zonas.json y tierra.json (Natural Earth, dominio público)',
           'areas': res, 'subareas': subs, 'tier0': tier0, 'tier1': tier1}
    with open(os.path.join(M, 'areas.geo.json'), 'w', encoding='utf-8') as fh:
        json.dump(out, fh, ensure_ascii=False, separators=(',', ':'))
    print(f'areas.geo.json: {len(res)} áreas, {len(subs)} subregiones, tier 0: ' + ', '.join(f'{k} ({len(v)})' for k, v in tier0.items())
          + ', tier 1: ' + ', '.join(f'{k} ({len(v)})' for k, v in tier1.items()))


if __name__ == '__main__':
    sys.exit(main())
