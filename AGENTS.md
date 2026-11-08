# Helénica — guía para editar fichas

Instrucciones para cualquier editor (persona, Claude, ChatGPT, Grok) que modifique este repositorio.

## Estructura

```
data/entes/<id>.json     dioses, héroes, ninfas, reyes, bestias, epítetos, pueblos
data/eventos/<id>.json   relatos míticos, festividades, ritos, hechos históricos
data/lugares/<id>.json   regiones, poleis, santuarios, ríos, montes, fuentes…
data/objetos/<id>.json   armas, atributos divinos, agalmata, objetos rituales
data/mapa/zonas.json     contornos aproximados de las áreas y subregiones (editable)
data/mapa/periodos.json  fechas del mapa: quién controla cada subregión
data/mapa/areas.geo.json GENERADO — siluetas de las áreas recortadas a la costa
data/mapa/tierra.json    costa Natural Earth 1:10m (dominio público); también rios.json y lagos.json
data/areas.json          grandes áreas geográficas (Hélade, tierras extranjeras, geografía mítica)
data/tipologia.json      escalas, formas de asentamiento, funciones y periodos de los lugares
data/index.json          GENERADO — no editar a mano
```

- Una ficha = un archivo. El `id` es el nombre del archivo sin `.json`: minúsculas, sin acentos, palabras separadas por guiones (`herakles`, `akrokorinthos-korinthia`).
- **No cambies el `id` de una ficha existente**: los enlaces de otras fichas apuntan a él.
- `data/index.json` lo regenera GitHub Actions en cada push (`scripts/build_index.py`), después de validar (`scripts/validate.py`). Para revisar localmente: `python scripts/validate.py && python scripts/build_index.py`.

## Enlaces internos

En cualquier texto markdown se enlaza otra ficha así:

```
[Zeus](entes:zeus)   [Nemea](lugares:nemea-argolis)   [Capa Leontea](objetos:capa-leontea)   [Primer Athlos](eventos:primer-athlos-matar-al-leon-de-nemea)
```

Los padres, cónyuges, hijos, agentes, lugares y elementos se leen de esos enlaces (y de `refs`). Los hijos de un ente también se **deducen**: si la ficha de Heracles declara a Zeus como padre, Heracles aparece como hijo en la ficha de Zeus aunque Zeus no lo liste.

## Campos con texto y referencias

Casi todos los campos tienen esta forma:

```json
"padres": {
  "texto": "- [Zéus](entes:zeus)\n- [Alkmēnē](entes:alkmene) — madre\n- [Amphitryôn](entes:amphitryon-2) — padre putativo",
  "refs": [{ "col": "entes", "id": "zeus", "nombre": "Zéus" }]
}
```

- `texto`: markdown (listas con `- `, sangría de dos espacios para anidar, `**negrita**`, `*cursiva*`, imágenes `![](url)`).
- `refs`: opcional. Lo llenó el importador desde Tana (`tana` es el id del nodo original). Al editar basta con escribir los enlaces en `texto`.
- Si las fuentes discrepan, dilo en el texto: `- [Urano](entes:ouranos) (Hesíodo, *Teogonía*)` / `- [Zeus](entes:zeus) y Dione (Homero)`.

## Esquema por colección

**Entes** — categorías principales (se muestran siempre, con "Sin datos" si están vacías):

| Clave | Contenido |
|---|---|
| `nacimiento` | Nacimiento / origen (lugar, circunstancias, versiones) |
| `estirpe` | Linaje |
| `padres` | Padres (indicar rol si aplica: biológico, putativo, de crianza) |
| `conyuges` | Cónyuges / amantes |
| `hijos` | Hijos declarados (los demás se deducen) |
| `atributos` | Atributos físicos, poderes, símbolos |
| `posesiones` | Objetos que posee → enlazar a `objetos:` |
| `residencias` | Dónde vive o reina → enlazar a `lugares:` |
| `fallecimiento` | Muerte, apoteosis, catasterismo, destino en el Hades |

Otras claves: `descripcion`, `nombre_notas` (etimología del nombre), `epitetos`, `titulos`, `especie`, `contrincantes`, `aliados`, `mentores`, `asociaciones`, `funciones`, `culto`, `eventos`, `notas`.
Metadatos: `nombre`, `nombre_alt`, `tipos` (Deidad, Héroe, Realeza, Ninfa, Bestia, Epíteto, Personaje…), `genero` (`M`/`F`/`null`), `aspecto_de` (para epítetos: `{ "col": "entes", "id": "hera", "nombre": "Hêra" }`), `imagen` (URL).

