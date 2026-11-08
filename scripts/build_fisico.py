#!/usr/bin/env python3
"""Build sourced river paths and mountain footprints (no invented buffers).

python scripts/build_fisico.py --gmba /path/GMBA_Inventory_v2.0_standard.shp \
    --ways /path/rivers-osm.json --relations /path/river-relations-full-osm.json

Requires pyshp and shapely. Input downloads are kept outside the repository.
Output is a generalized cartographic representation, not an ancient shoreline
or river reconstruction. See data/mapa/FUENTES_FISICAS.md for provenance.
"""
import argparse
import json
from pathlib import Path

import shapefile
from shapely.geometry import LineString, Point, shape, mapping
from shapely.ops import unary_union, linemerge, nearest_points

ROOT = Path(__file__).resolve().parents[1]

# Exact inventory IDs. Large inventory units are not substituted for local peaks.
MOUNTAINS = {
    19898: ['geraneia-peiraion', 'ore-geraneia-peiraia'],
    19962: ['oros-erymanthos-arkadia'],
    19964: ['ore-aroania-arkadia'],
    19966: ['oros-mainalon-arkadia'],
    11710: ['parnon-lakonia'],
    11973: ['taygetos-lakonia'],
    14617: ['ida-frigia'],
}

# Modern names + geographic boxes disambiguate homonymous Greek rivers.
# Relation IDs identify the mapped main watercourse where available.
RIVERS = [
    ('alpheios', ['alpheios-elis'], ['Αλφειός'], [21.3, 37.2, 22.4, 37.8], 721969),
    ('asopos-phliasios', ['asopos-phliasios'], ['Ασωπός'], [22.4, 37.7, 22.9, 38.1], 10483287),
    ('asopos-boiotia', ['asopos-thebai', 'rio-asopo'], ['Ασωπός'], [23.0, 38.15, 24.0, 38.5], 19275777),
    ('cerynitis', ['cerynitis-achaia'], ['Κερυνίτης'], [21.9, 38.0, 22.3, 38.3], None),
    ('erymanthos-rio', ['erymanthos-arkadia'], ['Ερύμανθος'], [21.6, 37.5, 22.0, 38.1], 17499528),
    ('ladon', ['ladon-arkadia', 'ladon-arkadia-2', 'ladon'], ['Λάδωνας'], [21.7, 37.5, 22.3, 38.0], 19221105),
    ('lelas', ['lelas'], ['Λήλας'], [23.5, 38.3, 24.0, 38.8], 11809892),
    ('pamisos', ['pamisos-messenia'], ['Πάμισος'], [21.8, 36.9, 22.2, 37.3], 8056594),
    ('peneios-elis', ['peneios-elis'], ['Πηνειός'], [21.0, 37.7, 21.9, 38.2], None),
    ('pontinos', ['pontinos-lerna-2'], ['Ποντίνος'], [22.6, 37.5, 22.8, 37.7], None),
    ('strymon', ['strymon'], [], [22.0, 40.5, 24.5, 43.0], 2515446),
    ('hebros', ['hebros'], [], [23.0, 40.5, 28.0, 43.5], 10183192),
]


