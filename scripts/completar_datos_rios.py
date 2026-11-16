#!/usr/bin/env python3
"""Carga datos fluviales contrastados; conserva los otros campos y las fuentes previas.

Uso: python scripts/completar_datos_rios.py [id ...]
Las limitaciones documentales se explican expresamente, sin convertirlas en ausencias.
"""
import json
import sys
sys.dont_write_bytecode = True
from preparar_fichas_rios import LUGARES, CAMPOS
from enlazar_fichas_rios import enlazar_texto


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
FUENTES.update({
    'S10A': ('Estrabón, Geografía 10.1: ríos y ciudades de Eubea', 'https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Strabo/10A*.html'),
    'S10D': ('Estrabón, Geografía 10.4: Kairatos, Cnoso y Lethaios', 'https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Strabo/10D*.html'),
    'S13': ('Estrabón, Geografía 13.1.69–70: Teutrania, fuentes y afluentes del Kaikos', 'https://www.greekmythology.com/sources/strabo/geography/13-teuthrania-telephus-auge'),
    'S13H': ('Estrabón, Geografía 13.4.5: Hermos, Paktolos e Hyllos', 'https://beta.perseus.tufts.edu/urn%3Acts%3AgreekLit%3Atlg0099.tlg001.perseus-eng3%3A13.4/'),
    'S14': ('Estrabón, Geografía 14.1: Jonia, Meandro y Caístro', 'https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Strabo/14A*.html'),
    'XEN': ('Jenofonte, Anábasis 1.2.7–8: fuentes del Meandro y confluencia del Marsias', 'https://beta.perseus.tufts.edu/urn%3Acts%3AgreekLit%3Atlg0032.tlg006.perseus-eng2%3A1.2/'),
    'BOU': ('WWF Grecia, inventario de campo GR242EUB005: estuario del Voudoros', 'https://www.ygrotopio.gr/general/report.php?code=EUB005&lang=en'),
    'LIL': ('Ghilardi y colaboradores (2022), historia fluvial del Lilas desde época micénica', 'https://doi.org/10.3390/geosciences12050204'),
    'KAI': ('UNESCO, expediente de los centros palaciales minoicos: Kairatos y Vlychia', 'https://whc.unesco.org/document/208870'),
    'IAR': ('Región de Creta, Discover Crete: Keritis/Iardanos, fuentes y recorrido', 'https://www.discovercrete.com/places-to-go/keritis'),
    'LETC': ('Barrington Atlas, mapa 60 Creta: identificación del Lethaios con el Geropotamos', 'https://assets.press.princeton.edu/B_ATLAS/BATL060_.pdf'),
    'LETT': ('ToposText, Lethaios de Creta: localización y testimonios', 'https://topostext.org/place/353248WLet'),
    'LETM': ('Gortyn: propuesta de identificación del Lethaios con el Mitropolianos', 'https://www.interkriti.org/crete/iraklion/gortyn.html'),
    'INO': ('Calímaco y Estrabón: testimonios del Inopos y las ninfas delias', 'https://www.theoi.com/Potamos/PotamosInopos.html'),
    'INOH': ('Universidad Politécnica Nacional de Atenas, ITIA: obras hidráulicas del Inopos', 'https://www.itia.ntua.gr/ahw/work/27/'),
    'KOU': ('Universidad Tecnológica de Chipre: cuenca del Kouris, cabeceras y confluencias', 'https://ktisis.cut.ac.cy/server/api/core/bitstreams/439203fa-0e25-40a9-87d9-006e36f23945/content'),
    'PED': ('Proyecto ACTIVATE / Cyprus Institute: cuenca, recorrido y cambios del Pedieos', 'https://activate.zone/about-the-river'),
    'CYD': ('Departamento de Desarrollo del Agua de Chipre: catálogo de presas y redes fluviales', 'https://www.gov.cy/moa-wdd/en/documents/dams-and-off-stream-ponds/catalogue-of-reservoirs/'),
    'KAY': ('Kaystros: Pausanias 7.2.8 y Estrabón 14.1.44, testimonios del dios y su heroon', 'https://www.theoi.com/Potamos/PotamosKaystros.html'),
    'HEB': ('Hebros: Alceo, fragmentos 45a–b, y otros testimonios antiguos', 'https://www.theoi.com/Potamos/PotamosHebros.html'),
    'HEBH': ('Ministerio de Desarrollo Regional de Bulgaria, evaluación INTERREG Grecia–Bulgaria: ríos transfronterizos', 'https://www.mrrb.bg/static/media/ups/articles/attachments/SEA_GR-BL_INTERREG_EN9525370a82c644cf20e622ad7f6cdc92.pdf'),
    'HEBT': ('FAO, Inland Fisheries of Europe: Maritsa y sus afluentes Arda y Tundzha', 'https://www.fao.org/4/t0798e/T0798E02.htm'),
    'STRH': ('UNESCO/INWEB: cuenca transfronteriza del Struma/Strymon', 'https://www.inweb.gr/workshops2/sub_basins/11_Strymon.html'),
    'STRA': ('Escuela Francesa de Atenas, Chronique: manantiales y relación del Angitis con el Strymon', 'https://chronique.efa.gr/?id=830&r=report'),
})
FUENTES.update({
    'S7': ('Estrabón, Geografía 7.7: hidrografía de Epiro y Anfiloquía', 'https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Strabo/7G*.html'),
    'S9A': ('Estrabón, Geografía 9.1.24: ríos de Ática', 'https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Strabo/9A*.html'),
    'S9B': ('Estrabón, Geografía 9.2: ríos de Beocia', 'https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Strabo/9B*.html'),
    'S9E': ('Estrabón, Geografía 9.5: ríos de Tesalia y Malis', 'https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Strabo/9E*.html'),
    'S10B': ('Estrabón, Geografía 10.2: Etolia y Acarnania', 'https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Strabo/10B*.html'),
    'HDT129': ('Heródoto, Historias 7.129: red fluvial de Tesalia', 'https://lexundria.com/hdt/7.129/mcly'),
    'HDT200': ('Heródoto, Historias 7.198–200 y 216–217: ríos y costa de las Termópilas', 'https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Herodotus/7d*.html'),
    'P1B': ('Pausanias, Descripción de Grecia 1.19.5–6: Ilissos y Eridanos', 'https://www.theoi.com/Text/Pausanias1B.html'),
    'P10C': ('Pausanias, Descripción de Grecia 10.33.4–7: fuentes y afluente del Cefiso', 'https://www.theoi.com/Text/Pausanias10C.html'),
    'HYLA': ('RE, «Hylaithos» (1914): testimonio de Dionisio hijo de Calífon y controversia topográfica', 'https://de.wikisource.org/wiki/RE:Hylaithos'),
    'ISM': ('Testimonios antiguos de Ismenos: Pausanias 9.10.5–6; Calímaco, Himno a Delos 75 ss.', 'https://www.theoi.com/Potamos/PotamosIsmenos.html'),
    'ENI': ('Enipeus: testimonios de Homero y Estrabón, incluidas las variantes de confluencia', 'https://www.theoi.com/Potamos/PotamosEnipeus.html'),
    'SPER': ('Sperkheios: Homero, Ilíada 16.173–176 y 23.141–149', 'https://www.theoi.com/Potamos/PotamosSperkheios.html'),
    'SPERH': ('Psomiadis y colaboradores (2020), estudio de la cuenca del Sperchios', 'https://www.mdpi.com/2076-3263/10/9/377'),
    'TIT': ('Titaresios: Ilíada 2.751–755 y testimonios geográficos de Estrabón', 'https://www.theoi.com/Potamos/PotamosTitaressos.html'),
    'LETH': ('Región de Tesalia: fuentes y recorrido del Lethaios', 'https://visitthessaly.gr/en/suggestions/litheos-river-forgetfulness'),
    'ACHE': ('Akhelōios: testimonios antiguos, incluidas Traquinias de Sófocles', 'https://www.theoi.com/Potamos/PotamosAkheloios.html'),
    'ACHET': ('Ministerio de Medio Ambiente de Grecia, red fluvial de Grecia Occidental EL04', 'https://floods.ypeka.gr/wp-content/uploads/2025/09/EL04_P19_T1_en.pdf'),
    'EPIR': ('NECCA, áreas protegidas de Epiro: Aqueronte y sus afluentes', 'https://necca.gov.gr/en/mdpp/management-unit-of-the-protected-areas-of-epirus-necca/'),
    'ACHER': ('Aqueronte: testimonios antiguos y distinción del río del inframundo', 'https://www.theoi.com/Khthonios/PotamosAkheron.html'),
    'AOOS': ('J. Droujko y colaboradores (2023), cuenca y afluentes del Vjosa/Aoos', 'https://esurf.copernicus.org/articles/11/881/2023/esurf-11-881-2023.html'),
    'AOOSS': ('ZRC SAZU, RiverChange: cabecera y curso del Aoos/Vjosa', 'https://riverchange.zrc-sazu.si/vjosa-01-source/'),
    'ARA': ('Parque de Tzoumerka: Arachthos, cabeceras, confluencias y desembocadura', 'https://tzoumerka-park.gr/en/arachthos/'),
    'THY': ('Organismo de gestión Kalamas–Acheron: cuenca, fuentes y afluentes del Kalamas', 'https://www.kalamas-acherontas.gr/wp-content/uploads/2019/05/kalamas_agglika.pdf'),
})


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
    'Mar Jónico. Estrabón lo sitúa entre Chelōnatas y Kyllēnē; el cauce moderno sale al sur de Chelōnatas. Deben distinguirse las posiciones antiguas y actuales (Estrabón 8.3.5; Smith, «Elis»).',
    'No se identifica automáticamente con Pēneios de Tesalia. Las fuentes geográficas aquí citadas no fijan una personificación local con genealogía propia.',
    'Ladōn de Élide, documentado junto a Pylos eleo (Paus. 6.22.5): es distinto del [Ladōn arcadio](lugares:ladon-arkadia), que pertenece a la cuenca del Alfeo.',
    'De los barrancos orientales avanza por el valle y la llanura de Ēlis; Estrabón lo hace pasar por la ciudad junto al gimnasio (8.3.2). Su desembocadura y canales históricos no coinciden necesariamente con los actuales.', 'P6B S8 ELIS')

