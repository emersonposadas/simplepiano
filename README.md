# Piano Web Móvil

Piano básico hecho con **HTML, CSS y JavaScript puro**, listo para publicarse gratis en **GitHub Pages**. Funciona en escritorio, tablet y móvil, tanto en vertical como en landscape.

## Características

- Varias octavas configurables: de 2 a 7 octavas.
- Sonido generado con Web Audio API, sin backend.
- Soporte táctil y multitáctil para móviles.
- Soporte de teclado físico en computador.
- Teclas blancas y negras con animación al presionar.
- Cambio visual de color, brillo y efecto de tecla hundida.
- Vibración breve en móviles compatibles.
- Diseño responsive para orientación vertical y horizontal.
- Botón de pantalla completa.
- Manifest PWA y service worker básico para instalación/cache.
- Preparado para GitHub Pages.

## Archivos

```txt
piano-web/
├── index.html
├── style.css
├── script.js
├── manifest.webmanifest
├── sw.js
└── README.md
```

## Cómo usarlo localmente

Abre `index.html` directamente en el navegador.

Para probar la PWA y el service worker, es mejor servirlo con un servidor local:

```bash
python3 -m http.server 8000
```

Luego abre:

```txt
http://localhost:8000
```

## Publicar en GitHub Pages

1. Crea un repositorio en GitHub.
2. Sube estos archivos a la raíz del repositorio.
3. Entra en **Settings → Pages**.
4. En **Build and deployment**, selecciona:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
5. Guarda los cambios.

Tu piano quedará disponible en una URL como:

```txt
https://tuusuario.github.io/nombre-del-repo/
```

## Uso en móvil

- Toca las teclas con uno o varios dedos.
- Gira el teléfono a landscape para tener teclas más altas.
- Usa el botón **Pantalla completa** para una experiencia más parecida a una app.
- Desde el navegador puedes usar **Añadir a pantalla de inicio** para instalarlo como PWA.

## Personalización rápida

En `script.js` puedes cambiar la cantidad inicial de octavas modificando el valor seleccionado en el HTML:

```html
<select id="octaveCount">
  <option value="3" selected>3</option>
</select>
```

En `style.css` puedes cambiar los colores de las teclas presionadas:

```css
:root {
  --pressed-white-a: #e0f2fe;
  --pressed-white-b: #38bdf8;
  --pressed-black-a: #7dd3fc;
  --pressed-black-b: #2563eb;
}
```

## Notas técnicas

El piano usa osciladores de Web Audio API. Esto mantiene el proyecto simple y liviano. Si quieres un sonido más realista, puedes reemplazar los osciladores por muestras `.mp3` o `.wav` de piano.
