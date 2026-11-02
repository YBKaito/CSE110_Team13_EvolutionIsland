export class Publisher<T> {
  private readonly observers = new Set<(event: T) => void>();

  subscribe(observer: (event: T) => void): () => void {
    this.observers.add(observer);
    return () => { this.observers.delete(observer); };
  }

  protected publish(event: T): void {
    // Snapshot listeners: safe to unsubscribe during publication.
    for (const observer of [...this.observers]) {
      if (this.observers.has(observer)) observer(event);
    }
  }

  get observerCount(): number { return this.observers.size; }
}
