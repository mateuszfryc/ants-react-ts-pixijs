import * as PIXI from 'pixi.js';
import { Metrics } from 'simulation/Metrics';
import { SimulationSettings, Size } from 'simulation/types';
import { TheAntColony } from './AntsColony';
import { Collisions } from './collisions/collisions';
import { DebugDraw } from './DebugDraw';
import { Food } from './Food';
import { Pheromones } from './Pheromones';

export class Simulation {
  collisions = new Collisions();
  graphics: PIXI.Application;
  settings: SimulationSettings;
  antsColony: TheAntColony;
  pheromones: Pheromones;
  food: Food;
  debugDraw: DebugDraw;
  metrics: Metrics;
  world: Size;
  animationID: number | undefined;
  lastTime = 0;
  simulationSpeed = 1;

  constructor(
    container: HTMLElement,
    settings: SimulationSettings,
    metrics: Metrics,
    debugDraw: DebugDraw,
  ) {
    const width = container.offsetWidth;
    const height = container.offsetHeight;
    // const width = 500;
    // const height = 500;
    this.world = { width, height };
    this.graphics = this.setupGraphics(container);
    this.antsColony = new TheAntColony(settings, this.collisions);
    this.pheromones = new Pheromones(settings);
    this.food = new Food(this.collisions);
    this.debugDraw = debugDraw;
    this.settings = settings;
    this.metrics = metrics;

    debugDraw.registerDrawable(this.collisions, 'Ants Collisions');
    debugDraw.registerDrawable(this.collisions.bvh, 'Bounding Volume Hierarchy', 0x666666);
    debugDraw.registerDrawable(this.pheromones, 'Pheromones collisions', 0x2299ff);
    // debugDraw.switchByDrawableLabel('Pheromones collisions');

    this.run();
  }

  private setupGraphics(container: HTMLElement): PIXI.Application {
    /** Disable interpolation when scaling, will make texture be pixelated */
    PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
    PIXI.settings.PRECISION_FRAGMENT = PIXI.PRECISION.LOW;
    PIXI.settings.GC_MAX_IDLE = 1600;
    const graphics = new PIXI.Application({
      backgroundColor: 0x000000, // 0xc5bb8e
    });
    graphics.resizeTo = container;
    graphics.stage.sortableChildren = true;
    graphics.stop();
    container.append(graphics.view);

    return graphics;
  }

  private async run(): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(`Ants count: ${this.antsColony.antsCount}`);
    let time = Date.now();

    const initResult = await this.pheromones.initialiseBodies();
    time = Date.now() - time;
    // eslint-disable-next-line no-console
    console.log(`Pheromones bodies build time: ${(time / 1000).toFixed(2)} sec`);

    const { collisions, world } = this;

    this.antsColony.releaseOneByOne();
    // this.antsColony.throwAllAtOnce(worldWidth, worldHeight);

    this.food.spawnFoodInArea({
      location: [world.width - 100, world.height - 100],
      count: 500,
      radius: 50,
    });

    // this.food.spawnFoodInCircle({
    //   location: [150, 150],
    //   count: 500,
    //   radius: 120,
    // });

    this.food.spawnFoodInArea({
      location: [world.width - 100, 250],
      count: 500,
      radius: 50,
    });

    collisions.insert(this.antsColony.nest.body, this.antsColony.nest.areaIsVisibleIn);
    collisions.createWorldBounds(world.width, world.height, 200, -199);

    this.graphics.stage.addChild(
      this.antsColony.nest,
      this.antsColony.nest.entranceCoverSprite,
      this.antsColony.antsSprites,
      this.pheromones.sprites as unknown as PIXI.DisplayObject,
      this.food.spritesParticles,
      this.debugDraw,
    );

    // let isTabFocused = true;
    // window.addEventListener('blur', () => {
    //   isTabFocused = false;
    // });
    // window.addEventListener('focus', () => {
    //   lastTime = performance.now();
    //   isTabFocused = true;
    // });

    this.graphics.start();
    this.lastTime = performance.now();
    this.update();
  }

  update(): void {
    // if (!isTabFocused) return;
    const frameStartTime = performance.now();
    // const deltaSeconds = 0.016 * 1;
    const deltaSeconds =
      Math.min((frameStartTime - this.lastTime) / 1000, 0.5) * this.simulationSpeed;
    const antsOnScreenCount = this.antsColony.update(
      deltaSeconds,
      this.pheromones,
      this.food,
      this.world.width,
      this.world.height,
    );
    this.pheromones.updatePheromones(deltaSeconds);
    if (this.metrics.timer.update(deltaSeconds)) {
      const { size } = this.antsColony.antsCollisionShapes;
      this.metrics.update(
        deltaSeconds,
        size,
        size - antsOnScreenCount,
        this.pheromones.activePheromones.length,
      );
    }
    this.debugDraw.draw();
    this.lastTime = frameStartTime;

    this.animationID = requestAnimationFrame(this.update.bind(this));
  }

  public prepeareToBeRemoved(): void {
    if (this.animationID) cancelAnimationFrame(this.animationID);
    this.debugDraw.clearReferences();
    this.graphics.ticker.stop();
    this.graphics.destroy(true, { children: true, texture: false, baseTexture: false });
  }
}