agregar('pontinos-lerna-2',
    'Monte Pontinos, que absorbe el agua de lluvia y la devuelve en este río según la descripción de Pausanias (2.36.8).',
    'Costa de Lerna, en el golfo Argólico; constituye uno de los límites del bosque sagrado que llega al mar (Paus. 2.37.1).',
    'La fuente citada describe el río y los santuarios próximos, pero no atestigua una figura divina individual del Pontinos. La existencia de un santuario junto al río no basta para establecerla.',
    'No se individualizan afluentes en Paus. 2.36.8–2.37.1. Amymōnē se describe como otro límite del bosque sagrado, no como afluente del Pontinos.',
    'Curso corto desde el monte Pontinos hasta el litoral de Lerna, junto al bosque sagrado de Deméter y Dioniso (Paus. 2.36.8–2.37.2).', 'P2C')


agregar('asopos-thebai rio-asopo',
    'Cabeceras de la vertiente septentrional de Kithairōn y pequeños cursos de la Parasōpia beocia (Estrabón 9.2.23–24).',
    'Estrecho de Eubea, en el sector de Ōrōpos, después de la llanura de Tanagra.',
    'Asōpos beocio, padre mítico de Plataia y otras ninfas epónimas (C). Pausanias conserva una interpretación como antiguo rey y distingue la tradición beocia de la fliasia (9.1.1–2; 2.5.2).',
    'La Ōeroē aparece como curso próximo e hija mítica de Asōpos (C; Paus. 9.4.4); la filiación no prueba por sí sola una confluencia. Los textos citados no enumeran todos los tributarios físicos.',
    'Atraviesa la Parasōpia, separa los territorios de Thēbai y Plataiai y sigue hacia Tanagra y Ōrōpos. Se trata del Asopo beocio, distinto de los ríos homónimos de Phlious y Trachis (Estrabón 9.2.23–24; Paus. 9.4.4).', 'P2A P9A S9B')