**Eventos** — `tipo` (Mítico, Histórico, Festividad / rito, Culto / misterios, Rito), `descripcion`, `cuando`, `agentes_activos`, `agentes_pasivos`, `donde`, `elementos`, `problema`, `desenlace`, `serie` (`{ "nombre": "Doce Labores de Heracles", "orden": 1 }` para navegar anterior/siguiente).

**Lugares** — `tipos` (naturaleza física: Monte, Río, Santuario…), `areas` (lista de ids de gran área, normalmente una), `escala`, `forma`, `funciones`, `pertenece_a` (lista de refs al lugar contenedor; arma la ruta Región › Chora › Polis), `campos`.

Las grandes áreas se definen en `data/areas.json` (`id`, `nombre`, `grupo`, `descripcion`), en tres grupos: `helade` (Hélade y entorno), `extranjera` y `mitica`. El catálogo vigente es la fuente de verdad. Un lugar nuevo debe llevar un id de área existente; para agregar un área nueva, añádela primero en `data/areas.json`. El validador rechaza áreas no definidas.

Las 14 áreas de Hélade y entorno son: Peloponeso, Grecia Central, Grecia Occidental, Tesalia, Epiro, Macedonia, Tracia, Eubea, Islas del Egeo, Creta, Chipre, Asia Jonia, Asia Eolia y Asia Doria. Son agrupaciones de navegación, distintas de la escala/tier de una ficha y de las fronteras políticas de cada época.

- Ática y Beocia se agrupan en Grecia Central; Etolia, Acarnania y las islas del Jónico, en Grecia Occidental.
- Calcídica y Olinto se agrupan en Tracia para el marco arcaico y clásico (Tucídides, *Historia* 1.58–59). El Quersoneso Tracio es otra península, junto al Helesponto. La expansión macedonia posterior se explica en las fichas y no cambia automáticamente su área.
- Lesbos y Ténedos pertenecen a Asia Eolia; Quíos y Samos, a Asia Jonia; Cos y Rodas, a Asia Doria. Halicarnaso se agrupa en Asia Doria. Evitar duplicarlos en Islas del Egeo.
- Anatolia conserva los lugares que no pertenecen a esas tres áreas costeras (por ejemplo, Troya, el Ida frigio, Pérgamo y Lagina). No asignar todo lugar anatolio a Jonia.
- Cada una de las 14 áreas de Hélade y entorno tiene también una ficha de lugar con `tipos: ["Región"]` (o Región entre sus tipos) y `escala: "region"`, que corresponde al tier 1. Reutilizar las fichas existentes: `euboia`, `makedonia` y `tracia`; para las otras once, el id de ficha coincide con el id de área. No crear duplicados con el nombre español.
- `contiene` (opcional, sobre todo en tier 1): lista curada y ordenada de subdivisiones en grupos: `[{"grupo": "Cícladas", "nota": "…", "lugares": [{"col":"lugares","id":"naxos-kyklades","nombre":"Naxos","nota":"opcional"}]}]`. Es la vista editorial; `pertenece_a` de cada hijo sigue siendo la relación. Deben coincidir: `validate.py` avisa si un listado no declara `pertenece_a` a la ficha o si un hijo directo no está en ningún grupo. El editor web de lugares (formulario, sin JSON) sincroniza ambos lados en un solo commit. Ejemplo de referencia: `islas-egeo` (contiene las 5 regiones marítimas) y `cicladas` (contiene sus islas). `grupo` puede ser null cuando no hace falta agrupar.
- Jerarquía de referencia (Egeo): `islas-egeo` (T1, tipo Región marítima: lo que la une es solo el mar) › `cicladas` (T2, `archipielago`, tipo Conjunto de islas: lo que la une es la conexión entre islas) › `delia-kyklades` «Dēlos» (T3, eupolis: Delos + Mykonos) › `delos-nesos` y `mykonos-kyklades` (T4, `nesos`) › `delos` «Dēlos (ciudad)» (T5, `demos`) y santuarios/recintos (T5 `moira`) › edificios (T6). Cada nivel se enlaza al superior con `pertenece_a`; conservar los contenedores ya documentados.
- `epoca` (obligatoria en `region` y `archipielago`, salvo mares e inframundo): `{"anio": -300, "nota": "situación política en esa fecha"}`. Estándar de facto: **300 a.C.**; la región se describe tal como estaba en ese año. Ejemplo: `islas-egeo` › `cicladas`.
- Grecia Central, Grecia Occidental e Islas del Egeo conservan sus denominaciones editoriales; no inventar un nombre antiguo para la agrupación.
- El selector también muestra cualquier área que todavía no tenga fichas, con un recuento de cero.

