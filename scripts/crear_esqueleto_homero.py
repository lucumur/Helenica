#!/usr/bin/env python3
"""Crea el esqueleto de data/homero/: una ficha por obra y un archivo por canto (vacío).

No sobrescribe archivos existentes. Títulos de canto tomados de Tana
(Library › La Iliada (Homero) / La Odisea (Homero)). Uso: python scripts/crear_esqueleto_homero.py
"""
import json, os

DATA = os.path.join(os.path.dirname(__file__), '..', 'data', 'homero')
ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII',
           'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI', 'XXII', 'XXIII', 'XXIV']
OBRAS = {
    'iliada': {
        'nombre': 'Ilias', 'nombre_alt': 'Ilíada', 'nombre_griego': 'Ἰλιάς', 'abrev': 'Il.',
        'tana': '0i160yNM24ze',
        'titulos': ['La cólera', 'El sueño y la Beocia', 'Los juramentos y Helena en la muralla',
                    'Violación de los juramentos', 'Las aristías de Diomedes', 'Héctor y Andrómaca',
                    'Duelo de Héctor y Áyax', 'Batalla interrumpida', 'La embajada a Aquiles', 'La Dolonía',
                    'Aristía de Agamenón', 'Combate en la muralla', 'Batalla junto a las naves',
                    'Seducción de Zeus', 'Nueva arremetida desde las naves', 'Patroclea',
                    'Aristía de Menelao', 'Fabricación de las armas', 'Renuncia a la cólera',
                    'Combate de los dioses', 'Batalla junto al río', 'Muerte de Héctor',
                    'Funerales de Patroclo', 'Rescate de Héctor'],
    },
    'odisea': {
        'nombre': 'Odysseia', 'nombre_alt': 'Odisea', 'nombre_griego': 'Ὀδύσσεια', 'abrev': 'Od.',
        'tana': 'kqwYFJfjSNyn',
        'titulos': ['Concilio de los dioses', 'Asamblea en Ítaca', 'En Pilos', 'En Esparta',
                    'La isla de Calipso', 'Nausícaa', 'Llegada al palacio de Alcínoo', 'El aedo Demódoco',
                    'El Cíclope', 'Eolo, los Lestrigones y Circe', 'Nékyia (el mundo de los muertos)',
                    'Sirenas, Escila y Caribdis', 'Llegada a Ítaca', 'La cabaña de Eumeo',
                    'Regreso de Telémaco', 'Reconocimiento de Telémaco', 'Regreso al palacio',
                    'El mendigo Iro', 'Reconocimiento de Euriclea', 'Vísperas de la matanza',
                    'La prueba del arco', 'La matanza de los pretendientes', 'Reconocimiento de Penélope',
                    'Paz en Ítaca'],
    },
}


def write(path, obj):
    if os.path.exists(path):
        return False
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)
        f.write('\n')
    return True


os.makedirs(DATA, exist_ok=True)
for oid, o in OBRAS.items():
    cantos = []
    for i, t in enumerate(o['titulos'], 1):
        cid = f'{oid}-{i:02d}'
        cantos.append({'n': i, 'id': cid, 'romano': ROMANOS[i - 1], 'titulo': t})
        write(os.path.join(DATA, cid + '.json'), {
            'id': cid, 'obra': oid, 'canto': i, 'titulo': t, 'resumen': '', 'versos': []})
    write(os.path.join(DATA, oid + '.json'), {
        'id': oid, 'nombre': o['nombre'], 'nombre_alt': o['nombre_alt'], 'nombre_griego': o['nombre_griego'],
        'abrev': o['abrev'], 'autor': {'col': 'entes', 'id': 'homeros', 'nombre': 'Homēros'},
        'descripcion': '', 'tana': o['tana'], 'cantos': cantos})
write(os.path.join(DATA, 'obras.json'), {'obras': list(OBRAS)})
print('esqueleto listo en', os.path.normpath(DATA))
