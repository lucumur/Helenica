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
    # Peloponeso y alrededores
    11535: ['aigaleos-messenia'],
    11710: ['parnon-lakonia'],
    11973: ['taygetos-lakonia'],
    19898: ['geraneia-peiraion', 'ore-geraneia-peiraia'],
    19962: ['oros-erymanthos-arkadia'],
    19963: ['panakhaikon-achaia'],
    19964: ['ore-aroania-arkadia'],
    19965: ['oros-kyllene-arkadia'],
    19966: ['oros-mainalon-arkadia'],
    19967: ['artemision-argolis'],
    19968: ['lyrkeion-argolis'],
    # Grecia Central
    19886: ['korax-aitolia'],
    19894: ['giona-phokis'],
    19895: ['parnassos-phokis'],
    19896: ['oite-phokis'],
    19897: ['knemis-lokris'],
    19904: ['helikon-boiotia'],
    19905: ['parnes-attike'],
    19906: ['kithairon-boiotia'],
    19907: ['pateras-megaris'],
    # Grecia Occidental
    14787: ['akarnanika-ore'],
    14800: ['ainos-kephallenia'],
    19899: ['arakynthos-aitolia'],
    19901: ['panaitolikon-aitolia'],
    19903: ['tymfristos-aitolia'],
    # Tesalia
    11685: ['olympos-thessalia'],
    11693: ['othrys-thessalia'],
    18416: ['pindos-thessalia'],
    19882: ['kamvounia-thessalia'],
    19883: ['kerketion-thessalia'],
    19889: ['ossa-thessalia'],
    19891: ['pelion-thessalia'],
    # Epiro
    12959: ['keraunia-epeiros'],
    18100: ['athamanika-epeiros'],
    18413: ['tymphe-epeiros'],
    20356: ['tomaros-epeiros'],
    20777: ['thesprotika-epeiros'],
    # Islas del Egeo
    18684: ['zas-naxos'],
    18687: ['kourion-andros'],
    # Creta
    12705: ['leuka-ore-kreta'],
    14790: ['asterousia-kreta'],
    18946: ['dikte-kreta'],
    19456: ['ida-creta'],
    # Chipre
    11651: ['troodos-kypros'],
    18709: ['keryneia-kypros'],
    # Asia Eolia, Jonia, Doria y Anatolia
    11142: ['messogis-ionia'],
    11164: ['latmos-ionia'],
    11188: ['tmolos-ionia'],
    11594: ['pindasos-aiolis'],
    12081: ['sipylos-aiolis'],
    12778: ['aspordenos-aiolis'],
    14617: ['ida-frigia'],
    14711: ['mimas-ionia'],
    18680: ['lepetymnos-lesbos'],
    18681: ['kerketeus-samos'],
    18682: ['atabyrion-rhodos'],
    18683: ['pelineon-khios'],
    18710: ['mykale-ionia'],
    19289: ['pramnos-ikaria'],
}

