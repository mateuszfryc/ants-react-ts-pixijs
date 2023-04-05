import * as PIXI from 'pixi.js';

import PheromoneImage from 'assets/pheromone.png';
import { doNTimes } from 'shared/do-n-times';
import { areCirclesOverlapping } from '../shared/math';
import { BVHCircles } from './BVHCircles';
import { Timer } from './Timer';
import { TAGS } from './collisions/collisions';
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

  public placePheromone(
    x: number,
    y: number,
    hasFood: boolean,
    initialIntensity: number,
    _hasScentOfFood = false,
  ): void {
    const { PHEROMONE_FOOD, PHEROMONE_NEST } = TAGS;
    let { lastPheromonePickedIndex, tagIndex, intensityIndex, idIndex, radius, sensorRadius } =
      this;
    const pheromone = this.bodies[lastPheromonePickedIndex];
    const [id] = pheromone;
    const pheromoneType = hasFood ? PHEROMONE_FOOD : PHEROMONE_NEST;
    pheromone[tagIndex] = pheromoneType;
    pheromone[intensityIndex] = initialIntensity * this.pheromonesMaxLifeSpan;
    this.activePheromones.push(id);
    this.remove(id);
    this.insert(id, x, y);

    // this should optimise the number of pheromones test when there is a "highway" created
    const pheromoneIntensityReductionRate = 0.85;
    if (hasFood || _hasScentOfFood) {
      const potentials = this.getPotentials(id).filter(
        (other) =>
          other[tagIndex] === pheromoneType &&
          this.areCirclesOverlapping(id, other[idIndex], radius * 3),
      );
      potentials.forEach((body) => {
        // by reducing the lifespan of overlapping pheromones we reduce the number of pheromones in one spot
        body[intensityIndex] *= pheromoneIntensityReductionRate;
      });
    }

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
    const {
      longitudes,
      latitudes,
      pheromonesSpritesMap,
      radius,
      intensityIndex,
      pheromonesMaxLifeSpan,
    } = this;
    const toBeRemoved: number[] = [];
    this.activePheromones.forEach((id: number): void => {
      const pheromone = this.bodies[id];
      pheromone[intensityIndex] -= deltaSeconds;
      const sprite = pheromonesSpritesMap[id];
      if (pheromone[intensityIndex] > 0) {
        sprite.alpha = pheromone[intensityIndex] / pheromonesMaxLifeSpan;
      } else {
        const x = id * -radius;
        const y = id * -radius;
        longitudes[id] = x;
        latitudes[id] = y;
        this.remove(id);
        this.insert(id, x, y);
        if (sprite) {
          sprite.renderable = false;
        }
        toBeRemoved.push(id);
        // this.remove(id);
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
  ): [number, number, number] {
    const { sensorRadius, intensityIndex, tagIndex, longitudes, latitudes, radius } = this;
    const { PHEROMONE_FOOD, PHEROMONE_NEST } = TAGS;
    let tag = hasFood ? PHEROMONE_NEST : PHEROMONE_FOOD;

    this.remove();
    this.insert(
      0,
      x + directionX * sensorRadius * 1.2,
      y + directionY * sensorRadius * 1.2,
      sensorRadius,
    );

    let intensity = 0;
    let directionTargetX = 0;
    let directionTargetY = 0;
    let hasScentOfFood = 0;

    const potentials = this.getPotentials().filter(([otherId, typeTag]) => {
      return (
        typeTag === tag &&
        // exclude the pheromone in which the ant currently is
        // to make sure ant isn't reacting to "current" pheromone - the one she is standing on
        !areCirclesOverlapping(x, y, 1, longitudes[otherId], latitudes[otherId], radius) &&
        this.areCirclesOverlapping(0, otherId, sensorRadius)
      );
    });

    for (const other of potentials) {
      const otherId = other[0];
      const otherIntensity = other[intensityIndex];
      if (otherIntensity > intensity) {
        intensity = otherIntensity;
        directionTargetX = longitudes[otherId] - x;
        directionTargetY = latitudes[otherId] - y;
        hasScentOfFood = other[tagIndex] === PHEROMONE_FOOD ? 1 : 0;
      }
    }

    return [directionTargetX, directionTargetY, hasScentOfFood];
  }

  draw(context: PIXI.Graphics): void {
    this.drawShapes(context);
  }
}
