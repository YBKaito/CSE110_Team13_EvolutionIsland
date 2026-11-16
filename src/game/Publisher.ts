/** A small publisher for the simulation's Observer subscriptions. */
export class Publisher<T> {
  private readonly observers = new Set<(value: T) => void>();

  subscribe(observer: (value: T) => void): () => void {
    this.observers.add(observer);
    return () => { this.observers.delete(observer); };
  }

  publish(value: T): void {
    // Copy the list so subscribing during a notification won't receive that same update.
    for (const observer of [...this.observers]) {
      if (this.observers.has(observer)) observer(value);
    }
  }

  clear(): void {
    this.observers.clear();
  }
}
