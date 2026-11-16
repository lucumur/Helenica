#!/usr/bin/env python3
"""Carga datos fluviales contrastados; conserva los otros campos y las fuentes previas.

Uso: python scripts/completar_datos_rios.py [id ...]
Las limitaciones documentales se explican expresamente, sin convertirlas en ausencias.
"""
import json
import sys
from preparar_fichas_rios import LUGARES, CAMPOS


FUENTES = {
    'P2A': ('Pausanias, Descripción de Grecia 2.1–14', 'https://www.theoi.com/Text/Pausanias2A.html'),
    'P2B': ('Pausanias, Descripción de Grecia 2.15–28', 'https://www.theoi.com/Text/Pausanias2B.html'),
    'P2C': ('Pausanias, Descripción de Grecia 2.29–38', 'https://www.theoi.com/Text/Pausanias2C.html'),
    'P3A': ('Pausanias, Descripción de Grecia 3.1–13', 'https://www.theoi.com/Text/Pausanias3A.html'),
    'P3B': ('Pausanias, Descripción de Grecia 3.14–26', 'https://www.theoi.com/Text/Pausanias3B.html'),
    'P4A': ('Pausanias, Descripción de Grecia 4.1–19', 'https://www.theoi.com/Text/Pausanias4A.html'),
    'P4B': ('Pausanias, Descripción de Grecia 4.20–36', 'https://www.theoi.com/Text/Pausanias4B.html'),
    'P5A': ('Pausanias, Descripción de Grecia 5.1–15', 'https://www.theoi.com/Text/Pausanias5A.html'),
    'P6B': ('Pausanias, Descripción de Grecia 6.19–26', 'https://www.theoi.com/Text/Pausanias6B.html'),
    'P7B': ('Pausanias, Descripción de Grecia 7.17–27', 'https://www.theoi.com/Text/Pausanias7B.html'),
    'P8B': ('Pausanias, Descripción de Grecia 8.17–35', 'https://www.theoi.com/Text/Pausanias8B.html'),
    'P8C': ('Pausanias, Descripción de Grecia 8.36–54', 'https://www.theoi.com/Text/Pausanias8C.html'),
    'P9A': ('Pausanias, Descripción de Grecia 9.1–22', 'https://www.theoi.com/Text/Pausanias9A.html'),
    'P9B': ('Pausanias, Descripción de Grecia 9.23–40', 'https://www.theoi.com/Text/Pausanias9B.html'),
    'H': ('Hesíodo, Teogonía 337–370: ríos y Oceánides', 'https://chs.harvard.edu/primary-source/hesiod-theogony-sb/'),
    'EL': ('Eliano, Historia varia 2.33: formas humanas y taurinas de los dioses fluviales', 'https://www.theoi.com/Cult/PotamoiCult.html'),
    'S8': ('Estrabón, Geografía 8.3: Élide y ríos del Peloponeso', 'https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Strabo/8C*.html'),
    'PEI': ('Municipio de Erimanto: río Peiros y sus afluentes', 'https://www.visit-erymanthos.gr/frontend/points/view/155'),
    'PM': ('Ministerio de Medio Ambiente de Grecia: cuenca y afluentes del Pámiso (EL01)', 'https://floods.ypeka.gr/wp-content/uploads/2023/11/EL01_P01-T1_analisi_char.pdf'),
    'ELIS': ('W. Smith, Dictionary of Greek and Roman Geography, «Elis»: cabeceras y cambios de desembocadura', 'https://www.gtp.gr/destinations/ancientelis'),
}
DATOS = {}


def agregar(ids, nacimientos, desembocadura, forma_potamica, afluentes, recorrido, fuentes):
    valores = dict(zip((k for k, _ in CAMPOS),
                       (nacimientos, desembocadura, forma_potamica, afluentes, recorrido)))
    for rid in ids.split():
        DATOS[rid] = {'campos': valores, 'fuentes': fuentes.split()}


