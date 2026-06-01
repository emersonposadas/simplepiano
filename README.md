# Pocket Piano para GitHub Pages

Piano web responsive con apariencia de aplicación móvil. Es 100% estático: no usa Python, backend, base de datos ni dependencias externas.

## Características

- HTML, CSS y JavaScript puro.
- Publicable directamente en GitHub Pages.
- Diseño tipo app móvil, no tipo página clásica.
- Soporte vertical y horizontal.
- Multitáctil para tocar varias notas a la vez.
- Varias octavas configurables, de 2 a 7.
- Cambio visual al presionar cada tecla.
- Vibración breve en móviles compatibles.
- Control de volumen.
- Sonidos generados con Web Audio API.
- PWA básica instalable desde el navegador.
- Caché offline mediante Service Worker.

## Archivos

```text
.
├── index.html
├── style.css
├── script.js
├── manifest.webmanifest
├── sw.js
├── icon.svg
└── README.md
```

## Cómo publicarlo en GitHub Pages

1. Crea un repositorio en GitHub.
2. Sube todos los archivos de este proyecto en la raíz del repositorio.
3. Entra a **Settings > Pages**.
4. En **Build and deployment**, selecciona:
   - Source: **Deploy from a branch**
   - Branch: **main**
   - Folder: **/root**
5. Guarda los cambios.
6. GitHub generará una URL similar a:

```text
https://tu-usuario.github.io/nombre-del-repo/
```

## Uso móvil

En Android o iPhone, abre la URL en el navegador y usa la opción **Añadir a pantalla de inicio**. Al abrirse desde el icono instalado, se verá más como una aplicación que como una página web.

## Personalización rápida

En `script.js` puedes cambiar la octava inicial modificando:

```js
let startOctave = 3;
```

En `style.css` puedes cambiar el color principal modificando:

```css
--accent: #6ee7ff;
--accent-hot: #a78bfa;
```
