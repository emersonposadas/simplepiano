# Pocket Piano

Piano web 100% estático para GitHub Pages, diseñado para sentirse como una app móvil.

## Características

- HTML, CSS y JavaScript puro.
- Sin Python, sin servidor y sin dependencias externas.
- Sonido tipo piano acústico sintetizado con Web Audio API.
- Varias octavas visibles automáticamente según pantalla.
- Responsive en vertical y horizontal.
- Multitáctil para móviles.
- Teclas con animación, iluminación y vibración.
- PWA instalable desde el navegador.
- Funciona en GitHub Pages.

## Publicar en GitHub Pages

1. Crea un repositorio nuevo en GitHub.
2. Sube todos los archivos de este ZIP en la raíz del repositorio.
3. Entra a `Settings > Pages`.
4. En `Build and deployment`, elige `Deploy from a branch`.
5. Selecciona `main` y `/root`.
6. Abre la URL publicada por GitHub Pages.

## Uso

- En móvil: toca las teclas directamente. Gira el teléfono a horizontal para ver más octavas.
- En escritorio: usa clic/touch o el teclado físico desde `A W S E D F T G Y H U J...`.
- Activa `Sustain` para notas con cola más larga.

## Nota sobre el sonido

Esta versión no usa archivos MP3/WAV externos. El sonido de piano se genera con síntesis: armónicos, ruido de martillo, envolvente de ataque/decay, filtro dinámico y reverb corta. Esto mantiene el proyecto ligero y compatible con GitHub Pages.

Para un piano acústico todavía más realista, se pueden agregar muestras `.mp3` o `.wav` por nota, pero el ZIP sería más pesado.