agregar('alpheios-elis',
    'Cabeceras de Arcadia. Pausanias sitúa unas fuentes junto a Asea y describe también el tramo de Phylakē/Symbola y sus pérdidas subterráneas; son descripciones antiguas, no una comprobación moderna de todas las conexiones kársticas (Paus. 8.44.3–4; 8.54.1–3).',
    'Mar Jónico, en el sector de Epitalion, al oeste de Olimpia. La prolongación hasta Aretusa de Siracusa pertenece al relato mítico (C), no al cauce físico (Estrabón 8.3.12; Paus. 5.7.2–3).',
    'Alpheios, dios fluvial, hijo de Océano y Tetis en la tradición (C; Hes. Th. 337–345). Representación humana atestiguada por Eliano 2.33 y figura en el frontón oriental del templo de Zeus de Olimpia (Paus. 5.10.7).',
    '[Ladōn](lugares:ladon-arkadia), [Erymanthos](lugares:erymanthos-arkadia), Helissōn, Brentheatēs, Gortynios, Bouphagos y Kladeos: los siete principales que enumera Pausanias (5.7.1).',
    'Desde Arcadia y el entorno de Megalópolis avanza hacia el oeste, recibe los cursos arcadios, pasa por el territorio de Heraia y por Olimpia y cruza la llanura de Élide hasta el mar (Paus. 5.7.1; Estrabón 8.3.12).', 'P8C P5A H EL S8')

agregar('asopos-phliasios',
    'Territorio de Phlious, en las cabeceras montañosas al sur de su llanura. La conexión subterránea con el Meandro es tradición (C), no nacimiento hidrológico demostrado (Paus. 2.5.2–3).',
    'Golfo de Corinto, tras atravesar el territorio de Sikyōn (Paus. 2.5.2).',
    'Asōpos de Phlious y Sikyōn, padre mítico de ninfas epónimas (C). Eliano, Historia varia 2.33, atestigua su representación bovina entre fliasios y sicionios. No confundir automáticamente sus genealogías con las del Asopo beocio (Paus. 2.5.2).',
    'Las fuentes antiguas aquí citadas describen el curso principal, pero no ofrecen una lista segura de afluentes con nombre; no equivale a que carezca de ellos.',
    'Recorre la llanura de Phlious y desciende hacia el norte por Sikyonia hasta su costa en el golfo de Corinto (Paus. 2.5.2).', 'P2A EL')

agregar('cascada-de-styx-de-nonakris-arkadia',
    'Agua que rezuma y cae por el alto escarpe junto a Nónacris, en el macizo de los Aroania. Pausanias describe la caída, no un manantial puntual en la cumbre (8.17.6).',
    'Se incorpora al [Krāthis](lugares:krathis-achaia); no desemboca por sí sola en el mar (Paus. 8.18.4).',
    'Asociada a Styx, Oceánide y garante del juramento de los dioses (C; Hes. Th. 361, 775–806). La cascada arcadia y el río del inframundo son niveles geográfico y mítico distintos.',
    'El pasaje describe una caída de agua que alimenta al Krāthis, sin individualizar afluentes de la propia cascada (Paus. 8.18.4).',
    'Desciende por el escarpe próximo a Nónacris, pasa por la roca inferior y alcanza el Krāthis. Sus supuestas propiedades mortíferas pertenecen a la tradición antigua (C; Paus. 8.18.4–6).', 'P8B H')

agregar('cerynitis-achaia',
    'Monte Keryneia, en el sector arcadio de las montañas que descienden hacia Acaya (Paus. 7.25.5).',
    'Costa de Acaya en el golfo de Corinto, en el sector de Keryneia y Helikē; el punto de salida ha variado con la sedimentación de la llanura litoral.',
    'No se ha documentado una personificación individual en los pasajes consultados. La cierva cerinitia y la etimología de Keryneia no bastan para establecer un dios fluvial propio.',
    'Los pasajes citados no individualizan afluentes con nombre; se conserva esa limitación documental.',
    'Torrente que baja desde Arcadia por el territorio de Keryneia hacia la llanura costera de Acaya (Paus. 7.25.5).', 'P7B')

