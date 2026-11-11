#!/usr/bin/env python3
"""Genera data/mapa/areas.geo.json: la silueta de cada gran área recortada contra la costa real.

Entrada:
  data/mapa/tierra.json  costa de Natural Earth 1:10m (dominio público), ya recortada y simplificada
  data/mapa/zonas.json   contornos aproximados de cada área, en [lon, lat], en orden de prioridad;
                         también los de tier 0 por fecha (clave "tier0"), que toman nombres de su ficha,
                         y los de tier 1 por fecha (clave "tier1"), recortados además contra la zona de tier 0
                         a la que pertenece su ficha (pertenece_a); igual los de tier 2 (clave "tier2") contra su región de tier 1

Reglas:
  - zona "continente": corta la tierra firme (el gran polígono Eurasia-África) y toma además
    las islas cuyo punto interior cae dentro.
  - zona "islas": solo toma islas completas. "toma_islas": false impide que una zona continental se quede con islas.
  - si dos zonas se solapan, gana la que aparece antes en zonas.json.
  - tiers 1 y 2: el contorno solo actúa dentro de su zona madre; "corta_islas": true reparte una isla
    entre varias regiones (toma el trozo que cae en el contorno en vez de la isla entera).

Requiere shapely (pip install shapely). Uso: python scripts/build_mapa.py
"""
import json, os, sys
from shapely.geometry import Polygon, MultiPolygon, Point, mapping, shape
from shapely.ops import unary_union, polylabel

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
M = os.path.join(ROOT, 'data', 'mapa')


def poly(rings):
    return Polygon(rings[0], rings[1:]).buffer(0)


HEREDABLES = ('poligono', 'tipo', 'toma_islas', 'corta_islas', 'color')


