#!/usr/bin/env python3
"""Añade los cinco campos fluviales que falten, sin sustituir contenido.

Uso: python scripts/preparar_fichas_rios.py
Los datos no documentados se guardan vacíos y la ficha muestra «Sin datos».
"""
import json
from pathlib import Path


LUGARES = Path(__file__).resolve().parent.parent / 'data' / 'lugares'
CAMPOS = [('nacimientos', 'Nacimientos'), ('desembocadura', 'Desembocadura'),
          ('forma_potamica', 'Forma potámica'), ('afluentes', 'Afluentes'),
          ('recorrido', 'Recorrido')]


def main():
    total = modificadas = 0
    for path in sorted(LUGARES.glob('*.json')):
        original = path.read_text(encoding='utf-8')
        ficha = json.loads(original)
        if 'Río' not in (ficha.get('tipos') or []):
            continue
        total += 1
        campos = ficha.setdefault('campos', [])
        existentes = {c.get('clave') for c in campos}
        faltan = [(k, l) for k, l in CAMPOS if k not in existentes]
        if not faltan:
            continue
        campos.extend({'clave': k, 'etiqueta': l, 'texto': '', 'refs': []}
                      for k, l in faltan)
        final = '\n' if original.endswith('\n') else ''
        path.write_text(json.dumps(ficha, ensure_ascii=False, indent=2) + final,
                        encoding='utf-8')
        modificadas += 1
    print(f'Ríos: {total}; fichas actualizadas: {modificadas}')


if __name__ == '__main__':
    main()
