# Geometrías de ríos y macizos

`fisico.json` vincula 19 geometrías cartográficas con 23 fichas existentes:
12 ríos y 7 macizos. Las fichas conservan sus coordenadas originales. El marcador
del atlas se coloca sobre el cauce o dentro del macizo para no separarlo del trazado.

## Ríos

© OpenStreetMap contributors, [ODbL 1.0](https://www.openstreetmap.org/copyright).
Los componentes fluviales derivados de esta base se distribuyen bajo ODbL 1.0.
Cada entrada conserva los identificadores de las vías y relaciones utilizadas;
`fuentes.osm.fecha_datos` registra la fecha de la consulta. Las relaciones se
restringen a miembros `main_stream` o sin rol; no se dibujan los afluentes de
una relación como si fueran el cauce principal.

Se incluyen Alfeo, Asopo fliasio, Asopo beocio, Cerinites, Erimanto, Ladón,
Lelas, Pamiso de Mesenia, Peneo de Élide, Pontino, Estrimón y Hebro.
Las variantes de Ladón y Asopo beocio comparten geometría.

La consulta inicial de vías en Overpass usó `waterway=river|stream`, nombres
griegos y el ámbito `[34,19,42,28]`. El importador separa los ríos homónimos
mediante cajas geográficas explícitas. Las relaciones completas se obtuvieron con:

```overpass
[out:json][timeout:90];
relation(id:721969,2515446,8056594,10183192,10483287,11809892,17499528,19221105,19275777);
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

| Macizo | GMBA_V2_ID |
| --- | --- |
| Parnón | 11710 |
| Taigeto | 11973 |
| Ida frigio / Kaz Mountains | 14617 |
| Geraneia | 19898 |
| Erimanto | 19962 |
| Aroania | 19964 |
| Ménalo | 19966 |

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