def resolver_iguales(zonas):
    """«igual_que»: un contorno de tier 0–2 puede remitir al de otra ficha (normalmente la misma región en la
    fecha anterior) en vez de repetir el polígono. Hereda también tipo, toma_islas, corta_islas y color."""
    src = {}
    for key in ('tier0', 'tier1', 'tier2'):
        for zs in (zonas.get(key) or {}).values():
            if isinstance(zs, list):
                for z in zs:
                    src[z['ficha']] = z
    for z in src.values():
        seen, cur = set(), z
        while 'poligono' not in cur and cur.get('igual_que') in src and cur['ficha'] not in seen:
            seen.add(cur['ficha'])
            cur = src[cur['igual_que']]
        if cur is not z and 'poligono' in cur:
            for k in HEREDABLES:
                if k in cur and k not in z:
                    z[k] = cur[k]
    return zonas


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
    ZONAS = resolver_iguales(json.load(open(os.path.join(M, 'zonas.json'), encoding='utf-8')))
    avisos = []
    zonas = ZONAS['zonas']
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
    for sz in ZONAS.get('subzonas', []):
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
    for anio, zs in (ZONAS.get('tier0') or {}).items():
        if not isinstance(zs, list):
            continue
        taken_t, taken_i, out_z = [], set(), []
        for z in zs:
            if 'poligono' not in z:
                avisos.append(f'tier0 {anio}: {z["ficha"]} no tiene poligono ni un igual_que válido')
                continue
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
    # Tiers 1 y 2 por fecha: "tipo": "islas" solo toma islas completas; "toma_islas": false no toma islas.
    # Cada contorno se recorta además contra la zona del tier superior de su ficha (pertenece_a), si existe en esa fecha.
    def build_tier(key, parents):
        res_t, geoms = {}, {}
        for anio, zs in (ZONAS.get(key) or {}).items():
            if not isinstance(zs, list):
                continue
            taken_t, taken_i, cut_i, out_z = [], set(), {}, []
            for z in zs:
                if 'poligono' not in z:
                    avisos.append(f'{key} {anio}: {z["ficha"]} no tiene poligono ni un igual_que válido')
                    continue
                zg = zone_geom(z)
                rec = json.load(open(os.path.join(ROOT, 'data', 'lugares', z['ficha'] + '.json'), encoding='utf-8'))
                padre = next((r['id'] for r in rec.get('pertenece_a') or [] if r['id'] in parents.get(anio, {})), None)
                pg = parents[anio][padre] if padre else None
                # El contorno solo actúa dentro de su zona madre: así no le quita terreno a regiones de otra zona.
                zc = zg.intersection(pg) if pg is not None else zg
                parts = []
                if z.get('tipo') != 'islas':
                    cut = big.intersection(zc)
                    for a in taken_t:
                        cut = cut.difference(a)
                    if not cut.is_empty:
                        parts.append(cut); taken_t.append(cut)
                if z.get('corta_islas'):
                    # Reparte una isla grande entre varias regiones: toma solo el trozo que cae en el contorno.
                    for i, isl in enumerate(islands):
                        if i in taken_i or not zc.intersects(isl):
                            continue
                        piece = isl.intersection(zc)
                        if i in cut_i:
                            piece = piece.difference(cut_i[i])
                        if piece.is_empty or piece.area < 1e-6:
                            continue
                        parts.append(piece)
                        cut_i[i] = piece if i not in cut_i else unary_union([cut_i[i], piece])
                elif z.get('toma_islas') is not False:
                    for i, isl in enumerate(islands):
                        if i in taken_i or not zg.contains(isl.representative_point()):
                            continue
                        if pg is not None and not pg.intersects(isl):
                            continue
                        parts.append(isl.difference(cut_i[i]) if i in cut_i else isl); taken_i.add(i)
                if not parts:
                    avisos.append(f'{key} {anio}: {z["ficha"]} no toma ningún terreno (contorno fuera de su zona o tapado por otro)')
                    continue
                g = unary_union(parts)
                if padre:
                    g = g.intersection(pg)
                g = unary_union([p for p in (list(g.geoms) if hasattr(g, 'geoms') else [g]) if p.geom_type == 'Polygon' and p.area > 1e-6])
                if g.is_empty:
                    continue
                geoms.setdefault(anio, {})[z['ficha']] = g
                main_part = max(list(g.geoms) if hasattr(g, 'geoms') else [g], key=lambda p: p.area)
                lab = polylabel(main_part, tolerance=0.005)
                out_z.append({'ficha': z['ficha'], 'color': z.get('color'), 'padre': padre, 'areas': rec.get('areas') or [],
                              'tipos': rec.get('tipos') or [], 'nombre': rec.get('nombre'), 'nombre_alt': rec.get('nombre_alt'),
                              'nombre_griego': rec.get('nombre_griego'), 'endonimo': rec.get('endonimo'), 'endonimo_nota': rec.get('endonimo_nota'),
                              'poligonos': rings_of(g, 0.003), 'etiqueta': [round(lab.x, 3), round(lab.y, 3)], 'bbox': [round(v, 3) for v in g.bounds]})
            res_t[anio] = out_z
        return res_t, geoms
    tier1, t1geom = build_tier('tier1', t0geom)
    tier2, t2geom = build_tier('tier2', t1geom)

    # Cobertura: qué parte de cada zona cubren sus subdivisiones del tier siguiente, y dónde quedan huecos.
    def cobertura(nombre, padres_out, padres_geom, hijos_out, hijos_geom):
        for anio, zs in padres_out.items():
            hijos = {}
            for h in hijos_out.get(anio, []):
                if h.get('padre'):
                    hijos.setdefault(h['padre'], []).append(hijos_geom[anio][h['ficha']])
            vacias = [z['ficha'] for z in zs if z['ficha'] not in hijos]
            if hijos and vacias:
                avisos.append(f'{nombre} {anio}: {len(vacias)} de {len(zs)} zonas sin subdivisiones' + (': ' + ', '.join(vacias) if len(vacias) <= 12 else ''))
            for z in zs:
                hs = hijos.get(z['ficha'])
                if not hs:
                    continue
                pg = padres_geom[anio][z['ficha']]
                u = unary_union(hs)
                z['cobertura'] = round(min(1, u.intersection(pg).area / pg.area), 4)
                gap = pg.difference(u.buffer(0.005))
                partes = sorted([p for p in (list(gap.geoms) if hasattr(gap, 'geoms') else [gap]) if p.area > 0.003], key=lambda p: -p.area)[:8]
                z['huecos'] = [[round(p.representative_point().x, 2), round(p.representative_point().y, 2)] for p in partes]
                if z['cobertura'] < 0.995:
                    avisos.append(f'{nombre} {anio}: las subdivisiones de {z["ficha"]} cubren el {z["cobertura"] * 100:.1f} %; huecos en ' + ', '.join(f'{h[0]} E {h[1]} N' for h in z['huecos']))
    cobertura('tier0', tier0, t0geom, tier1, t1geom)
    cobertura('tier1', tier1, t1geom, tier2, t2geom)
    out = {'schema_version': 1,
           'fuente': 'Generado por scripts/build_mapa.py a partir de zonas.json y tierra.json (Natural Earth, dominio público)',
           'areas': res, 'subareas': subs, 'tier0': tier0, 'tier1': tier1, 'tier2': tier2}
    with open(os.path.join(M, 'areas.geo.json'), 'w', encoding='utf-8') as fh:
        json.dump(out, fh, ensure_ascii=False, separators=(',', ':'))
    print(f'areas.geo.json: {len(res)} áreas, {len(subs)} subregiones, tier 0: ' + ', '.join(f'{k} ({len(v)})' for k, v in tier0.items())
          + ', tier 1: ' + ', '.join(f'{k} ({len(v)})' for k, v in tier1.items())
          + ', tier 2: ' + ', '.join(f'{k} ({len(v)})' for k, v in tier2.items()))
    for a in avisos:
        print('AVISO', a)


if __name__ == '__main__':
    sys.exit(main())