agregar('ephyra-korinthia',
    'No procede como dato fluvial: Ephyra es el topónimo tradicional de Corinto; la clasificación importada como Río necesita revisión (Paus. 2.1.1).',
    'No procede: no se ha identificado un cauce corintio independiente denominado Ephyra en la fuente citada.',
    'La figura asociada es Ephyra, hija de Océano y epónima de la tierra de Corinto, según Eumelo transmitido por Pausanias (C; 2.1.1); no es prueba de un río llamado Ephyra.',
    'No procede mientras la ficha corresponda al topónimo de Corinto.',
    'Pausanias vincula Ephyra/Ephyraia con Corinto; no describe un recorrido fluvial (2.1.1). Se conserva el identificador y el contenido importado, sin inventar un río.', 'P2A')

agregar('erymanthos-arkadia',
    'Monte Lampeia, parte del macizo del Erimanto según Pausanias (8.24.4).',
    '[Alpheios](lugares:alpheios-elis), en el límite occidental de Arcadia (Paus. 8.24.4).',
    'Erymanthos: los psophidios le dedicaron templo e imagen (Paus. 8.24.12). Eliano 2.33 especifica una figura humana.',
    'En torno a Psōphis confluye la red local descrita por Pausanias, que menciona allí un Aroanios (8.24.3). No se identifica por el solo nombre con el Aroanios del territorio de Kleitōr.',
    'Desde Lampeia pasa por Psōphis y baja hacia el Alfeo, dejando Pholoē a la derecha y el territorio de Thelpousa a la izquierda (Paus. 8.24.3–4).', 'P8B EL')

agregar('eurotas-lakonia',
    'Pausanias sitúa sus fuentes junto a Asea, próximas a las del Alfeo; relata que reaparece en Laconia tras un trayecto subterráneo compartido. Esta conexión es la explicación antigua y no se toma como hidrología moderna comprobada (8.44.3–4).',
    'Golfo Lacónico, en la llanura de Helos (Estrabón 8.3.12).',
    'Eurōtās, personificado como dios fluvial; Eliano 2.33 registra una imagen bovina entre los espartanos. Pausanias ofrece además una versión de rey epónimo que drena las aguas hacia el mar (C; 3.1.1–2).',
    'Oinous y los torrentes de la llanura espartana; Tiasa y Phellia aparecen en la topografía de Pausanias (3.18.6; 3.20.3). La equivalencia de Knakiōn con Oinous es discutida.',
    'Desciende por el valle entre los macizos del Taÿgetos y el Parnōn, pasa por Spartē y el territorio de Amyklai y alcanza la llanura de Helos y el golfo Lacónico (Estrabón 8.3.12).', 'P3A P3B P8C EL S8')

agregar('inakhos-argolis',
    '[Artemision](lugares:artemision-argolis), por encima de Oinoē: Pausanias afirma expresamente que tiene fuentes, aunque el agua no corre lejos (2.25.3).',
    'Llanura litoral del golfo Argólico; su continuidad hasta el mar es estacional y no debe representarse como un río permanentemente caudaloso.',
    'Inakhos, río y padre mítico de Iō (C); participa con Kephisos y Asteriōn en el juicio entre Hera y Poseidón por Argos (Paus. 2.15.4–5).',
    'La hidrografía argiva menciona otros cursos, como Charadros, pero los pasajes aquí citados no permiten convertirlos sin más en una lista segura de afluentes del Inakhos.',
    'Baja de Artemision por Oinoē hacia Argos y su llanura. Pausanias insiste en la escasez de agua superficial y en los cursos secos de la Argólide (2.15.4–5; 2.25.3).', 'P2B')

agregar('krathis-achaia',
    'Montaña arcadia del mismo nombre según Pausanias; recibe las aguas de la cascada de [Styx](lugares:cascada-de-styx-de-nonakris-arkadia) en el macizo de los Aroania (7.25.11; 8.18.4).',
    'Golfo de Corinto, en la costa de Acaya próxima a Aigai (Paus. 7.25.11–12).',
    'Los pasajes geográficos citados no describen una imagen ni un culto individual del Krāthis aqueo. No se traslada a esta ficha la tradición de un homónimo itálico.',
    'Agua de la [cascada de Styx](lugares:cascada-de-styx-de-nonakris-arkadia), documentada expresamente por Pausanias 8.18.4.',
    'Desde las montañas arcadias y el entorno de Nónacris desciende hacia el norte por Acaya hasta el golfo de Corinto. Pausanias lo describe como un curso que no se seca (7.25.11).', 'P7B P8B')