def rounded(value):
    if isinstance(value, (list, tuple)):
        return [rounded(v) for v in value]
    return round(value, 5) if isinstance(value, float) else value


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--gmba', required=True)
    ap.add_argument('--ways', required=True)
    ap.add_argument('--relations', required=True)
    args = ap.parse_args()
    places = {p.stem: json.loads(p.read_text()) for p in (ROOT / 'data/lugares').glob('*.json')}
    ways_doc = json.loads(Path(args.ways).read_text())
    rel_doc = json.loads(Path(args.relations).read_text())
    if ways_doc.get('remark') or rel_doc.get('remark'):
        raise ValueError('Overpass returned a partial/error response; do not build.')
    ways = ways_doc['elements']
    relations = {r['id']: r for r in rel_doc['elements']}
    features = []

    def entry(id_, ids, kind, geom, source, extra):
        if geom.is_empty or not geom.is_valid:
            raise ValueError(f'Invalid geometry: {id_}')
        point = Point(places[ids[0]]['geo']['punto'])
        if kind == 'rio' or not geom.covers(point):
            point = nearest_points(geom, point)[0] if kind == 'rio' else geom.representative_point()
        f = dict(id=id_, lugares=ids, nombre=places[ids[0]]['nombre'], tipo=kind,
                 fuente=source, bbox=rounded(geom.bounds), punto=rounded([point.x, point.y]), **extra)
        coords = mapping(geom)['coordinates']
        if kind == 'monte':
            f['poligonos'] = rounded([coords] if geom.geom_type == 'Polygon' else coords)
        else:
            f['lineas'] = rounded([coords] if geom.geom_type == 'LineString' else coords)
        features.append(f)

    # Simplify by ~35 m, preserving topology and holes, rather than making circles
    # around summit coordinates or borrowing a larger neighboring mountain unit.
    reader = shapefile.Reader(args.gmba)
    for index, record in enumerate(reader.iterRecords()):
        props = record.as_dict()
        key = props['GMBA_V2_ID']
        if key not in MOUNTAINS:
            continue
        geom = shape(reader.shape(index).__geo_interface__).simplify(.00035, preserve_topology=True)
        entry(f'gmba-{key}', MOUNTAINS[key], 'monte', geom, 'gmba', {
            'referencia': str(key), 'nombre_fuente': props['MapName'],
            'nota': 'Delimitación generalizada del macizo; no es una curva de nivel.',
        })

    for key, ids, names, bounds, relation_id in RIVERS:
        segments, source_ids = {}, []
        rel = relations.get(relation_id)
        if rel:
            for member in rel.get('members', []):
                if member['type'] != 'way' or member.get('role', '') not in ('', 'main_stream'):
                    continue
                if len(member.get('geometry', [])) >= 2:
                    segments[member['ref']] = member['geometry']
            if segments:
                source_ids.append(f'relation/{relation_id}')
        # Add matching named segments: relations can omit a named source branch.
        for way in ways:
            if way.get('tags', {}).get('name') not in names or len(way.get('geometry', [])) < 2:
                continue
            points = way['geometry']
            if not all(bounds[0] <= p['lon'] <= bounds[2] and bounds[1] <= p['lat'] <= bounds[3] for p in points):
                continue
            segments[way['id']] = points
        if not segments:
            continue
        lines = [LineString([(p['lon'], p['lat']) for p in ps]) for ps in segments.values()]
        geom = unary_union(lines)
        if geom.geom_type == 'MultiLineString':
            geom = linemerge(geom)
        if geom.geom_type not in ('LineString', 'MultiLineString'):
            raise ValueError(f'Unexpected river geometry: {key}')
        # ~15 m; keeps meanders and every disconnected surveyed segment.
        geom = geom.simplify(.00015, preserve_topology=True)
        entry(key, ids, 'rio', geom, 'osm', {
            'referencias': source_ids + [f'way/{i}' for i in sorted(segments)],
            'nota': 'Cauce moderno cartografiado; puede haber tramos sin datos.',
        })

    result = {
        'version': 1,
        'fuentes': {
            'gmba': {'nombre': 'GMBA Mountain Inventory v2.0 — Standard',
                     'url': 'https://doi.org/10.48601/earthenv-t9k2-1407', 'licencia': 'CC BY 4.0'},
            'osm': {'nombre': 'OpenStreetMap contributors', 'url': 'https://www.openstreetmap.org/copyright',
                    'licencia': 'ODbL 1.0', 'fecha_datos': rel_doc.get('osm3s', {}).get('timestamp_osm_base')},
        },
        'accidentes': sorted(features, key=lambda f: (f['tipo'], f['id'])),
    }
    out = ROOT / 'data/mapa/fisico.json'
    out.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')) + '\n')
    print(f'{len(features)} geometrías, {sum(len(f["lugares"]) for f in features)} fichas, {out.stat().st_size} bytes')


if __name__ == '__main__':
    main()