agregar('asopos-trakhis',
    'Montañas al sur de Trachis, en el entorno de Oitē: sale por la garganta descrita por Heródoto (7.199; 7.216–217).',
    'Heródoto lo hace desembocar en el golfo Maliaco junto a Anthēlē (7.200). En la red moderna se incorpora al [Sperkheios](lugares:sperkheios-malis); el avance de la llanura aluvial impide trasladar la costa actual a las Termópilas de 480 a.C.',
    'No se ha establecido una personificación propia del Asopo tracinio en los textos consultados. No se importa la genealogía del Asōpos de Beocia o de Phlious.',
    'Phoinix, arroyo que desemboca expresamente en el Asōpos según Heródoto 7.200.',
    'Sale por la garganta al sur de Trachis, alcanza el piedemonte y pasa junto a Anthēlē hacia la antigua costa de las Termópilas (Hdt. 7.199–200). Su cuenca moderna forma parte de la del Sperkheios.', 'HDT200 SPERH')

agregar('hylaithos-lokris',
    'Identificación controvertida. Dionisio hijo de Calífon, v. 67, dice que procede de Etolia, pero no da un manantial reconocible. La equivalencia con el Mornos de la descripción previa de esta ficha no es segura.',
    'Costa de la Lócride ozolia en el golfo de Corinto; el estuario exacto depende de la identificación discutida del río.',
    'No se documenta una personificación individual en el testimonio geográfico conservado.',
    'No es posible asignar una red moderna de afluentes mientras no se resuelva su identificación; los del Mornos no se atribuyen automáticamente al Hylaithos.',
    'Dionisio lo sitúa en su descripción de la costa locria después de Tolophōn. Se han propuesto el Mornos y cursos próximos a Vitrinitsa o Amphissa; la RE, «Hylaithos», expone las dificultades y no considera segura ninguna identificación.', 'HYLA')

agregar('ilissos-attike',
    'Cabeceras al este/sudeste de Atenas, por encima de Agrai y el Lykeion; Estrabón menciona también el manantial celebrado en el Fedro (9.1.24).',
    'Estrabón lo lleva a la misma costa de Falero que el Cefiso ático (9.1.24). Se distingue esa descripción antigua de las confluencias y canalizaciones modernas.',
    'Río sagrado asociado a Boreas, Ōreithyia y las Musas Ilisíades (Paus. 1.19.5). Los pasajes citados documentan su carácter sacro, sin describir una imagen individual del dios del río.',
    'Ēridanos, nombrado expresamente como tributario del Ilissos por Pausanias (1.19.5).',
    'Discurre junto a Agrai, el Lykeion y el lado meridional de Atenas hacia Falero; Pausanias sitúa al otro lado el santuario de Artemis Agrotera y el estadio (1.19.5–6; Estrabón 9.1.24).', 'P1B S9A')

agregar('ismenos',
    'Manantiales y cabeceras del entorno de Thēbai, vinculados a Melia y al Ismēnion en la tradición local (Paus. 9.10.5–6). Los pasajes no fijan un único punto moderno de nacimiento.',
    'Cuenca del lago Hylikē en la identificación topográfica habitual. Los pasajes antiguos citados se centran en Thēbai y no permiten precisar el último tramo con la misma seguridad que el curso urbano.',
    'Ismēnos, hijo de Apolo y Melia según Pausanias 9.10.6; otra genealogía lo hace hijo de Asōpos y Metopē (C; Apolodoro 3.12.6). El río tuvo también el nombre Ladōn en la tradición tebana, distinto del arcadio.',
    'Dirkē y Strophia aparecen como aguas tebanas personificadas e hijas de Ismēnos en Calímaco, Himno a Delos 75 ss. (C). La genealogía no se convierte sin comprobación en un catálogo de confluencias.',
    'Pasa junto al Ismēnion y el sector oriental de Thēbai; Estrabón lo incluye en la llanura ante la ciudad (9.2.24). Su relación con las aguas y santuarios tebanos está mejor atestiguada que el trazado completo.', 'P9A S9B ISM')

agregar('kephisos-attike',
    'Demos de Trinemeis, al norte de la llanura ateniense (Estrabón 9.1.24).',
    'Golfo de Falero, después de cruzar la llanura y el corredor de las Murallas Largas (Estrabón 9.1.24).',
    'Kēphisos ático: Eliano 2.33 describe una figura humana con cuernos incipientes. Se distingue del Cefiso beocio y del homónimo argivo.',
    'Los pasajes citados no proporcionan una lista de tributarios con nombre. El Ilissos tiene su propia red y no se presenta aquí como un afluente antiguo demostrado.',
    'Desde Trinemeis atraviesa la llanura al oeste de Atenas y pasa entre las Murallas Largas hacia Falero; Estrabón señala su disminución o agotamiento estival (9.1.24).', 'S9A EL')

agregar('kephisos-boiotia',
    'Lilaia, al pie del Parnāssos: Pausanias describe la surgencia y su ruido al brotar (10.33.4–5).',
    'Lago Kōpais, cuenca cerrada cuyo desagüe antiguo depende de sumideros; no desembocaba directamente en el mar (Paus. 9.24.1; Estrabón 9.2.18–19).',
    'Kēphisos, padre mítico de la náyade Lilaia (C; Paus. 10.33.4). El testimonio homérico lo llama divino (Il. 2.522, citado por Paus. 10.33.7); no se le asigna la imagen del Cefiso ático sin evidencia.',
    'Charadros, identificado expresamente como tributario por Pausanias 10.33.6. Permēssos y Olmeios desembocan en el Kōpais y no son por ello afluentes directos del Cefiso (Estrabón 9.2.19).',
    'De Lilaia pasa por la llanura focidia y los territorios de Elateia, Parapotamioi y Phanoteus; entra en Beocia por Chairōneia y alcanza la cuenca de Orchomenos y el Kōpais (Estrabón 9.2.19).', 'P10C P9B S9B')

