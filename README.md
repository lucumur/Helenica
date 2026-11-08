# Helénica

Repositorio de mitología y cultura griega: **entes** (dioses, héroes, ninfas, reyes, bestias, epítetos), **eventos** (relatos, festividades, ritos, hechos históricos), **lugares** y **objetos**, con genealogías, epítetos, cultos y fuentes.

- [Inicio](index.html) · [Entes](entes.html) · [Eventos](eventos.html) · [Lugares](lugares.html) · [Objetos](objetos.html)

Contenido inicial importado de la sección *Cultura Helénica* y de las fichas helénicas de la Library de Tana.

## Cómo funciona

Sitio estático sin paso de build. Cada ficha es un JSON en `data/<colección>/<id>.json`; `data/index.json` se regenera automáticamente con GitHub Actions al hacer push. El esquema y las convenciones para editar están en [AGENTS.md](AGENTS.md).

## Modo edición

Botón **✎ Editar** en la barra de navegación. Pide un token *fine-grained* de GitHub (solo el repo `helenica`, permiso **Contents: Read and write**), que se guarda únicamente en tu navegador. Con el modo activo puedes editar una ficha (JSON) o crear una nueva desde la lista de cada colección; cada guardado es un commit en `main`. El índice se actualiza ~1 minuto después.

## Publicación

- **Cloudflare Workers** (como Conlang): conectar el repo en *Workers & Pages → Create → Import a repository*; `wrangler.jsonc` ya está configurado (sin comando de build).
- **GitHub Pages**: *Settings → Pages → Deploy from a branch → main / (root)*.

## Mapa de regiones

[Mapa interactivo](mapa.html): costa del Mediterráneo oriental, puntos numerados, búsqueda, filtros, zoom y enlaces a las fichas de tier 1. Se accede desde la navegación, Inicio, Lugares y las fichas regionales.

- `data/mapa/regiones.json`: posiciones de referencia en orden longitud/latitud, ids de las fichas y notas. Tracia y Thrakē comparten un punto; Hades, Katokosmos e Hiperbórea no tienen coordenadas terrestres.
- `data/mapa/costas.geojson`: recorte simplificado de la capa **Natural Earth land 1:50m**, de dominio público, entre 15–38° E y 29–45° N. [Origen](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_land.geojson) · [Licencia](https://www.naturalearthdata.com/about/terms-of-use/).
- La costa es actual y generalizada; los puntos no representan fronteras históricas. El mapa se sirve con los archivos locales, sin un servicio externo de teselas.
- Al añadir una ficha de tier 1, agregarla también al catálogo del mapa. Mientras no tenga posición, el directorio la conserva como pendiente de ubicación.
