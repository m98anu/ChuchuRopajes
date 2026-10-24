# Chuchu Ropajes

Agregador de tiendas de ropa con fibra y confección europeas, filtrable por tipo de prenda y género (mujer, hombre o neutro), con modo claro y oscuro.

## Cómo está hecho

- `index.html`, `assets/` — web estática, sin dependencias ni paso de compilación.
- `data/sites.json` — la lista de tiendas. Para añadir una, copia un bloque y rellena:
  - `gender`: `mujer`, `hombre` o `neutro` (si vende para ambos).
  - `categories`: una o varias de las claves de `categories`.
  - `level`: 3 = fibra y confección europeas con cadena publicada; 2 = confección europea, fibra de fuera o sin detallar; 1 = solo confección europea.
- `scripts/check_links.py` — comprueba cada enlace y guarda `status` (`ok` / `roto`) y `last_checked`.

## Automatización

- **Publicar web** (`.github/workflows/pages.yml`): publica en GitHub Pages en cada push a `main`.
- **Revisar enlaces** (`.github/workflows/check-links.yml`): el día 1 de cada mes comprueba los enlaces, guarda el resultado y vuelve a publicar.
- Además, una tarea programada de Claude busca tiendas nuevas cada mes y las añade con su fuente.

Para que la publicación funcione, en **Settings → Pages → Build and deployment → Source** elige **GitHub Actions** (una sola vez).

## Probar en local

```sh
python3 -m http.server 8000
# abre http://localhost:8000
```