agregar('sperkheios-malis',
    'Monte Tymphrēstos, según Estrabón 9.5.9 y la investigación geomorfológica moderna.',
    'Golfo Maliaco, junto a la llanura de Lamia y las antiguas Termópilas (Estrabón 9.5.9). La costa ha avanzado por sedimentación.',
    'Sperkheios, dios fluvial: padre de Menesthios en la tradición (C; Il. 16.173–176). Aquiles menciona el voto de dedicarle su cabello y sacrificios en su altar (Il. 23.141–149).',
    'En la red moderna, Gorgopotamos, Inakhos y el [Asōpos tracinio](lugares:asopos-trakhis), además de otros torrentes. Heródoto describe algunos cursos como desembocaduras independientes en la costa antigua (7.198–200).',
    'Corre de oeste a este por el valle entre Oitē y las estribaciones de Othrys, cruza la llanura de Malis al sur de Lamia y forma el sistema aluvial del golfo Maliaco (Estrabón 9.5.9).', 'S9E HDT200 SPER SPERH')

agregar('enipeus-thessalia',
    'Monte Othrys, según Estrabón 9.5.6; no se confunde con los otros Enipeis de Grecia.',
    'Sistema del [Pēneios tesalio](lugares:peneios-thessalia). Estrabón 9.5.6 dice que entra en el Apidanos; 8.3.32 invierte la relación y dice que recibe al Apidanos. Se conserva la discrepancia antigua.',
    'Enipeus, río divino amado por Tyrō; Poseidón toma su aspecto en el relato (C; Od. 11.235–259). La localización del episodio tuvo variantes entre Tesalia y Élide.',
    'Apidanos en la formulación de Estrabón 8.3.32; la relación se invierte en 9.5.6. No se oculta la discordancia bajo una lista única.',
    'Desde Othrys pasa por el territorio de Pharsalos y la Tesalia meridional antes de integrarse, junto al Apidanos, en la red del Peneo (Estrabón 9.5.6; Hdt. 7.129).', 'S9E S8 HDT129 ENI')

agregar('lethaios-trikka',
    'Antichasia; la documentación regional moderna sitúa los manantiales principales en Nea Zoi y otra cabecera cerca de Platanos.',
    '[Pēneios](lugares:peneios-thessalia), fuera de la ciudad de Trikka/Trikala, según la documentación regional de Tesalia.',
    'Las fuentes usadas para su hidrografía no bastan para establecer una imagen antigua o una genealogía divina segura. No se deduce un dios del río únicamente por la relación del nombre con lēthē.',
    'Ramal de cabecera de Platanos y arroyos menores según el inventario regional moderno; los testimonios citados no ofrecen una lista antigua con nombres.',
    'Desde las Antichasia baja a la llanura y atraviesa Trikka, la actual Trikala, antes de incorporarse al Peneo.', 'LETH')

agregar('pamisos-thessalia',
    'Cabeceras montañosas de Tesalia occidental. Heródoto explica que el Pamisos recoge aguas de los montes que cierran la llanura, sin fijar un manantial concreto (7.129).',
    'Sistema del [Pēneios](lugares:peneios-thessalia), que reúne las aguas tesalias antes de salir al mar por Tempē (Hdt. 7.129).',
    'No se ha verificado una personificación individual del Pamisos tesalio en el pasaje citado; no se le traslada el culto del Pamisos de Mesenia.',
    'Heródoto no enumera sus tributarios internos; su catálogo es de los grandes ríos de la cuenca, no una lista de afluentes de este Pamisos.',
    'Desciende desde el borde occidental de Tesalia a la llanura y se incorpora a la red del Peneo. La descripción de Heródoto permite esta relación de cuenca, sin precisar todo el trazado (7.129).', 'HDT129')

agregar('peneios-thessalia',
    'Cabeceras del Pindos, al oeste de Tesalia; reúne las aguas de la llanura encerrada por Pindos, Othrys, Ossa, Pēlion y Olympos (Hdt. 7.129; Estrabón 9.5.1–2).',
    'Mar Egeo, después de cruzar Tempē entre Olympos y Ossa (Hdt. 7.129; Estrabón 9.5.2).',
    'Pēneios, hijo de Océano y Tetis en la tradición (C; Hes. Th. 337–345). Es el Peneo tesalio, no el río homónimo de Élide.',
    '[Titarēsios](lugares:titaresios-thessalia), [Enipeus](lugares:enipeus-thessalia), Apidanos, Onochōnos, [Pamisos](lugares:pamisos-thessalia) y [Lēthaios](lugares:lethaios-trikka), directamente o a través de sus respectivas redes (Hdt. 7.129; Estrabón 9.5.6, 19–20; documentación regional del Lethaios).',
    'Atraviesa la llanura tesalia hacia el este, recibe las redes occidentales y meridionales, pasa por el sector de Larisa y sale por el valle de Tempē entre Olympos y Ossa (Estrabón 9.5.1–2, 19–20).', 'HDT129 S9E H LETH')