Tipología de lugares (`data/tipologia.json`, tres ejes):

- `escala` (una), en seis tiers de mayor a menor: `region` (1: gran región por nombre; también mares y golfos); `archipielago` (2: conjunto de islas cuya importancia es su conexión: Cícladas, Espóradas del Norte/Sur, Egeo del Norte, Egeo Oriental) o `ethnos` (2: región de un pueblo sin centro dominante, liga o koinon); `chora` (3, «eupolis»: unidad política con su territorio, aunque abarque varias islas, p. ej. Delos con Mykonos; también ríos, cordilleras y llanuras de ese tamaño); `nesos` (4: la isla como unidad física dentro de una eupolis) o `polis-kome` (4: el asentamiento en sí, de la aldea a la polis; también islotes, cabos, lagos y montes locales); `demos` (5: barrio, distrito o núcleo urbano dentro de un asentamiento o de una isla, p. ej. la ciudad de Delos; la acrópolis como unidad) y `moira` (5: recinto, sector o paraje: ágora, témenos, santuario, murallas, necrópolis, bosque, finca); `oikema` (6: construcción individual: naos, stoa, altar, fuente, tumba, puerta, casa). Los accidentes naturales van en el tier de su tamaño. Una aldea con estatus de demos administrativo (Ática, Eretria) va en tier 4 con la función `demos-civico`. Los ids de escala no cambian aunque cambie el número de tier.
- `forma` (solo tier 4, `polis-kome`; lista con periodo, porque la forma cambia en el tiempo):
  ```json
  "forma": [
    { "tipo": "multinucleado", "periodo": "geometrico", "fechas": "1000–800 a.C.", "nota": "…" },
    { "tipo": "polis-sinecizada", "periodo": "clasico" }
  ]
  ```
  Tipos: `kome`, `hieropolis`, `anaktoron`, `polis`, `polis-amurallada`, `teichos` (amurallamiento sin élite, tipo Gla), `phrourion`, `multinucleado` (katà kōmas), `mononucleado-difuso`, `polis-sinecizada`. Periodos: `micenico`, `geometrico`, `arcaico`, `clasico`, `helenistico`, `romano`, `tardoantiguo`, `medieval`, `otomano`, `moderno`. Asignar forma solo cuando lo sustente una fuente o el propio texto de la ficha.
- `funciones` (varias): `demos-civico`, `sagrado`, `funerario`, `civico`, `comercial`, `portuario`, `epineion`, `emporion`, `apoikia`, `perioikis`, `militar`, `residencial`, `elite`, `hidraulico`, `espectaculos`, `productivo`, `comunicacion`, `natural`.

Para agregar un tipo nuevo de cualquier eje, añádelo primero a `data/tipologia.json` (id, nombre, descripción); el validador rechaza valores no definidos.

**Objetos** — `tipos`, `campos`.

**Comunes a todas** — `icono` (opcional): emoji o URL de imagen; las imágenes subidas se guardan como `data:image/…` (máximo 256 KB). Se muestra sobre el título, independiente de `imagen`; se cambia o quita con el botón de icono en modo edición, en las cuatro colecciones. `campos`: lista de `{ "clave", "etiqueta", "texto", "refs" }` para lo que no tiene clave propia (las claves con emoji vienen de los supertags de Tana: `D📝` Descripción, `F⚙️` Función, `H📜` Historia y mito, `S🧩` Subunidades / partes…). `secciones`: lista de `{ "titulo", "texto" }` con el desarrollo narrativo (versiones por autor, iconografía, culto…). `fuentes`: lista de `{ "titulo", "url" }`.

## Criterios

- Distinguir lo establecido de lo controvertido o inferido; citar autor y obra cuando la versión dependa de la fuente.
- Nombres: forma griega transliterada en `nombre` y forma española en `nombre_alt` (`Hēraklēs` / `Heracles`).
- No borrar contenido importado de Tana sin indicación expresa.

## Mapa

