/** Load the bundled game font before Konva redraws its canvas text. */
export function loadGameFont(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  return document.fonts.load('24px "Jersey 10"').then(() => undefined, () => undefined);
}
