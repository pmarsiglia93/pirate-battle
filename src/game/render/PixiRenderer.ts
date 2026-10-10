import {
  Application,
  Container,
  Graphics,
  Sprite,
  Texture,
  TilingSprite,
  type Shader,
} from 'pixi.js';
import { gameConfig } from '../config/gameConfig';
import type { GameState, Ship } from '../core/types';
import { landTiles, islands } from '../world/arena';
import { texture, cachedTextureCount, releaseGpuHandles } from './assets';
import { SpritePool } from './spritePool';
interface ShipView {
  lastHp: number;
  root: Container;
  sprite: Sprite;
  bar: Graphics;
  fire: Sprite;
}
const activeRenderers = new Set<PixiRenderer>();
export function resourceSnapshot() {
  return {
    applications: activeRenderers.size,
    displayObjects: [...activeRenderers].reduce(
      (sum, renderer) => sum + renderer.stats().displayObjects,
      0,
    ),
    cachedTextures: cachedTextureCount(),
    // Pixi's built-in textures outlive every application, so listeners left on
    // them are the observable trace of renderer objects that were not released.
    sharedTextureListeners:
      Texture.WHITE.source.listenerCount('change') +
      Texture.EMPTY.source.listenerCount('change'),
  };
}
export class PixiRenderer {
  readonly app = new Application();
  private scene = new Container();
  private ships = new Map<number, ShipView>();
  private bullets = new SpritePool(this.scene);
  private effects = new SpritePool(this.scene);
  private initialized = false;
  private disposed = false;
  private resizeObserver: ResizeObserver | null = null;
  constructor(private playerShip = 2) {}
  async init(host: HTMLElement): Promise<void> {
    await this.app.init({
      width: host.clientWidth,
      height:
        (host.clientWidth * gameConfig.world.height) / gameConfig.world.width,
      resolution: Math.min(devicePixelRatio, 2),
      autoDensity: true,
      background: '#278da3',
      antialias: false,
      preference: 'webgl',
    });
    this.initialized = true;
    if (this.disposed) {
      this.destroy();
      return;
    }
    activeRenderers.add(this);
    host.appendChild(this.app.canvas);
    this.app.canvas.setAttribute('aria-label', 'Pirate Battle arena');
    this.app.stage.addChild(this.scene);
    const { tile, width, height } = gameConfig.world;
    const waterTexture = texture('tiles/tile_73');
    const water = new TilingSprite({ texture: waterTexture, width, height });
    water.tileScale.set(tile / waterTexture.width);
    this.scene.addChild(water);
    for (const tileInfo of landTiles) {
      const s = new Sprite(texture(`tiles/tile_${tileInfo.sprite}`));
      s.position.set(tileInfo.x, tileInfo.y);
      s.width = tile;
      s.height = tile;
      this.scene.addChild(s);
    }
    for (const island of islands)
      for (const [dx, dy, name] of [
        [1.5, 1.2, 71],
        [3, 2, 49],
      ] as const) {
        const s = new Sprite(texture(`tiles/tile_${name}`));
        s.position.set((island.x + dx) * tile, (island.y + dy) * tile);
        s.width = tile;
        s.height = tile;
        this.scene.addChild(s);
      }
    const resize = () => {
      if (!this.initialized || this.disposed) return;
      const width = host.clientWidth;
      this.app.renderer.resize(
        width,
        (width * gameConfig.world.height) / gameConfig.world.width,
      );
      this.scene.scale.set(width / gameConfig.world.width);
      this.app.render();
    };
    resize();
    this.resizeObserver = new ResizeObserver(resize);
    this.resizeObserver.observe(host);
  }
  render(state: GameState): void {
    if (!this.initialized || this.disposed) return;
    const living = [state.player, ...state.enemies].filter(
        (ship) => ship.hp > 0,
      ),
      ids = new Set(living.map((ship) => ship.id));
    for (const [id, view] of this.ships)
      if (!ids.has(id)) {
        view.root.destroy({ children: true, context: true });
        this.ships.delete(id);
      }
    for (const ship of living) this.drawShip(ship, state.elapsed);
    const bulletMap = new Map(state.projectiles.map((b) => [b.id, b]));
    this.bullets.sync(state.projectiles, (s, id) => {
      const b = bulletMap.get(id)!;
      s.texture = texture('ship_parts/cannon_ball');
      s.position.set(b.x, b.y);
      s.width = 12;
      s.height = 12;
      s.tint = b.owner === 'player' ? 0xffffff : 0xffba88;
      s.alpha = 1;
    });
    const effectsMap = new Map(state.effects.map((e) => [e.id, e]));
    this.effects.sync(state.effects, (s, id) => {
      const e = effectsMap.get(id)!,
        progress = 1 - e.life / e.maxLife;
      s.texture = texture(
        e.kind === 'wreck'
          ? // The simulation tags the player's wreck as 20; the hull colour is a
            // cosmetic choice it does not know about.
            `ships/ship_${e.sprite === 20 ? this.playerShip + 18 : e.sprite}`
          : e.kind === 'hit' || e.kind === 'damage'
            ? 'ship_parts/wood_1'
            : `effects/explosion_${Math.min(3, 1 + Math.floor(progress * 3))}`,
      );
      s.position.set(e.x, e.y);
      s.width = s.height =
        e.kind === 'explosion'
          ? 65 + progress * 60
          : e.kind === 'splash'
            ? 20 + progress * 40
            : 30;
      s.alpha = 1 - progress;
      s.tint = e.kind === 'splash' ? 0x8adce8 : 0xffffff;
      s.rotation = e.kind === 'hit' ? progress * 5 : 0;
      if (e.kind === 'wreck') {
        s.width = 55;
        s.height = 96;
        s.rotation = (e.angle ?? 0) + Math.PI / 2;
      }
    });
    const shake = state.effects.some((e) => e.kind === 'damage')
      ? Math.sin(state.elapsed * 80) * gameConfig.effects.shake
      : 0;
    this.scene.position.set(shake, 0);
  }
  private drawShip(ship: Ship, time: number): void {
    let view = this.ships.get(ship.id);
    if (!view) {
      const root = this.scene.addChild(new Container()),
        sprite = root.addChild(new Sprite()),
        bar = root.addChild(new Graphics()),
        fire = root.addChild(new Sprite(texture('effects/fire_1')));
      sprite.anchor.set(0.5);
      fire.anchor.set(0.5);
      view = { root, sprite, bar, fire, lastHp: -1 };
      this.ships.set(ship.id, view);
    }
    const base =
        ship.kind === 'player'
          ? this.playerShip
          : ship.kind === 'chaser'
            ? 3
            : 5,
      stage =
        ship.hp / ship.maxHp > 0.66 ? 0 : ship.hp / ship.maxHp > 0.33 ? 6 : 12;
    view.sprite.texture = texture(`ships/ship_${base + stage}`);
    view.sprite.width = 55;
    view.sprite.height = 96;
    view.sprite.rotation = ship.angle + Math.PI / 2;
    view.root.position.set(ship.x, ship.y);
    if (view.lastHp !== ship.hp) {
      view.lastHp = ship.hp;
      view.bar
        .clear()
        .roundRect(-28, -65, 56, 7, 3)
        .fill(0x152e37)
        .roundRect(-26, -63, (52 * ship.hp) / ship.maxHp, 3, 1)
        .fill(ship.kind === 'player' ? 0x79e49a : 0xf46b4e);
    }
    view.fire.visible = ship.hp / ship.maxHp <= 0.33;
    view.fire.texture = texture(
      `effects/fire_${(Math.floor(time * 8) % 2) + 1}`,
    );
    view.fire.width = 24;
    view.fire.height = 34;
  }
  stats(): { displayObjects: number; pooledSprites: number } {
    const count = (c: Container): number =>
      1 + c.children.reduce((sum, child) => sum + count(child), 0);
    return {
      displayObjects:
        this.initialized && !this.disposed ? count(this.app.stage) : 0,
      pooledSprites: this.disposed ? 0 : this.bullets.size + this.effects.size,
    };
  }
  destroy(): void {
    this.disposed = true;
    activeRenderers.delete(this);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (!this.initialized) return;
    this.initialized = false;
    // Pixi 8.22's GlBackBufferSystem.destroy() does not destroy its blit shader,
    // whose BindGroup stays subscribed to the global Texture.WHITE source: one
    // retained BindGroup and listener per Application. Shader.destroy() is
    // idempotent, so this stays harmless once the library releases it itself.
    const backBuffer = (
      this.app.renderer as unknown as {
        backBuffer?: { _bigTriangleShader?: Shader | null };
      }
    ).backBuffer;
    const blitShader = backBuffer?._bigTriangleShader;
    this.app.destroy(
      { removeView: true },
      { children: true, context: true, texture: false, textureSource: false },
    );
    blitShader?.destroy();
    this.ships.clear();
    this.bullets.clear();
    this.effects.clear();
    if (activeRenderers.size === 0) releaseGpuHandles();
  }
}