# Modern names + geographic boxes disambiguate homonymous Greek rivers.
# Relation IDs identify the mapped main watercourse where available.
RIVERS = [
    # Peloponeso
    ('alpheios', ['alpheios-elis'], ['Αλφειός'], [21.3, 37.2, 22.4, 37.8], 721969),
    ('asopos-phliasios', ['asopos-phliasios'], ['Ασωπός'], [22.4, 37.7, 22.9, 38.1], 10483287),
    ('cerynitis', ['cerynitis-achaia'], ['Κερυνίτης'], [21.9, 38.0, 22.3, 38.3], None),
    ('erymanthos-rio', ['erymanthos-arkadia'], ['Ερύμανθος'], [21.6, 37.5, 22.0, 38.1], 17499528),
    ('eurotas', ['eurotas-lakonia'], ['Ευρώτας'], [22.2, 36.75, 22.75, 37.35], 911096),
    ('inakhos-argolis', ['inakhos-argolis'], ['Ίναχος'], [22.5, 37.55, 22.8, 37.75], 911089),
    ('krathis', ['krathis-achaia'], ['Κράθις'], [22.15, 37.98, 22.40, 38.22], None),
    ('ladon', ['ladon-arkadia', 'ladon-arkadia-2', 'ladon'], ['Λάδωνας'], [21.7, 37.5, 22.3, 38.0], 19221105),
    ('neda', ['neda-arkadia'], ['Νέδα'], [21.65, 37.34, 22.0, 37.45], 1668534),
    ('pamisos', ['pamisos-messenia'], ['Πάμισος'], [21.8, 36.9, 22.2, 37.3], 8056594),
    ('peiros', ['peiros-achaia'], ['Πείρος'], [21.5, 37.98, 21.95, 38.18], 8097935),
    ('peneios-elis', ['peneios-elis'], ['Πηνειός'], [21.0, 37.7, 21.9, 38.2], None),
    ('pontinos', ['pontinos-lerna-2'], ['Ποντίνος'], [22.6, 37.5, 22.8, 37.7], None),
    # Grecia Central y Eubea
    ('asopos-boiotia', ['asopos-thebai', 'rio-asopo'], ['Ασωπός'], [23.0, 38.15, 24.0, 38.5], 19275777),
    ('asopos-trakhis', ['asopos-trakhis'], ['Ασωπός'], [22.30, 38.72, 22.62, 38.90], 17987331),
    ('boudoros', ['boudoros'], ['Νηλέας', 'Κηρέας'], [23.25, 38.68, 23.56, 38.94], 11809891),
    ('hylaithos', ['hylaithos-lokris'], ['Μόρνος'], [21.80, 38.35, 22.30, 38.75], 3803746),
    ('ilissos', ['ilissos-attike'], ['Ιλισός', 'Ιλισσός'], [23.65, 37.92, 23.80, 38.02], 15629080),
    ('kephisos-attike', ['kephisos-attike'], ['Κηφισός'], [23.62, 37.92, 23.88, 38.15], 11821028),
    ('kephisos-boiotia', ['kephisos-boiotia'], ['Κηφισός'], [22.45, 38.35, 23.30, 38.72], 11641416),
    ('lelas', ['lelas'], ['Λήλας'], [23.5, 38.3, 24.0, 38.8], 11809892),
    ('sperkheios', ['sperkheios-malis'], ['Σπερχειός'], [21.85, 38.80, 22.60, 38.98], 911103),
    # Grecia Occidental
    ('akheloos', ['akheloos-aitolia'], ['Αχελώος'], [21.05, 38.30, 21.55, 39.72], 6191678),
    ('euenos', ['euenos-aitolia'], ['Εύηνος'], [21.48, 38.28, 22.15, 38.75], 9196971),
    ('inakhos-akarnania', ['inakhos-akarnania'], ['Ίναχος'], [21.20, 38.78, 21.40, 39.15], 19185458),
    # Tesalia
    ('enipeus', ['enipeus-thessalia'], ['Ενιπέας', 'Ενιπέας (παλαιός)'], [22.05, 39.08, 22.60, 39.60], 2237514),
    ('lethaios-trikka', ['lethaios-trikka'], ['Ληθαίος'], [21.70, 39.48, 22.08, 39.65], None),
    ('pamisos-thessalia', ['pamisos-thessalia'], ['Πάμισος'], [21.55, 39.32, 21.88, 39.53], 19187395),
    ('peneios-thessalia', ['peneios-thessalia'], ['Πηνειός', 'Πηνειός (Θεσσαλία)'], [21.52, 39.48, 22.75, 39.96], 569717),
    ('titaresios', ['titaresios-thessalia'], ['Τιταρήσιος'], [21.85, 39.68, 22.42, 40.12], 17890880),
    # Epiro
    ('akheron', ['akheron-epeiros'], ['Αχέρων'], [20.45, 39.20, 20.82, 39.52], 11241309),
    ('aoos', ['aoos-epeiros'], ['Αώος'], [20.55, 39.80, 21.20, 40.10], None),
    ('arakhthos', ['arakhthos-epeiros'], ['Άραχθος'], [20.94, 38.98, 21.25, 39.80], 1245609),
    ('thyamis', ['thyamis-epeiros'], ['Καλαμάς', 'Καλαμάς (Kalamas)', 'Καλαμάς (Θύαμης)'], [20.12, 39.50, 20.66, 39.86], 911095),
    # Creta, Chipre y Asia
    ('lethaios-kreta', ['lethaios-kreta'], ['Γεροπόταμος'], [24.72, 34.97, 25.15, 35.10], 18008045),
    ('pedieos', ['pedieos-kypros'], ['Πεδιαίος'], [33.15, 34.92, 33.95, 35.24], 13058293),
    ('kaikos', ['kaikos-aiolis'], ['Bakırçay'], [26.92, 38.90, 27.85, 39.25], 1273141),
    ('hermos', ['hermos-aiolis'], ['Gediz Nehri'], [26.80, 38.48, 29.45, 39.10], 14006299),
    ('kaystros', ['kaystros-ionia'], ['Küçük Menderes'], [27.22, 37.92, 28.25, 38.35], 1263781),
    ('maiandros', ['maiandros-ionia'], ['Büyük Menderes', 'Büyük Menderes Nehri'], [27.15, 37.48, 30.20, 38.28], 14006313),
    # Tracia
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
    places = {p.stem: json.loads(p.read_text(encoding='utf-8')) for p in (ROOT / 'data/lugares').glob('*.json')}
    ways_doc = json.loads(Path(args.ways).read_text(encoding='utf-8'))
    rel_doc = json.loads(Path(args.relations).read_text(encoding='utf-8'))
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
    out.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    print(f'{len(features)} geometrías, {sum(len(f["lugares"]) for f in features)} fichas, {out.stat().st_size} bytes')


if __name__ == '__main__':
    main()
