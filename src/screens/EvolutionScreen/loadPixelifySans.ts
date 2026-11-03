/** Load Pixelify Sans without bundling or distributing font files.
 * Konva paints text on canvas, so loading the CSS alone is not enough:
 * we redraw the layer when document.fonts reports the font is ready.
 * Offline / blocked Google Fonts falls back to monospace.
 */
let fontPromise: Promise<void> | null = null;

export function loadPixelifySans(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  if (fontPromise) return fontPromise;

  fontPromise = new Promise<void>(resolve => {
    const id = 'us5-pixelify-font';
    let link = document.getElementById(id) as HTMLLinkElement | null;
    const finish = () => {
      document.fonts.load('24px "Pixelify Sans"')
        .then(() => resolve())
        .catch(() => resolve());
    };

    if (link) {
      // Link might still be loading; recheck via document.fonts.ready.
      void document.fonts.ready.then(finish, finish);
      return;
    }

    link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400;500;600;700&display=swap';
    link.onload = finish;
    link.onerror = () => resolve();
    document.head.appendChild(link);
  });
  return fontPromise;
}