agregar('titaresios-thessalia',
    'Monte Titarios, enlazado con Olympos según Estrabón 9.5.20. La derivación de sus aguas desde Styx pertenece a la explicación mítica (C; Il. 2.751–755).',
    '[Pēneios](lugares:peneios-thessalia), en el sector de Perrhaibia próximo a Tempē (Estrabón 9.5.20).',
    'Titarēsios/Titarēssos, también llamado Eurōpos. Homero personifica su corriente y la vincula a Styx (C; Il. 2.751–755); el texto no fija una genealogía parental completa.',
    'Los pasajes citados no individualizan sus tributarios. La conexión mítica con Styx no se registra como afluente físico.',
    'Desde Titarios y las estribaciones de Olympos recorre Perrhaibia y se reúne con el Peneo. Homero dice que sus aguas flotan sin mezclarse: es descripción poética, no una propiedad hidrológica aquí demostrada.', 'S9E TIT')

agregar('akheloos-aitolia',
    'Cabeceras del Pindos, al norte de su largo valle de Grecia occidental (Estrabón 7.7.8).',
    'Mar Jónico, en el sector de Oiniadai y las islas Echinades. La formación aluvial de la costa está descrita por Pausanias 8.24.9–11.',
    'Akhelōios, hijo de Océano y Tetis en la tradición (C; Hes. Th. 337–345). Sófocles, Traquinias 9–17, lo presenta con formas de toro, serpiente y hombre de rostro bovino al pretender a Deianeira (C).',
    'Agrafiotis, Tavropos/Megdovas, Krikeliotis e Inakhos en la documentación hidrológica actual. Las identificaciones de estos con nombres antiguos requieren comprobación independiente (plan oficial EL04).',
    'Desde el Pindos desciende hacia el sur por valles montañosos; en el tramo inferior separa Acarnania y Etolia, pasa por el sector de Stratos y alcanza Oiniadai y las Echinades (Estrabón 7.7.8; Paus. 8.24.9–11).', 'S7 P8B H ACHE ACHET')

agregar('akheron-epeiros',
    'Cabeceras montañosas de Tesprotia y surgencias del desfiladero, en la región de Souli. Las fuentes de la garganta no equivalen por sí solas a la totalidad de la cabecera de la cuenca.',
    'Mar Jónico, en la costa de Glykýs Limēn, la actual zona de Ammoudia; el lago y los humedales aquerusios pertenecen a su antiguo tramo bajo (Estrabón 7.7.5).',
    'Akherōn, también río divino del inframundo en la literatura (C; Od. 10.513–515). Deben separarse el río epirota y la geografía escatológica; las conexiones míticas no prueban confluencias en el terreno.',
    'Kōkytos y Vouvopotamos, expresamente reconocidos por NECCA. Pyriphlegethōn pertenece al relato homérico del inframundo y no se añade como afluente físico epirota.',
    'Cruza el desfiladero de Tesprotia, recibe los cursos de la llanura y atraviesa la antigua zona lacustre y pantanosa próxima a Ephyra y al Nekromanteion hasta el Jónico (Estrabón 7.7.5; NECCA).', 'S7 EPIR ACHER')

agregar('aoos-epeiros',
    'Pindos septentrional, en la cuenca de Vovousa; la cabecera moderna está parcialmente modificada por el embalse de fuentes del Aoos (RiverChange, ZRC SAZU).',
    'Mar Adriático, en la costa de Albania, como Vjosa; no desemboca en el golfo de Ambracia.',
    'No se ha establecido una personificación propia de este Aoos epirota en las fuentes consultadas. Los personajes y ríos homónimos de otras regiones no se identifican automáticamente con él.',
    'Voidomatis, Sarantaporos, Drinos, Bënça y Shushica: principales tributarios del sistema Aoos/Vjosa en el estudio de Droujko y colaboradores (2023); se emplean nombres modernos.',
    'Sale del Pindos, recorre el sector de Konitsa, atraviesa el sur de Albania hacia el noroeste y continúa por el valle del Vjosa hasta el Adriático; combina gargantas, tramos trenzados y llanura baja.', 'AOOS AOOSS')

agregar('arakhthos-epeiros',
    'Red de cabeceras del Pindos cerca de Metsovo: Metsovitikos y Zagoritikos/Vardas. El parque de Tzoumerka las relaciona con Mavrovouni y el bosque de Rona; Estrabón menciona Tymphē y Parōraia (7.7.6).',
    'Golfo de Ambracia, al sur de la actual Arta (antigua Ambrakia).',
    'Las fuentes geográficas citadas no permiten fijar una personificación antigua individual con iconografía propia. La relación con el nombre Inakhos tiene variantes y no autoriza a copiar la genealogía argiva.',
    'Kalarrytikos; en cabecera confluyen Metsovitikos y Zagoritikos/Vardas. Son relaciones hidrográficas documentadas por el parque de Tzoumerka.',
    'Desde el entorno de Metsovo baja por las montañas epirotas, atraviesa la garganta de Plaka y el territorio de Ambrakia hasta el golfo. El embalse de Pournari es moderno y no forma parte del paisaje antiguo.', 'S7 ARA')

agregar('euenos-aitolia',
    'Territorio de los Bōmioi, dentro del país de los Ophieis en Etolia montañosa, según Estrabón 10.2.5; no se fija su origen en Oitē por mera proximidad regional.',
    'Mar Jónico, costa septentrional del golfo de Patras, en el sector de Kalydōn (Estrabón 10.2.5).',
    'Euēnos figura entre los hijos fluviales de Océano y Tetis (C; Hes. Th. 337–345). Se distingue esta personificación del rey mítico Eveno y de las diversas explicaciones del cambio de nombre desde Lykormas.',
    'Estrabón no individualiza sus tributarios en el pasaje usado; se describe la cuenca sin asignar nombres modernos a cursos antiguos no identificados.',
    'Desde el país ophieo baja por Etolia, pasa por los territorios de Chalkis y Kalydōn, gira ante la llanura de la antigua Pleurōn y alcanza el mar. Estrabón lo llama antiguamente Lykormas y sitúa aquí el episodio de Nessos (C; 10.2.5).', 'S10B H')

