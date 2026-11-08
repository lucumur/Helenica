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

## Mapa

[Atlas interactivo](mapa.html): Mediterráneo y mar Negro con las grandes áreas recortadas a la costa real, ríos y lagos, choras y poleis que aparecen al acercarse, buscador, panel por área o lugar y enlaces a las fichas. Cada ficha de lugar incluye un mini-mapa.

- Costa, ríos y lagos: **Natural Earth 1:10m**, dominio público ([naturalearthdata.com](https://www.naturalearthdata.com/)).
- Fronteras de áreas: contornos convencionales en `data/mapa/zonas.json`, recortados con `scripts/build_mapa.py`. No son límites históricos.
- Puntos: `geo.punto` en cada ficha de lugar; ubicaciones aproximadas.
