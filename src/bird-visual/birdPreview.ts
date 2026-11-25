// Used to render the bird in the Species Creation starting screen

import { renderBird } from './birdImage';
import type { BirdLook } from './birdLook';

export class BirdPreview {
  private readonly canvas = document.createElement('canvas');
  private latest = 0; // lets a slow image load be ignored if a newer look arrived

  constructor(container: HTMLElement) {
    this.canvas.className = 'bird-preview';
    this.canvas.hidden = true;
    container.appendChild(this.canvas);
  }

  async show(look: BirdLook): Promise<void> {
    const mine = ++this.latest;
    const bird = await renderBird(look);
    if (mine !== this.latest || !bird) return;
    this.canvas.width = bird.width;
    this.canvas.height = bird.height;
    this.canvas.getContext('2d')!.drawImage(bird, 0, 0);
    this.canvas.hidden = false;
  }

  hide(): void {
    this.latest++;
    this.canvas.hidden = true;
  }
}