agregar('inakhos-akarnania',
    'Identificación controvertida entre cursos de Anfiloquía y de la vertiente occidental del Pindos. Los pasajes de Estrabón citados no permiten señalar un nacimiento único sin resolver esa homonimia.',
    'Estrabón 7.7.7 habla de un Inakhos que llega al golfo de Ambracia; 7.7.8 dice que el Inakhos desemboca en el Achelōos. La divergencia no se reduce a una desembocadura única supuestamente segura.',
    'Nombre explicado por analogía con el Inakhos argivo en el relato de la fundación de Argos Anfilóquica (C; Estrabón 7.7.7). No es prueba de una deidad local con la misma genealogía.',
    'No es posible asignar una lista firme mientras la ficha reúna identificaciones antiguas divergentes. La red moderna del Inachos del Achelōos no se confunde con la de un curso del golfo de Ambracia.',
    'La descripción previa de esta ficha sigue la versión anfilóquica hacia Ambracia; se conserva, pero se hace explícita la otra versión de Estrabón, hacia el Achelōos (7.7.7–8).', 'S7 ACHET')

agregar('thyamis-epeiros',
    'Cuenca de Kalpaki y red superior del Gormos, que recoge las aguas de Pogoni. El organismo de gestión distingue las surgencias del curso principal de las de sus afluentes.',
    'Mar Jónico, al norte de Igoumenitsa, frente al sector meridional de Corcira; el delta incluye cauces antiguos y modernos.',
    'No se ha verificado una imagen o una genealogía individual del Thyamis en las fuentes consultadas. La importancia del río como frontera no demuestra por sí sola un culto personificado.',
    'Gormos, Tyria, Smolitsa, Veltsistikos, Lagkavitsa y otros cursos menores, con sus nombres del inventario moderno del organismo Kalamas–Acheron.',
    'Desde el alto valle de Kalpaki recorre Ioannina y Tesprotia, atraviesa las gargantas del Kalamas y desciende al delta del Jónico. Es el Kalamas moderno; la reconstrucción antigua debe distinguir los cambios del tramo bajo.', 'THY EPIR')


agregar('boudoros',
    'El curso moderno Voudoros se forma por la reunión del Nileas y el Kireas en el entorno de Mantoudi; no se reduce su origen a un manantial único (inventario WWF GR242EUB005).',
    'Mar Egeo, en la costa de Kērinthos, al nordeste de la población moderna de Kirinthos (Estrabón 10.1.5; WWF).',
    'No se documenta una personificación individual en el pasaje de Estrabón ni en el inventario usado; no se supone un dios sólo por existir el hidrónimo.',
    'Nileas y Kireas, que forman el Voudoros moderno al reunirse cerca de Mantoudi (WWF, inventario de campo).',
    'El Budōros antiguo pasa junto a Kērinthos. La identificación con el Voudoros moderno lo sitúa desde la confluencia de Mantoudi hasta el estuario de la costa oriental de Eubea (Estrabón 10.1.5; WWF).', 'S10A BOU')

agregar('lelas',
    'Cuenca montañosa de Dirphys/Xirovouni, en Eubea central, con aportes de la depresión interior de Gides (Ghilardi y colaboradores, 2022).',
    'Golfo de Eubea meridional, en el delta de la llanura Lelantina, próximo a Lefkandi; la línea de costa y los brazos de desembocadura han cambiado desde la Antigüedad.',
    'No se ha verificado una personificación antigua individual del Lēlas/Lēlantos en las fuentes usadas. Se mantiene separada la descripción física de una supuesta genealogía divina.',
    'Red de arroyos de las vertientes de Dirphys/Xirovouni y de la cuenca de Gides; el estudio citado no se usa para atribuir nombres antiguos no identificados a cada ramal.',
    'De las montañas centrales pasa por la cuenca de Gides, atraviesa los relieves intermedios y forma el delta y la llanura Lelantina entre el entorno de Chalkis y Eretria. El estudio documenta migraciones laterales de la desembocadura.', 'LIL')

agregar('kallas',
    'Cabeceras de Eubea septentrional. Estrabón sitúa Ōreos al pie de Telēthrion, sobre el Kallas, pero no identifica un manantial concreto (10.1.4).',
    'Costa septentrional de Eubea, en el sector de Histiaia/Ōreos; el detalle del delta no se fija exclusivamente a partir del texto de Estrabón.',
    'No se ha verificado una personificación individual en el pasaje geográfico consultado.',
    'El texto de Estrabón usado para la identificación no enumera sus tributarios; no se adjudican nombres por conjetura.',
    'Curso de Eubea septentrional ligado a Histiaia/Ōreos. Estrabón lo emplea como referencia para la ubicación de la ciudad junto a Telēthrion (10.1.4).', 'S10A')

agregar('iardanos-kreta',
    'En la identificación con el Keritis, manantiales de Meskla en el pie de las Montañas Blancas; ésta es la equivalencia adoptada por la documentación regional de Creta.',
    'Costa norte de Creta, junto a Platanias, al oeste de Kydōnia/Chania, en la identificación moderna con el Keritis.',
    'Homero sitúa a los kydōnes junto a sus corrientes (Od. 3.292–293), pero ese pasaje no fija una personificación. No se le atribuye al río cretense la genealogía del Iardanos lidio.',
    'La ficha regional del Keritis describe sus fuentes y valle, sin dar una lista antigua de afluentes identificados; no se completa por analogía con otros ríos.',
    'Desde Meskla atraviesa el valle de Alikianos y llega a la playa de Platanias como Keritis/Platanias. Homero sólo permite situar el Iardanos en el ámbito de los kydōnes; la equivalencia moderna debe distinguirse de esa mención antigua.', 'IAR')

