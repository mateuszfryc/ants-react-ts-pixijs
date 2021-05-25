import { ParticleContainer, Sprite, Texture } from 'pixi.js';

import PheromoneImage from 'assets/pheromone.png';
import { doNTimes } from 'utils/do-n-times';
import { Timer } from './Timer';
import { TAGS } from './collisions/collisions';
import { CirclesBVHMinimalCollisions } from './circlesBVHMinimalCollisions';
import { SimulationSettings } from './types';

export class Pheromones extends CirclesBVHMinimalCollisions {
  /** List of IDs of the pheromones that are currenlty in the use. */
  activePheromones: number[] = [];
  pheromonesSpritesMap: Sprite[] = [];
  sensor: number[] = [0];
  sprites = ParticleContainer;
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

  constructor(settings: SimulationSettings, outOfWorldBoundsDistance: number, defaultRadius = 1.4) {
    super(
      settings.antsCount *
        Math.round(1 / settings.timeBetweenPheromonesEmissions) *
        settings.pheromonesLifeSpan,
      defaultRadius * settings.antsScale,
    );

    this.pheromonesMaxLifeSpan = settings.pheromonesLifeSpan;
    this.sensorRadius = this.radius * 3;
    this.pheromoneEmissionTimer = new Timer(settings.timeBetweenPheromonesEmissions);

    this.initialiseBodies(outOfWorldBoundsDistance);
    this.initialiseSprites();
    this.sensor[this.tagIndex] = TAGS.ANT_SENSOR;

    this.onConstructionLog();
  }

  private onConstructionLog(): void {
    // // eslint-disable-next-line no-console
    // console.log(`time between emissions: ${timeBetweenEmissions}`);
    // // eslint-disable-next-line no-console
    // console.log(
    //   `pheromones body count: ${
    //     settings.antsCount * Math.round(1 / timeBetweenEmissions) * settings.pheromonesLifeSpan
    //   }`,
    // );
  }

  private initialiseSprites(): void {
    const initLabel = 'Pheromones sprites build time';
    // eslint-disable-next-line no-console
    console.time(initLabel);
    const pheromonesSprites = new ParticleContainer(this.bodiesMaxCount, {
      alpha: true,
      position: true,
      scale: true,
      tint: true,

      rotation: false,
      uvs: false,
      vertices: false,
    });
    pheromonesSprites.zIndex = 1;
    this.sprites = (pheromonesSprites as unknown) as typeof ParticleContainer;

    const pheromoneImageTexture = Texture.from(PheromoneImage);
    /** Create all the sprites in advance. */
    doNTimes((index: number): void => {
      const pheromoneSprite = Sprite.from(pheromoneImageTexture);
      pheromoneSprite.x = -10;
      pheromoneSprite.y = -10;
      pheromoneSprite.anchor.set(0.5);
      pheromoneSprite.scale.set(0.09 * this.radius);
      this.pheromonesSpritesMap[index] = pheromoneSprite;
      pheromonesSprites.addChild(pheromoneSprite);
    }, this.bodiesMaxCount);
    // eslint-disable-next-line no-console
    console.timeEnd(initLabel);
  }

  public placePheromone(x: number, y: number, hasFood: boolean, initialIntensity: number): void {
    const { PHEROMONE_FOOD, PHEROMONE_NEST } = TAGS;
    let { lastPheromonePickedIndex } = this;
    const pheromone = this.bodies[lastPheromonePickedIndex];
    const [id] = pheromone;
    this.longitudes[id] = x;
    this.latitudes[id] = y;
    pheromone[this.tagIndex] = hasFood ? PHEROMONE_FOOD : PHEROMONE_NEST;
    pheromone[this.intensityIndex] = initialIntensity * this.pheromonesMaxLifeSpan;
    this.activePheromones.push(id);
    this.remove(id);
    this.insert(id);

    const pheromoneSprite = this.pheromonesSpritesMap[id];
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
          sprite.x = -10;
          sprite.y = -10;
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
    const { sensorRadius, longitudes, latitudes } = this;
    const { AABB_leftIndex, AABB_topIndex, AABB_rightIndex, AABB_bottomIndex } = this.brachIndexes;
    const { PHEROMONE_FOOD, PHEROMONE_NEST } = TAGS;

    let tag = hasFood ? PHEROMONE_NEST : PHEROMONE_FOOD;
    longitudes[0] = x + directionX * sensorRadius;
    latitudes[0] = y + directionY * sensorRadius;

    const xS = longitudes[0];
    const yS = latitudes[0];
    const branch = this.branches[0];

    if (
      xS - sensorRadius < branch[AABB_leftIndex] ||
      yS - sensorRadius < branch[AABB_topIndex] ||
      xS + sensorRadius > branch[AABB_rightIndex] ||
      yS + sensorRadius > branch[AABB_bottomIndex]
    ) {
      this.remove();
      this.insert();
    }

    let intensity = 0;
    let directionTargetX = 0;
    let directionTargetY = 0;

    for (const other of this.getPotentials()) {
      const otherId = other[0];
      const otherIntensity = other[this.intensityIndex];
      if (
        otherIntensity > intensity &&
        other[this.tagIndex] === tag &&
        this.areCirclesOverlapping(0, otherId, sensorRadius)
      ) {
        intensity = otherIntensity;
        directionTargetX = longitudes[otherId] - x;
        directionTargetY = latitudes[otherId] - y;
      }
    }

    return [directionTargetX, directionTargetY];
  }
}