agregar('ladon ladon-arkadia ladon-arkadia-2',
    'Fuentes en el territorio de Kleitōr, a unos cincuenta estadios de Lykouria. Pausanias presenta como noticia no comprobada la alimentación subterránea desde la cuenca de Pheneos (8.20.1).',
    '[Alpheios](lugares:alpheios-elis), tras recorrer Arcadia occidental (Paus. 5.7.1; Estrabón 8.3.12).',
    'Ladōn, hijo de Océano y Tetis en la tradición (C; Hes. Th. 337–345), padre de la ninfa Thelpousa (C; Paus. 8.25.2). Es el dios del río arcadio, distinto del dragón homónimo de las Hespérides.',
    'Aroanios del territorio de Kleitōr, cuya red incluye el río Kleitōr (Paus. 8.19.4–8.21.2). La filiación divina no se usa para deducir confluencias físicas.',
    'Por Leukasion, Mesoboa, Nasoi, Oryx/Halous y Thaliades; pasa junto a Thelpousa y el santuario de Deméter en Onkeion antes de alcanzar el Alfeo (Paus. 8.25.2–4).', 'P8B P5A H S8')

agregar('neda-arkadia',
    '[Monte Lykaion](lugares:oros-lykaion) (Paus. 4.20.2). La apertura de la fuente por Rea pertenece al relato mítico (C; Estrabón 8.3.22).',
    'Mar Jónico, en la frontera litoral entre Mesenia y Trifilia/Élide (Paus. 4.20.2; Estrabón 8.3.22).',
    'Neda, ninfa nodriza de Zeus y epónima del río (C; Paus. 8.38.3; 4.33.1). Es una figura femenina; no se sustituye por un potamós masculino genérico.',
    'Lymax, que pasa junto a Phigalia y desemboca expresamente en el Neda (Paus. 8.41.2).',
    'Desde Lykaion atraviesa el oeste de Arcadia, pasa bajo el territorio de Phigalia y marca la separación de Mesenia y Trifilia hasta el mar (Paus. 4.20.2; 8.41.2).', 'P4B P8C S8')

agregar('nonakris-arkadia',
    'No procede para Nónacris como población: Pausanias la llama expresamente una antigua ciudad arcadia (8.17.6). La fuente/cascada próxima corresponde a la ficha de Styx.',
    'No procede como desembocadura de una ciudad. El agua de Styx cercana alcanza el [Krāthis](lugares:krathis-achaia) (Paus. 8.18.4).',
    'Nónacris se explica como nombre de la esposa de Lykaōn (C; Paus. 8.17.6), no como dios fluvial. La divinidad del agua próxima es Styx.',
    'No procede: el topónimo de una población no tiene afluentes.',
    'Población arcadia situada en la ruta hacia las aguas de Styx. Se conserva la clasificación importada y el identificador; el curso de agua se desarrolla en [Cascada de Styx](lugares:cascada-de-styx-de-nonakris-arkadia) (Paus. 8.17.6–8.18.4).', 'P8B')

agregar('pamisos-messenia',
    'Manantiales en el camino de Thouria hacia Arcadia, vinculados a curaciones infantiles según Pausanias (4.31.4); la documentación hidrológica moderna identifica las fuentes de Agios Phloros.',
    'Golfo Mesénico, en la llanura al sur de Messēnē (Paus. 4.34.1–2).',
    'Pamisos, receptor de un sacrificio anual atribuido al rey Sybotas (C; Paus. 4.3.10). El culto al río está atestiguado; ese pasaje no describe la forma de su imagen.',
    'En la red moderna: Mavrozoumena, Tzamis/Charadros, Megalo Potami y Serilas. Son nombres del inventario hidrológico actual, no una restitución automática de los nombres antiguos (plan oficial EL01).',
    'Desde los manantiales septentrionales recorre hacia el sur la llanura mesenia hasta el golfo. Pausanias describe aguas limpias y navegación desde el mar por unos diez estadios (4.34.1–2).', 'P4A P4B PM')