agregar('kairatos-kreta',
    'Manantiales próximos a Archanes, al sur de Knōsos, en el entorno de Giouchtas; el expediente arqueológico de UNESCO distingue la cabecera del cauce que pasa junto al palacio.',
    'Costa norte de Creta, al este del entorno de Heraklion, en el sector de Katsambas/Nea Alikarnassos.',
    'La documentación geográfica y arqueológica citada no establece una imagen o genealogía individual del Kairatos. Su relación con Knōsos no basta para atribuirle un dios específico.',
    'Vlychia, que confluye con el Kairatos al sudeste del yacimiento de Knōsos (expediente UNESCO).',
    'Fluye hacia el norte desde Archanes, pasa por el lado oriental del palacio de Knōsos y continúa hacia el litoral. El Vlychia delimita el sector meridional del yacimiento.', 'KAI S10D')

agregar('lethaios-kreta',
    'Cabeceras al norte de Gortyna, en la vertiente meridional de la región del Ida. La precisión depende de si el nombre antiguo se restringe al ramal de Gortyna o se extiende al sistema del Geropotamos.',
    'Sistema de Mesara que sale al mar de Libia por el Geropotamos. En la identificación restringida con el Mitropolianos, éste se incorpora primero al Geropotamos; los catálogos no usan siempre Lethaios con la misma extensión.',
    'No se ha fijado una personificación individual segura en los testimonios consultados. La tradición de Zeus y Europa en Gortyna no convierte por sí sola al río en un dios con genealogía propia.',
    'No se ofrece una lista única porque la extensión del nombre es discutida: lo que sería afluente del Geropotamos puede ser el propio Lethaios en la identificación restringida.',
    'Estrabón 10.4.11 lo hace atravesar el territorio de Gortyna. Barrington y ToposText lo equiparan al Geropotamos; otra propuesta lo identifica con el Mitropolianos que cruza la ciudad. Se conserva la distinción entre ambas escalas de identificación.', 'S10D LETC LETT LETM')

agregar('inopos-inopo-delos',
    'Pequeña cuenca de la isla de Dēlos, con aguas pluviales y obras de captación. La alimentación subterránea desde el Nilo es tradición antigua (C), no una conexión física demostrada (Paus. 2.5.3; Calímaco, Himno a Delos 206–208).',
    'Costa de Dēlos. La documentación hidráulica describe una conducción al puerto y la relación antigua con el Lago Sagrado; esas obras no permiten fijar sin matiz una única desembocadura natural para todas las épocas.',
    'Inōpos, padre de las ninfas delias en la poesía de Calímaco (C; Himno a Delos 252–263). Su conexión con el Nilo forma parte del lenguaje mítico y religioso de la isla.',
    'No se documentan afluentes individuales con nombre en los testimonios citados; es una red insular pequeña, con escorrentía y captación de agua.',
    'Estrabón 10.5.2 describe un pequeño río que recorre Dēlos. Las cisternas y conducciones estudiadas por ITIA muestran su integración en el abastecimiento y el drenaje de la isla.', 'P2A INO INOH')

agregar('kouris-kypros',
    'Vertientes meridionales del macizo del Troodos; la cuenca moderna alcanza las zonas altas del macizo (estudio de la Universidad Tecnológica de Chipre).',
    'Costa meridional de Chipre, en el sector de Kourion/Episkopi. La presa de Kouris y los trasvases actuales no se proyectan sobre la hidrografía antigua.',
    'No se ha documentado una personificación antigua individual con el nombre Kouris en las fuentes usadas. El nombre moderno de la cuenca y la proximidad de Kourion no bastan para establecerla.',
    'Limnatis y Kryos, que confluyen con el Kouris por encima de la presa actual; el trasvase desde Arminou no es un afluente natural (estudio de la cuenca del Kouris).',
    'Desciende desde el Troodos hacia el sur, reúne las redes del Limnatis y el Kryos y continúa hacia la costa del entorno de Kourion. El inventario moderno registra la fuerte intervención hidráulica reciente.', 'KOU CYD')

agregar('pedieos-kypros',
    'Bosque de Machairas, en las laderas nororientales del Troodos; cuenca alta de Kionia (Cyprus Institute, proyecto ACTIVATE).',
    'Históricamente, bahía de Salamis/Famagusta. Actualmente parte del drenaje termina en embalses de riego al oeste de Famagusta; se distingue el destino natural antiguo de las derivaciones modernas.',
    'No se ha establecido una personificación individual del Pediaios en las fuentes consultadas. El inventario hidrográfico moderno no aporta por sí solo evidencia de culto antiguo.',
    'La red moderna incluye los cursos Almyros y Kalogyros, identificados en el catálogo oficial de presas como pertenecientes al sistema Pediaios.',
    'Desde Machairas avanza al nordeste por el entorno de Tamassos hacia Nicosia y luego al este por Mesaoria hacia Salamis. El desvío del cauce urbano de Nicosia en época veneciana y las presas modernas alteraron su recorrido.', 'PED CYD')

agregar('hermos-aiolis',
    'Montaña sagrada Dindymēnē en Misia, según Estrabón 13.4.5; se conserva la localización antigua como tal, sin equipararla por mera semejanza a todos los montes llamados Dindymos.',
    'Egeo, en el litoral del golfo de Smyrna al sur del sector de Phōkaia; Estrabón sitúa la salida cerca de Phōkaia (13.4.5). La desembocadura del Gediz moderno ha sido modificada.',
    'Hermos, dios fluvial incluido entre los hijos de Océano y Tetis en la tradición (C; Hes. Th. 337–345).',
    'Paktōlos y Hyllos/Phrygios, nombrados por Estrabón 13.4.5. Se mantiene su nomenclatura y no se fuerza una equivalencia moderna para cada hidrónimo.',
    'Desde las cabeceras del interior atraviesa Katakekaumenē y las llanuras del territorio de Sardeis, recibe el Paktōlos y otras aguas lidias y continúa al Egeo (Estrabón 13.4.5).', 'S13H H')

