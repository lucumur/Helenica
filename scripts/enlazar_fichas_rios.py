#!/usr/bin/env python3
"""Enlaza menciones verificadas con fichas existentes, respetando homónimos.

Uso: python scripts/enlazar_fichas_rios.py
No crea destinos, no sustituye enlaces existentes ni identifica dioses con cauces.
"""
import json
import re
import unicodedata
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
REGLAS = []


def regla(destino, *nombres, rios=None, campos=None):
    col, rid = destino.split(':')
    assert (ROOT / 'data' / col / (rid + '.json')).is_file(), destino
    for nombre in nombres:
        REGLAS.append((nombre, destino, rios, campos))


# Regiones físicas/editoriales existentes. No se usan ethne de 900 a.C.
# como sustituto de una región genérica de otra fecha.
regla('lugares:arkadia-peloponnesos', 'Arcadia', 'Arkadia')
regla('lugares:messenia-peloponnesos', 'Mesenia')
regla('lugares:laconia-peloponeso', 'Laconia', 'Lakōnia')
regla('lugares:tesalia', 'Tesalia', 'Thessalia')
regla('lugares:creta', 'Creta', 'Krētē')
regla('lugares:euboia', 'Eubea', 'Euboia')
regla('lugares:chipre', 'Chipre', 'Kypros')
regla('lugares:tracia', 'Tracia', 'Thrakē')
regla('lugares:grecia-occidental', 'Grecia occidental')
regla('lugares:grecia-central', 'Grecia central')

regla('lugares:dirphys', 'Dirphys')
regla('lugares:pelion-thessalia', 'Pēlion')
regla('lugares:ossa-thessalia', 'Ossa')
regla('lugares:olympos-thessalia', 'Olympos', rios={'peneios-thessalia', 'titaresios-thessalia'})
regla('lugares:othrys-thessalia', 'Othrys')
regla('lugares:oite-phokis', 'Oitē')
regla('lugares:tymphe-epeiros', 'Tymphē')
regla('lugares:tymfristos-aitolia', 'Tymphrēstos')
regla('lugares:kithairon-boiotia', 'Kithairōn')
regla('lugares:parnassos-phokis', 'Parnāssos')
regla('lugares:parnon-lakonia', 'Parnōn')
regla('lugares:taygetos-lakonia', 'Taÿgetos', 'Taygetos')
regla('lugares:telethrion', 'Telēthrion')
regla('lugares:leuka-ore-kreta', 'Montañas Blancas')
regla('lugares:troodos-kypros', 'Troodos')
regla('lugares:artemision-argolis', 'Artemision', rios={'inakhos-argolis'})
regla('lugares:ida-creta', 'Ida', rios={'lethaios-kreta'})
regla('lugares:ida-frigia', 'Ida', rios={'kaikos-aiolis'})
regla('lugares:oros-erymanthos-arkadia', 'macizo del Erimanto', 'monte Erimanto')
regla('lugares:ore-aroania-arkadia', 'macizo de los Aroania', 'montes Aroania')
regla('lugares:pontinos-lerna', 'monte Pontinos')
regla('lugares:tmolos-ionia', 'Tmōlos')
regla('lugares:messogis-ionia', 'Mesōgis')

regla('lugares:athenai', 'Atenas', 'Athēnai')
regla('lugares:qorinthos-korinthia', 'Corinto')
regla('lugares:argos-argolis', 'Argos', rios={'inakhos-argolis', 'asopos-phliasios'})
regla('lugares:asea-arkadia', 'Asea')
regla('lugares:pheneos-arkadia', 'Pheneos')
regla('lugares:phylake-arkadia', 'Phylakē')
regla('lugares:phigaleia-arcadia', 'Phigalia')
regla('lugares:lerna-argolis-2', 'Lerna')
regla('lugares:thouria-messenia', 'Thouria')
regla('lugares:messene-messenia', 'Messēnē', 'Messenē')
regla('lugares:esparta-laconia', 'Esparta', 'Spartē')
regla('lugares:trikka-thessalia', 'Trikka', 'Trica')
regla('lugares:oreos', 'Ōreos')
regla('lugares:kerinthos', 'Kērinthos')
regla('lugares:keryneia-achaia', 'Keryneia', rios={'cerynitis-achaia'}, campos={'recorrido'})
regla('lugares:chalkis-euboia', 'Chalkis', rios={'lelas'})
regla('lugares:sikyon-asopia', 'Sikyōn', 'Sikyonia')
regla('lugares:smyrna-ionia', 'Smyrna')
regla('lugares:samothrake-egeo', 'Samothrakē')
regla('lugares:delos-nesos', 'Dēlos', rios={'inopos-inopo-delos'}, campos={'nacimientos', 'desembocadura', 'recorrido'})
regla('lugares:lelantion', 'llanura Lelantina')
regla('lugares:limne-hiera', 'Lago Sagrado')
regla('lugares:kolpos-messeniakos', 'golfo Mesénico', 'golfo de Mesenia')
regla('lugares:nonakris-arkadia', 'Nónacris', 'Nônakris')