agregar('peiros-achaia',
    'Vertiente norte/nordeste del [Erymanthos](lugares:oros-erymanthos-arkadia), según la documentación del municipio de Erimanto.',
    'Golfo de Patras, en la costa de Alissos, en el sector de la antigua Ōlenos.',
    'No se ha verificado una personificación individual en Paus. 7.22.1. No se atribuye a este Peiros la genealogía de otros ríos homónimos.',
    'Parapeiros; también Serdinē y Vorilas/Megas Melas en la nomenclatura moderna documentada por el municipio de Erimanto.',
    'Baja de Erimanto a la llanura de Pharai y de allí a Ōlenos y el golfo de Patras. Pausanias identifica tentativamente el Pieros de Pharai con el Peiros de la costa (7.22.1).', 'P7B PEI')

agregar('peneios-elis',
    'Macizo del Erymanthos, en Élide oriental; identificación topográfica recogida por el Dictionary of Greek and Roman Geography, «Elis».',
    'Mar Jónico. Estrabón lo sitúa entre Chelōnatas y Kyllēnē; el cauce moderno sale al sur de Chelōnatas. Deben distinguirse las posiciones antiguas y actuales (Estrabón 8.3.4; Smith, «Elis»).',
    'No se identifica automáticamente con Pēneios de Tesalia. Las fuentes geográficas aquí citadas no fijan una personificación local con genealogía propia.',
    'Ladōn de Élide, documentado junto a Pylos eleo (Paus. 6.22.5): es distinto del [Ladōn arcadio](lugares:ladon-arkadia), que pertenece a la cuenca del Alfeo.',
    'De los barrancos orientales avanza por el valle y la llanura de Ēlis; Estrabón lo hace pasar por la ciudad junto al gimnasio (8.3.2). Su desembocadura y canales históricos no coinciden necesariamente con los actuales.', 'P6B S8 ELIS')

agregar('pontinos-lerna-2',
    'Monte Pontinos, que absorbe el agua de lluvia y la devuelve en este río según la descripción de Pausanias (2.36.8).',
    'Costa de Lerna, en el golfo Argólico; constituye uno de los límites del bosque sagrado que llega al mar (Paus. 2.37.1).',
    'La fuente citada describe el río y los santuarios próximos, pero no atestigua una figura divina individual del Pontinos. La existencia de un santuario junto al río no basta para establecerla.',
    'No se individualizan afluentes en Paus. 2.36.8–2.37.1. Amymōnē se describe como otro límite del bosque sagrado, no como afluente del Pontinos.',
    'Curso corto desde el monte Pontinos hasta el litoral de Lerna, junto al bosque sagrado de Deméter y Dioniso (Paus. 2.36.8–2.37.2).', 'P2C')


def main():
    elegidos = sys.argv[1:] or list(DATOS)
    desconocidos = set(elegidos) - DATOS.keys()
    if desconocidos:
        raise SystemExit('Sin datos preparados para: ' + ', '.join(sorted(desconocidos)))
    cambios = 0
    for rid in elegidos:
        path = LUGARES / f'{rid}.json'
        original = path.read_text(encoding='utf-8')
        ficha = json.loads(original)
        assert 'Río' in ficha.get('tipos', []), rid
        registro = DATOS[rid]
        for clave, etiqueta in CAMPOS:
            encontrados = [c for c in ficha['campos'] if c.get('clave') == clave]
            assert len(encontrados) == 1, (rid, clave)
            campo = encontrados[0]
            if campo.get('texto') != registro['campos'][clave]:
                campo.update(texto=registro['campos'][clave], refs=[])
        fuentes = ficha.setdefault('fuentes', [])
        for codigo in registro['fuentes']:
            titulo, url = FUENTES[codigo]
            if not any(f.get('url') == url for f in fuentes):
                fuentes.append({'titulo': titulo, 'url': url})
        salida = json.dumps(ficha, ensure_ascii=False, indent=2) + ('\n' if original.endswith('\n') else '')
        if salida != original:
            path.write_text(salida, encoding='utf-8')
            cambios += 1
    print(f'{len(elegidos)} fichas revisadas; {cambios} actualizadas')


if __name__ == '__main__':
    main()
