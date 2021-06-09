import * as PIXI from 'pixi.js';

import PheromoneImage from 'assets/pheromone.png';
import { doNTimes } from 'shared/do-n-times';
import { Timer } from './Timer';
import { TAGS } from './collisions/collisions';
import { BVHCircles } from './BVHCircles';
import { SimulationSettings } from './types';

export class Pheromones extends BVHCircles {
  /** List of IDs of the pheromones that are currenlty in the use. */
  activePheromones: number[] = [];
  pheromonesSpritesMap: PIXI.Sprite[] = [];
  sensor: number[] = [0];
  sprites = PIXI.ParticleContainer;
  lastPheromonePickedIndex = 1;
  readonly pheromonesMaxLifeSpan: number;
  readonly pheromoneEmissionTimer: Timer;
  readonly sensorRadius: number;
  /**
   * This additional property of the minimal collisions items
   * is added on top of other circles properties.
   */
  readonly tagIndex = 1;
  readonly intensityIndex = 2;

  constructor(settings: SimulationSettings, defaultRadius = 1.4) {
    // prettier-ignore
    super(
      settings.antsCount *
      Math.round(1 / settings.timeBetweenPheromonesEmissions) *
      settings.pheromonesLifeSpan,
      defaultRadius * settings.antsScale,
    );

    this.pheromonesMaxLifeSpan = settings.pheromonesLifeSpan;
    this.sensorRadius = this.radius * 3;
    this.pheromoneEmissionTimer = new Timer(settings.timeBetweenPheromonesEmissions);

    this.sensor[this.tagIndex] = TAGS.ANT_SENSOR;

    this.onConstructionLog(settings, this.initialiseSprites());
  }

  private onConstructionLog(
    { antsCount, pheromonesLifeSpan, timeBetweenPheromonesEmissions }: SimulationSettings,
    spritesBuildTime: number,
  ): void {
    // eslint-disable-next-line no-console, prettier/prettier
    console.log(`Pheromones:`);
    // eslint-disable-next-line no-console
    console.log(
      // eslint-disable-next-line prettier/prettier
      ` count: ${antsCount * Math.round(1 / timeBetweenPheromonesEmissions) * pheromonesLifeSpan}`,
    );
    // eslint-disable-next-line no-console, prettier/prettier
    console.log(` time between emissions: ${timeBetweenPheromonesEmissions.toFixed(2)} sec`);
    // eslint-disable-next-line no-console, prettier/prettier
    console.log(` sprites build time: ${(spritesBuildTime / 1000).toFixed(3)} sec`);
  }

  private initialiseSprites(): number {
    const startTime = performance.now();
    const initLabel = 'Pheromones sprites build time';
    // eslint-disable-next-line no-console
    console.time(initLabel);
    const pheromonesSprites = new PIXI.ParticleContainer(this.bodiesMaxCount, {
      alpha: true,
      position: true,
      scale: true,
      tint: true,

      rotation: false,
      uvs: false,
      vertices: false,
    });
    pheromonesSprites.zIndex = 1;
    this.sprites = pheromonesSprites as unknown as typeof PIXI.ParticleContainer;

    const pheromoneImageTexture = PIXI.Texture.from(PheromoneImage);
    /** Create all the sprites in advance. */
    doNTimes((index: number): void => {
      const pheromoneSprite = PIXI.Sprite.from(pheromoneImageTexture);
      pheromoneSprite.x = -10;
      pheromoneSprite.y = -10;
      pheromoneSprite.anchor.set(0.5);
      pheromoneSprite.scale.set(0.09 * this.radius);
      this.pheromonesSpritesMap[index] = pheromoneSprite;
      pheromonesSprites.addChild(pheromoneSprite);
    }, this.bodiesMaxCount);

    return performance.now() - startTime;
  }

  public placePheromone(x: number, y: number, hasFood: boolean, initialIntensity: number): void {
    const { PHEROMONE_FOOD, PHEROMONE_NEST } = TAGS;
    let { lastPheromonePickedIndex } = this;
    const pheromone = this.bodies[lastPheromonePickedIndex];
    const [id] = pheromone;
    pheromone[this.tagIndex] = hasFood ? PHEROMONE_FOOD : PHEROMONE_NEST;
    pheromone[this.intensityIndex] = initialIntensity * this.pheromonesMaxLifeSpan;
    this.activePheromones.push(id);
    this.remove(id);
    this.insert(id, x, y);

    const pheromoneSprite = this.pheromonesSpritesMap[id];
    pheromoneSprite.renderable = true;
    pheromoneSprite.x = x;
    pheromoneSprite.y = y;
    pheromoneSprite.alpha = initialIntensity;
    pheromoneSprite.tint = hasFood ? 0x00cc22 : 0x0088ff;

    lastPheromonePickedIndex++;
    this.lastPheromonePickedIndex =
      lastPheromonePickedIndex >= this.bodiesMaxCount ? 1 : lastPheromonePickedIndex;
  }

  public updatePheromones(deltaSeconds: number): void {
    const toBeRemoved: number[] = [];
    this.activePheromones.forEach((id: number): void => {
      const pheromone = this.bodies[id];
      pheromone[this.intensityIndex] -= deltaSeconds;
      const sprite = this.pheromonesSpritesMap[id];
      if (pheromone[this.intensityIndex] > 0) {
        sprite.alpha = pheromone[this.intensityIndex] / this.pheromonesMaxLifeSpan;
      } else {
        this.longitudes[id] = id * -this.radius;
        this.latitudes[id] = id * -this.radius;
        if (sprite) {
          sprite.renderable = false;
        }
        toBeRemoved.push(id);
      }
    });
    this.activePheromones = this.activePheromones.filter(
      (active: number) => !toBeRemoved.includes(active),
    );
  }

  /**
   * Set sensors position and direction to match
   * selected ant's properties and perform search
   * of pheromones. Position of the sensor
   * that picks up most of pheromones
   * is the returned as ant direction.
   */
  public getDirectionFromSensor(
    x: number,
    y: number,
    directionX: number,
    directionY: number,
    hasFood: boolean,
  ): [number, number] {
    const { PHEROMONE_FOOD, PHEROMONE_NEST } = TAGS;
    let tag = hasFood ? PHEROMONE_NEST : PHEROMONE_FOOD;

    this.remove();
    this.insert(
      0,
      x + directionX * this.sensorRadius,
      y + directionY * this.sensorRadius,
      this.sensorRadius,
    );

    let intensity = 0;
    let directionTargetX = 0;
    let directionTargetY = 0;

    for (const other of this.getPotentials()) {
      const otherId = other[0];
      const otherIntensity = other[this.intensityIndex];
      if (
        otherIntensity > intensity &&
        other[this.tagIndex] === tag &&
        this.areCirclesOverlapping(0, otherId, this.sensorRadius)
      ) {
        intensity = otherIntensity;
        directionTargetX = this.longitudes[otherId] - x;
        directionTargetY = this.latitudes[otherId] - y;
      }
    }

    return [directionTargetX, directionTargetY];
  }

  draw(context: PIXI.Graphics): void {
    this.drawShapes(context);
  }
}