# Los nombres de cauces sólo se resuelven como lugares en campos físicos.
# La forma potámica necesita el ente correspondiente, no un enlace al agua.
FISICOS = {'nacimientos', 'desembocadura', 'afluentes', 'recorrido', 'descripcion'}
regla('lugares:alpheios-elis', 'Alfeo', 'Alpheios', campos=FISICOS)
regla('lugares:akheloos-aitolia', 'Achelōos', 'Akhelōos', 'Aqueloo', campos=FISICOS)
regla('lugares:akheron-epeiros', 'Akherōn', 'Aqueronte', campos=FISICOS)
regla('lugares:aoos-epeiros', 'Aoos', 'Aōos', 'Vjosa', campos=FISICOS)
regla('lugares:eurotas-lakonia', 'Eurotas', 'Eurōtās', campos=FISICOS)
regla('lugares:maiandros-ionia', 'Meandro', 'Maiandros', campos=FISICOS)
regla('lugares:hermos-aiolis', 'Hermos', campos=FISICOS)
regla('lugares:kaikos-aiolis', 'Kaïkos', campos=FISICOS)
regla('lugares:kaystros-ionia', 'Kaÿstros', campos=FISICOS)
regla('lugares:krathis-achaia', 'Krāthis', campos=FISICOS)
regla('lugares:sperkheios-malis', 'Sperkheios', campos=FISICOS)
regla('lugares:thyamis-epeiros', 'Thyamis', campos=FISICOS)
regla('lugares:strymon', 'Strymon', 'Strymōn', campos=FISICOS)
regla('lugares:hebros', 'Hebros', campos=FISICOS)
regla('lugares:ilissos-attike', 'Ilissos', campos=FISICOS)
regla('lugares:kephisos-attike', 'Cefiso ático', campos=FISICOS)
regla('lugares:kephisos-boiotia', 'Cefiso beocio', campos=FISICOS)
regla('lugares:ladon-arkadia', 'Ladōn arcadio', campos=FISICOS)
regla('lugares:asopos-thebai', 'Asopo beocio', 'Asopo de Beocia', campos=FISICOS)
regla('lugares:asopos-trakhis', 'Asopo de Trachis', 'Asopo tracinio', campos=FISICOS)
regla('lugares:peneios-thessalia', 'Pēneios de Tesalia', 'Peneo tesalio', campos=FISICOS)
regla('lugares:peneios-thessalia', 'Peneo', 'Pēneios', rios={'enipeus-thessalia', 'pamisos-thessalia', 'titaresios-thessalia', 'lethaios-trikka'}, campos=FISICOS)

# Personajes: destinos de ente, no los lugares homónimos.
regla('entes:zeus', 'Zeus')
regla('entes:hera', 'Hera')
regla('entes:poseidaon', 'Poseidón')
regla('entes:demeter', 'Deméter')
regla('entes:apollon', 'Apolo', 'Apollōn')
regla('entes:artemis', 'Artemis')
regla('entes:dionysos', 'Dioniso')
regla('entes:deianeira', 'Deianeira')
regla('entes:achilleus', 'Aquiles')
regla('entes:arethousa', 'Aretusa', 'Arethousa')
regla('entes:rhea', 'Rea', 'Rhea')
regla('entes:melia', 'Melia')
regla('entes:metope', 'Metopē')
regla('entes:homeros', 'Homero')
regla('entes:inachos', 'Inakhos', 'Inachos', rios={'inakhos-argolis'}, campos={'forma_potamica'})
regla('entes:ephyra', 'Ephyra', rios={'ephyra-korinthia'}, campos={'forma_potamica'})


def normalizar(texto):
    resultado, posiciones = [], []
    for i, c in enumerate(texto):
        s = ''.join(x for x in unicodedata.normalize('NFD', c) if not unicodedata.combining(x)).casefold()
        resultado.extend(s)
        posiciones.extend([i] * len(s))
    return ''.join(resultado), posiciones


PROTEGIDO = re.compile(r'(\[[^\]]*\]\([^)]+\)|`[^`]*`|https?://\S+|golfo de (?:Corinto|Patras|Smyrna|Ambracia|Eubea)(?: meridional)?|estrecho de Eubea)', re.I)


def enlazar_texto(texto, rio, campo):
    elegibles = {}
    for nombre, destino, rios, campos in REGLAS:
        if rios is not None and rio not in rios or campos is not None and campo not in campos:
            continue
        if destino == 'lugares:' + rio:
            continue
        elegibles[normalizar(nombre)[0]] = destino
    if not elegibles:
        return texto
    patron = re.compile(r'(?<!\w)(?:' + '|'.join(re.escape(x) for x in sorted(elegibles, key=len, reverse=True)) + r')(?!\w)')
    partes = PROTEGIDO.split(texto)
    for i in range(0, len(partes), 2):
        parte = partes[i]
        normal, posiciones = normalizar(parte)
        for m in reversed(list(patron.finditer(normal))):
            a, b = posiciones[m.start()], posiciones[m.end() - 1] + 1
            while b < len(parte) and unicodedata.combining(parte[b]):
                b += 1
            etiqueta = parte[a:b]
            parte = parte[:a] + f'[{etiqueta}]({elegibles[m.group()]})' + parte[b:]
        partes[i] = parte
    return ''.join(partes)


def main():
    modificadas = enlaces = 0
    for path in sorted((ROOT / 'data/lugares').glob('*.json')):
        original = path.read_text(encoding='utf-8')
        ficha = json.loads(original)
        if 'Río' not in ficha.get('tipos', []):
            continue
        textos = [(c, c.get('clave', '')) for c in ficha.get('campos', [])]
        if isinstance(ficha.get('descripcion'), dict):
            textos.append((ficha['descripcion'], 'descripcion'))
        for obj, clave in textos:
            previo = obj.get('texto', '')
            nuevo = enlazar_texto(previo, ficha['id'], clave)
            enlaces += nuevo.count('](') - previo.count('](')
            obj['texto'] = nuevo
        salida = json.dumps(ficha, ensure_ascii=False, indent=2) + ('\n' if original.endswith('\n') else '')
        if salida != original:
            path.write_text(salida, encoding='utf-8')
            modificadas += 1
    print(f'{modificadas} fichas actualizadas; {enlaces} enlaces añadidos')


if __name__ == '__main__':
    main()
