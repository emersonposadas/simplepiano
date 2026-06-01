# Pocket Piano

Piano web responsive listo para GitHub Pages. Es una aplicación estática: no usa Python, backend, build tools ni dependencias externas.

## Archivos

- `index.html`
- `style.css`
- `script.js`
- `manifest.webmanifest`
- `sw.js`
- `icon.svg`

## Publicar en GitHub Pages

1. Sube estos archivos a la raíz del repositorio.
2. Ve a **Settings → Pages**.
3. Selecciona **Deploy from branch**.
4. Usa la rama `main` y carpeta `/root`.
5. Abre la URL de GitHub Pages.

## Caché

Si cambias archivos y Chrome muestra una versión antigua, desregistra el Service Worker desde DevTools → Application → Service Workers → Unregister, luego limpia los datos del sitio.
