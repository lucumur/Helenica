#!/usr/bin/env python3
"""Genera data/mapa/areas.geo.json: la silueta de cada gran área recortada contra la costa real.

Entrada:
  data/mapa/tierra.json  costa de Natural Earth 1:10m (dominio público), ya recortada y simplificada
  data/mapa/zonas.json   contornos aproximados de cada área, en [lon, lat], en orden de prioridad

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
        keep = {k: sz[k] for k in ('nombre', 'griego', 'padre', 'ficha', 'nota', 'nivel') if sz.get(k) not in (None, '')}
        if sz.get('capital'):
            keep['capital'] = sz['capital']
        subs[sz['id']] = keep
        subs[sz['id']].update({'poligonos': rings_of(g, 0.002), 'etiqueta': [round(lab.x, 3), round(lab.y, 3)], 'bbox': [round(v, 3) for v in g.bounds]})
    out = {'schema_version': 1,
           'fuente': 'Generado por scripts/build_mapa.py a partir de zonas.json y tierra.json (Natural Earth, dominio público)',
           'areas': res, 'subareas': subs}
    with open(os.path.join(M, 'areas.geo.json'), 'w', encoding='utf-8') as fh:
        json.dump(out, fh, ensure_ascii=False, separators=(',', ':'))
    print(f'areas.geo.json: {len(res)} áreas, {len(subs)} subregiones')


if __name__ == '__main__':
    sys.exit(main())
