# Helénica — guía para editar fichas

Instrucciones para cualquier editor (persona, Claude, ChatGPT, Grok) que modifique este repositorio.

## Estructura

```
data/entes/<id>.json     dioses, héroes, ninfas, reyes, bestias, epítetos, pueblos
data/eventos/<id>.json   relatos míticos, festividades, ritos, hechos históricos
data/lugares/<id>.json   regiones, poleis, santuarios, ríos, montes, fuentes…
data/objetos/<id>.json   armas, atributos divinos, agalmata, objetos rituales
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

Las grandes áreas se definen en `data/areas.json` (`id`, `nombre`, `grupo`, `descripcion`), en tres grupos: `helade` (Peloponeso, Ática, Beocia, Eubea, Grecia Central, Tesalia, Macedonia y Calcídica, Islas del Egeo, Creta, Jonia y Anatolia), `extranjera` (Tracia, Libia, Italia, Iberia, Hiperbórea, Sauromatia, Escitia, Cólquide, Egipto, Fenicia y Levante, Persia y Asia, Etiopía) y `mitica` (Inframundo, Geografía mítica). Un lugar nuevo debe llevar un id de área existente; para agregar un área nueva, añádela primero en `data/areas.json`. El validador rechaza áreas no definidas.

Tipología de lugares (`data/tipologia.json`, tres ejes):

- `escala` (una): `region` (gran región de referencia), `chora` (entidad regional dominada por un centro que reclama sus bordes), `ethnos` (región de un pueblo sin centro dominante), `asentamiento`, `componente` (parte de un asentamiento: acrópolis, ágora, barrio, muralla, edificio), `sitio` (fuera de asentamiento: santuario extraurbano, tumba, monte, río…). La acrópolis es siempre `componente`.
- `forma` (solo asentamientos; lista con periodo, porque la forma cambia en el tiempo):
  ```json
  "forma": [
    { "tipo": "multinucleado", "periodo": "geometrico", "fechas": "1000–800 a.C.", "nota": "…" },
    { "tipo": "polis-sinecizada", "periodo": "clasico" }
  ]
  ```
  Tipos: `kome`, `hieropolis`, `anaktoron`, `polis`, `polis-amurallada`, `teichos` (amurallamiento sin élite, tipo Gla), `phrourion`, `multinucleado` (katà kōmas), `mononucleado-difuso`, `polis-sinecizada`. Periodos: `micenico`, `geometrico`, `arcaico`, `clasico`, `helenistico`, `romano`, `tardoantiguo`, `medieval`, `otomano`, `moderno`. Asignar forma solo cuando lo sustente una fuente o el propio texto de la ficha.
- `funciones` (varias): `sagrado`, `funerario`, `civico`, `comercial`, `portuario`, `epineion`, `emporion`, `apoikia`, `perioikis`, `militar`, `residencial`, `elite`, `hidraulico`, `espectaculos`, `productivo`, `comunicacion`, `natural`.

Para agregar un tipo nuevo de cualquier eje, añádelo primero a `data/tipologia.json` (id, nombre, descripción); el validador rechaza valores no definidos.

**Objetos** — `tipos`, `campos`.

**Comunes a todas** — `campos`: lista de `{ "clave", "etiqueta", "texto", "refs" }` para lo que no tiene clave propia (las claves con emoji vienen de los supertags de Tana: `D📝` Descripción, `F⚙️` Función, `H📜` Historia y mito, `S🧩` Subunidades / partes…). `secciones`: lista de `{ "titulo", "texto" }` con el desarrollo narrativo (versiones por autor, iconografía, culto…). `fuentes`: lista de `{ "titulo", "url" }`.

## Criterios

- Distinguir lo establecido de lo controvertido o inferido; citar autor y obra cuando la versión dependa de la fuente.
- Nombres: forma griega transliterada en `nombre` y forma española en `nombre_alt` (`Hēraklēs` / `Heracles`).
- No borrar contenido importado de Tana sin indicación expresa.