agregar('kaikos-aiolis',
    'Estrabón sitúa las fuentes en una llanura cercana a Gergitha y niega que nazca en el Ida (13.1.70). El Temnos aporta el Mysios; no se confunde el nacimiento de ese afluente con el del Kaïkos.',
    'Golfo Elaítico, en la costa de Teuthrania, en el ámbito de Elaia y Pitane (Estrabón 13.1.69–70).',
    'Kaïkos, hijo de Océano y Tetis en la tradición (C; Hes. Th. 337–345). Los testimonios trágicos lo invocan como río de Misia.',
    'Mysios, procedente del Temnos, y la red de torrentes en la que Estrabón incluye el Kēteios; éste llega al Kaïkos a través de otros cursos, no necesariamente como afluente directo (13.1.70).',
    'Recorre la cuenca de Teuthrania y el ámbito de Pérgamo antes de salir al golfo Elaítico. La descripción de Estrabón permite separar el cauce principal de los tributarios del Temnos (13.1.69–70).', 'S13 H')

agregar('kaystros-ionia',
    'Cabeceras de Lidia en el entorno de Tmōlos y la llanura del Kaÿstros. Estrabón relaciona el curso con el sector de Leimōn y el santuario del héroe Kaystros (14.1.44).',
    'Egeo junto a Ephesos. Las aportaciones aluviales hicieron avanzar la costa y alteraron la relación entre la ciudad, el puerto y el mar (Estrabón 14.1.24).',
    'Kaystros, padre mítico del epónimo Ephesos (C; Paus. 7.2.8); Estrabón menciona un heroon de Kaystros (14.1.44). El testimonio es más preciso que suponer una genealogía oceánica no expresada en esos pasajes.',
    'Las fuentes citadas no dan un catálogo seguro de tributarios con nombres antiguos. Hermos y Maiandros pertenecen a cuencas vecinas y no son afluentes del Kaÿstros.',
    'Atraviesa la llanura lidia entre los sistemas de Tmōlos y Mesōgis y desciende hacia Ephesos y su antigua costa portuaria (Estrabón 14.1.24, 44).', 'S14 KAY')

agregar('maiandros-ionia',
    'Kelainai de Frigia: Jenofonte sitúa sus fuentes bajo el palacio de Ciro y describe el río atravesando el parque y la ciudad (An. 1.2.7).',
    'Egeo, entre el ámbito de Milētos y Priēnē. Las acumulaciones de sedimentos convirtieron antiguas ensenadas en tierra firme; no se reproduce la desembocadura moderna como costa de todas las fechas (Paus. 8.24.11; Estrabón 14.1.10–12).',
    'Maiandros, hijo de Océano y Tetis en la tradición (C; Hes. Th. 337–345). Se distingue la personificación del río del motivo geométrico que recibió su nombre.',
    'Marsyas, cuya confluencia en Kelainai describe expresamente Jenofonte (An. 1.2.8). La lista no pretende agotar la extensa red del Meandro.',
    'Desde Kelainai atraviesa el interior de Frigia y las tierras de Caria hasta la llanura de Jonia meridional; su tramo bajo pasa por el ámbito de Magnesia, Myous, Milētos y Priēnē (Paus. 2.5.3; Estrabón 14.1.10–12).', 'XEN S14 P8B P2A H')

agregar('hebros',
    'Cabecera moderna del Maritsa/Evros en los montes Rila. La tradición transmitida en torno a Alceo lo hace descender del Rhodopē; se distinguen la descripción poética antigua y la identificación hidrográfica actual.',
    'Egeo septentrional o mar Tracio, junto a Ainos, frente a Samothrakē (Alceo, fr. 45a–b; documentación INTERREG).',
    'Hebros, río sagrado interpelado por Alceo (fr. 45a–b); la tradición lo trata como figura fluvial divina. Los testimonios usados no fijan una representación escultórica concreta ni una filiación parental segura.',
    'Arda/Ardas y Tundzha/Tunca, afluentes principales documentados por FAO. No se confunde el Arda con el propio Maritsa/Hebros.',
    'Cruza Tracia desde Rila hacia el sudeste, recibe las redes del Arda y el Tundzha en el sector de la actual Edirne y gira al sur hacia Ainos y el delta del mar Tracio.', 'HEB HEBH HEBT')

agregar('strymon',
    'Macizo de Vitosha, al sur de Sofia, según la documentación hidrográfica de la cuenca transfronteriza Struma/Strymon (UNESCO/INWEB).',
    'Golfo Estrimónico del Egeo septentrional, después del sector de Amphipolis.',
    'Strymōn, hijo de Océano y Tetis en la tradición (C; Hes. Th. 337–345). Es la personificación del río, no el nombre de un rey histórico identificado.',
    'Angitēs, tributario de la cuenca baja cuya cabecera kárstica está documentada en Piges tou Angiti; la red completa incluye otros cursos transfronterizos, que no se enumeran sin identificación antigua segura.',
    'Desde Vitosha recorre hacia el sur la Bulgaria occidental, entra en la cuenca de Serrai y continúa por Amphipolis hasta el Egeo. El embalse actual de Kerkini y las obras de regulación no se proyectan sobre el paisaje antiguo.', 'H STRH STRA')


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
            texto = enlazar_texto(registro['campos'][clave], rid, clave)
            if campo.get('texto') != texto:
                campo.update(texto=texto, refs=[])
        fuentes = ficha.setdefault('fuentes', [])
        for codigo in registro['fuentes']:
            titulo, url = FUENTES[codigo]
            existente = next((f for f in fuentes if f.get('url') == url), None)
            if existente is None:
                fuentes.append({'titulo': titulo, 'url': url})
            elif 'Jautzy' in existente.get('titulo', ''):
                existente['titulo'] = titulo
        salida = json.dumps(ficha, ensure_ascii=False, indent=2) + ('\n' if original.endswith('\n') else '')
        if salida != original:
            path.write_text(salida, encoding='utf-8')
            cambios += 1
    print(f'{len(elegidos)} fichas revisadas; {cambios} actualizadas')


if __name__ == '__main__':
    main()
