import { Container, Sprite, Texture } from 'pixi.js';
export class SpritePool {
  private free: Sprite[] = [];
  private used = new Map<number, Sprite>();
  constructor(private parent: Container) {}
  sync(
    items: { id: number }[],
    draw: (sprite: Sprite, id: number) => void,
  ): void {
    const live = new Set(items.map((item) => item.id));
    for (const [id, sprite] of this.used)
      if (!live.has(id)) {
        sprite.visible = false;
        this.used.delete(id);
        this.free.push(sprite);
      }
    for (const item of items) {
      let sprite = this.used.get(item.id);
      if (!sprite) {
        sprite =
          this.free.pop() ?? this.parent.addChild(new Sprite(Texture.EMPTY));
        sprite.anchor.set(0.5);
        sprite.visible = true;
        this.used.set(item.id, sprite);
      }
      draw(sprite, item.id);
    }
  }
  clear(): void {
    this.used.clear();
    this.free = [];
  }
  get size(): number {
    return this.free.length + this.used.size;
  }
}
