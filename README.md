# Pocket Piano

Piano web estático con apariencia de aplicación móvil, listo para GitHub Pages.

## Características

- 100% HTML, CSS y JavaScript.
- Sin Python, sin backend y sin dependencias externas.
- Sonido tipo piano tradicional generado con Web Audio API.
- Diseño compacto tipo app.
- Responsive en vertical y landscape.
- Multitáctil para móvil y tablet.
- Teclas con animación, iluminación y vibración compatible.
- Selector de octavas, volumen, sustain y pantalla completa.
- PWA básica instalable desde el navegador.

## Publicar en GitHub Pages

1. Crea un repositorio en GitHub.
2. Sube todos los archivos de este ZIP a la raíz del repositorio.
3. Entra en **Settings → Pages**.
4. En **Build and deployment**, selecciona:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
5. Guarda los cambios.

GitHub generará una URL parecida a:

```text
https://tuusuario.github.io/nombre-del-repo/
```

## Evitar caché en Chrome

Si no ves los últimos cambios:

- Usa `Ctrl + Shift + R` en Windows/Linux.
- Usa `Cmd + Shift + R` en Mac.
- O abre DevTools → Application → Service Workers → Unregister.
- Luego Application → Storage → Clear site data.

El HTML ya usa versiones en `style.css?v=compact-1` y `script.js?v=compact-1` para ayudar a evitar caché vieja.