`mapa.html` (con `mapa.js` y `mapa.css`) dibuja un atlas propio en SVG, sin librerías externas. Cada ficha de lugar también muestra un mini-mapa.

- **Niveles de zoom:** diez niveles, del 0 al 9; se fusionaron los antiguos 0–1, 2–3 y 4–5. `subzonas[].nivel` en `zonas.json` usa la numeración actual (islas: nivel 6).
- **Rueda del ratón:** avanzar o retroceder un nivel numérico por paso, con animación y anclaje bajo el cursor. Los pasos rápidos se procesan consecutivamente; agrupar los deltas pequeños de trackpad. Arrastrar o navegar directamente cancela la animación y los pasos pendientes.

- **Puntos:** un lugar se ubica con `"geo": { "punto": [longitud, latitud], "precision": "aprox" }` dentro de su ficha. Las choras, ethne y poleis/komai con punto aparecen en el mapa según el zoom. Un edificio o recinto puede llevar el punto de su sitio con `"precision": "heredada", "de": "Corinto"`; esos no se dibujan como marcadores propios, solo sirven para el mini-mapa.
- **Nombres en el mapa:** en griego transliterado (Mykonos, Anaphē, Lakōnikē); el español queda como segunda línea o en la búsqueda. En `zonas.json` cada subzona lleva `nombre` (griego), `nombre_es` y `capital.nombre` (griego, con `nombre_es`). Las etiquetas de área usan el nombre de la ficha de región si difiere del español.
- **Áreas:** la silueta de cada gran área se genera recortando un contorno aproximado (`data/mapa/zonas.json`) contra la costa real (`data/mapa/tierra.json`, Natural Earth 1:10m). Para mover una frontera, edita los vértices `[lon, lat]` de la zona en `zonas.json`; el orden es la prioridad cuando dos zonas se solapan; `"tipo": "islas"` solo toma islas completas y `"toma_islas": false` impide que una zona continental se quede con islas. GitHub Actions regenera `data/mapa/areas.geo.json` con `scripts/build_mapa.py` (requiere shapely). No editar `areas.geo.json` a mano.
- Las áreas sin localización terrestre (Inframundo, Geografía mítica, Hiperbórea, Etiopía) no llevan zona: aparecen como accesos fuera del mapa.
- **Subregiones** (por ahora las 7 del Peloponeso): `subzonas` en `data/mapa/zonas.json`, cada una con `id`, `nombre`, `griego`, `padre` (área), `ficha` opcional, `nota` y `poligono`. Se recortan contra la silueta del área madre y aparecen al acercar el zoom.
- **Fechas:** `data/mapa/periodos.json` define el selector (900, 600, 300 a.C., 0 d.C.), sin opción sin fecha y con **300 a.C.** como valor inicial predeterminado: para cada fecha, un `resumen` y, por subregión, el `poder` que la controla y una `nota`; si el poder no es el propio de la subregión se dibuja rayado. Los colores de los poderes están en `poderes`. Para añadir una fecha, añade un objeto a `periodos` con `id`, `anio` (negativo = a.C.), `etiqueta`, `periodo` (id de tipologia.json) y `subregiones`.
- **Vigencia de lugares:** `geo.desde` / `geo.hasta` (años, negativos = a.C.) ocultan el punto en las fechas en que el lugar no existía (p. ej. Mesene `desde: -369`).
- `data/mapa/rios.json` y `lagos.json` vienen de Natural Earth y no se editan.
- **Accidentes físicos:** `data/mapa/fisico.json` contiene cauces (listas de líneas) y extensiones de macizos (polígonos con huecos) vinculados a fichas mediante `lugares`. Fuentes, licencias y limitaciones en `data/mapa/FUENTES_FISICAS.md`; regeneración con `scripts/build_fisico.py`. No sustituir una geometría faltante por un círculo, una cuenca hidrográfica o un macizo distinto. Las fichas conservan sus puntos originales.
- **Zoom de accidentes:** cauces de ríos y extensiones de macizos aparecen desde el **nivel 5**. Sus iconos y nombres, incluidos los de tier 4 (`polis-kome`), aparecen desde el **nivel 7**. Usar el nivel numérico mostrado por el mapa (`zlevel`), independientemente de la barra de escala y del tamaño de la ventana; al seleccionar una ficha con geometría se resalta y encuadra su extensión completa, aunque necesite una vista más alejada. Los controles Ríos y Montes también ocultan sus respectivos contornos e iconos.

