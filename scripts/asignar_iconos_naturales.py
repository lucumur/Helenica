#!/usr/bin/env python3
"""Asigna los emojis del atlas a las fichas de montes y ríos.

Uso: python scripts/asignar_iconos_naturales.py
Solo modifica `icono`; conserva el resto del contenido y el salto final.
"""
import json
from collections import Counter
from pathlib import Path


LUGARES = Path(__file__).resolve().parent.parent / 'data' / 'lugares'
ICONOS = {'Monte': '⛰️', 'Río': '🌊'}


def main():
    cambios = Counter()
    for path in sorted(LUGARES.glob('*.json')):
        original = path.read_text(encoding='utf-8')
        ficha = json.loads(original)
        tipos = set(ficha.get('tipos') or []) & ICONOS.keys()
        if len(tipos) > 1:
            raise ValueError(f'{path.name}: clasificada como monte y río')
        if not tipos:
            continue
        tipo = tipos.pop()
        if ficha.get('icono') == ICONOS[tipo]:
            continue
        ficha['icono'] = ICONOS[tipo]
        final = '\n' if original.endswith('\n') else ''
        path.write_text(json.dumps(ficha, ensure_ascii=False, indent=2) + final,
                        encoding='utf-8')
        cambios[tipo] += 1
    print('Iconos actualizados: ' + ', '.join(
        f'{tipo}: {cambios[tipo]}' for tipo in ICONOS))


if __name__ == '__main__':
    main()
