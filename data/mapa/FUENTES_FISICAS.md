# Geometrías de ríos y macizos

`fisico.json` vincula 101 geometrías cartográficas con 105 fichas existentes:
42 ríos y 59 macizos. Las fichas conservan sus coordenadas originales. El marcador
del atlas se coloca sobre el cauce o dentro del macizo para no separarlo del trazado.

## Ríos

© OpenStreetMap contributors, [ODbL 1.0](https://www.openstreetmap.org/copyright).
Los componentes fluviales derivados de esta base se distribuyen bajo ODbL 1.0.
Cada entrada conserva los identificadores de las vías y relaciones utilizadas;
`fuentes.osm.fecha_datos` registra la fecha de la consulta. Las relaciones se
restringen a miembros `main_stream` o sin rol; no se dibujan los afluentes de
una relación como si fueran el cauce principal.

Se incluyen:
- **Peloponeso:** Alfeo, Asopo fliasio, Cerinites, Cratis, Erimanto, Eurotas, Ínaco, Ladón, Neda, Pamiso de Mesenia, Peneo de Élide, Píero y Pontino.
- **Grecia Central y Eubea:** Asopo beocio, Asopo de Traquis, Boudoros (Níleas y Kíreas), Cefiso ático, Cefiso beocio, Esperqueo, Hileto (Mornos), Iliso y Lelas.
- **Grecia Occidental:** Aqueloo, Eveno e Ínaco de Acarnania.
- **Tesalia y Epiro:** Enipeo, Leteo de Trica, Pamiso tesalio, Peneo tesalio y Titaresio; Aoo, Aqueronte, Aracto y Tíamis (Kalamas).
- **Creta, Chipre, Asia y Tracia:** Leteo de Mesará (Geropótamos), Pedieo, Caico (Bakırçay), Hermo (Gediz), Caístro (Küçük Menderes), Meandro (Büyük Menderes), Estrimón y Hebro.

Las variantes de Ladón y Asopo beocio comparten geometría.

La consulta de vías en Overpass usó `waterway=river` (y `stream` en cauces menores insulares o locales), nombres griegos o turcos y el ámbito `[34.0,19.0,43.5,35.0]`. El importador separa los ríos homónimos mediante cajas geográficas explícitas. Las relaciones completas se obtuvieron con:

```overpass
[out:json][timeout:90];
relation(id:569717,721969,911089,911095,911096,911103,1245609,1263781,1273141,1668534,2237514,2515446,3803746,6191678,8056594,8097935,9196971,10183192,10483287,11241309,11641416,11809891,11809892,11821028,13058293,14006299,14006313,15629080,17499528,17890880,17987331,18008045,19185458,19187395,19221105,19275777);
out body geom;
```

Los tramos se unen sin inventar conexiones entre extremos separados. Se
simplifican a 0.00015 grados conservando la topología. Son cauces modernos
cartografiados, no reconstrucciones paleohidrográficas ni polígonos de cuencas.
No se presupone que incluyan todos los tramos estacionales o desaparecidos.

## Macizos

Snethlage et al. (2022), **GMBA Mountain Inventory v2.0, Standard**,
GMBA–EarthEnv. [Datos y referencia](https://doi.org/10.48601/earthenv-t9k2-1407),
[método](https://doi.org/10.1038/s41597-022-01256-y), CC BY 4.0.
Descarga original:
`https://data.earthenv.org/mountains/standard/GMBA_Inventory_v2.0_standard.zip`.

| Macizo | Unidad GMBA v2.0 | GMBA_V2_ID |
| --- | --- | --- |
| Mesogis | Aydin Mountains | 11142 |
| Latmo | Beşparmak Mountains | 11164 |
| Tmolo | Boz Mountains | 11188 |
| Egaleo (Mesenia) | Kontovounia | 11535 |
| Píndaso | Madra Mountains | 11594 |
| Troodos (Olimpo de Chipre) | Troödos Mountains | 11651 |
| Olimpo (Tesalia) | Mount Olympus | 11685 |
| Otris | Mount Othrys | 11693 |
| Parnón | Parnon Oros | 11710 |
| Taigeto | Taiyetos Oros | 11973 |
| Sípilo | Mount Yamanlar | 12081 |
| Montes Blancos (Creta) | White Mountains | 12705 |
| Aspordeno | Yunt Mountains | 12778 |
| Montes Ceraunios | Ceraunian Mountains | 12959 |
| Ida frigio / Kaz | Kaz Mountains | 14617 |
| Mimas | Nif Mountains | 14711 |
| Montes Acarnanios | Acarnanian Mountains | 14787 |
| Asterusia | Arethousia Mountains | 14790 |
| Eno (Cefalonia) | Agia Dinati | 14800 |
| Atamanios | Tzoumerka | 18100 |
| Timfe | Zagori Mountains | 18413 |
| Pindo (Ágrafa) | Agrafa Mountains | 18416 |
| Lepetimno (Lesbos) | Lesvos | 18680 |
| Cerceteo (Samos) | Samos | 18681 |
| Atabirio (Rodas) | Rhodos | 18682 |
| Pelineo (Quíos) | Chios | 18683 |
| Zas (Naxos) | Naxos | 18684 |
| Courión (Andros) | Andros | 18687 |
| Montes de Cerinea | Pentadactylos | 18709 |
| Mícale | Dilek Peninsula | 18710 |
| Dicte (Creta) | Dikti | 18946 |
| Pramno (Icaria) | Icaria | 19289 |
| Ida (Creta) | Crete (nn) | 19456 |
| Camvunios | Kamvounia Mountains | 19882 |
| Cercetio | Kerketion | 19883 |
| Córax | Vardousia Mountains | 19886 |
| Osa | Mount Ossa | 19889 |
| Pelión | Pelion | 19891 |
| Aséleno (Giona) | Giona | 19894 |
| Parnaso | Parnassos | 19895 |
| Eta | Oeta Mountains | 19896 |
| Cnemis y Calídromo | Kallidhromon | 19897 |
| Geraneia | Geranela Mountains | 19898 |
| Aracinto | Arakinthos Mountains | 19899 |
| Panetólico | Panaitolikon Mountains | 19901 |
| Timfresto | Timfristos Mountains | 19903 |
| Helicón | Helikon Mountains | 19904 |
| Parnes | Parnitha | 19905 |
| Citerón | Kithairon | 19906 |
| Pateras | Mount Pateras | 19907 |
| Erimanto | Erimanthos | 19962 |
| Panaqueo | Panakhaikon Mountains | 19963 |
| Aroania | Aroania Mountains | 19964 |
| Cilene | Kyllini Mountains | 19965 |
| Ménalo | Mainalon Mountains | 19966 |
| Artemisio | Trakhi Mountains | 19967 |
| Lirceo | Lirkion Mountains | 19968 |
| Tómaro (Dodona) | Tomaros | 20356 |
| Montes Tesprotos | Thesprotika Mountains | 20777 |

Son extensiones generalizadas de macizos, no curvas de nivel ni límites antiguos.
Se simplificaron a 0.00035 grados conservando topología y huecos; se redondearon
las coordenadas a cinco decimales. Las dos fichas de Geraneia comparten contorno.

No se asigna la unidad extensa «Oneia Mountains» de este inventario al pequeño
macizo Oneia de la ficha corintia: su ámbito es mucho mayor. Tampoco se usa
«Euboean Mountains» como si fuera el contorno individual de Dirphys u Ochē.
Los montes y cursos sin una correspondencia documentada conservan su marcador
y muestran «Extensión pendiente de documentar» en el panel.

## Regeneración

Con Python, `pyshp` y `shapely`, usar `scripts/build_fisico.py` con el shapefile
Standard, la respuesta de vías y la respuesta de relaciones de Overpass. Los
archivos de entrada se guardan fuera del repositorio. El atlas usa el JSON
estático; no consulta Overpass ni descarga el inventario al navegar.

`scripts/validate.py` comprueba identificadores, referencias, fuentes,
coordenadas, cajas de encuadre y cierre de los polígonos.
