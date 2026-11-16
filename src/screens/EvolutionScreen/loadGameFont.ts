/** Load the bundled game font before Konva redraws its canvas text. */
export function loadGameFont(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  return document.fonts.load('24px "VT323"').then(() => undefined, () => undefined);
}
