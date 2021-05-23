import { ParticleContainer, Sprite, Texture } from 'pixi.js';

import PheromoneImage from 'assets/pheromone.png';
import { doNTimes } from 'utils/do-n-times';
import { Timer } from './Timer';
import { TAGS } from './collisions/collisions';
import { CirclesBVHMinimalCollisions } from './circlesBVHMinimalCollisions';

export class Pheromones extends CirclesBVHMinimalCollisions {
  /** List of IDs of the pheromones that are currenlty in the use. */
  activePheromones: number[] = [];
  pheromonesSpritesMap: Sprite[] = [];
  sensor: number[] = [];
  sprites = ParticleContainer;
  lastPheromonePickedIndex = 3;
  readonly pheromonesMaxLifeSpan: number;
  readonly pheromoneEmissionTimer: Timer;
  readonly sensorRadius: number;
  /**
   * This additional property of the minimal collisions items
   * is added on top of other circles properties.
   */
  readonly tagIndex = 3;
  readonly intensityIndex = 4;

  constructor(
    antsCount: number,
    antsScale: number,
    /**
     * Distance that is used to place unused
     * pheromones out of world bounds.
     * World width or height (whichever is higher)
     */
    outOfBoundsDistance: number,
    pheromonesMaxLifeSpan: number,
    defaultRadius = 1.2,
    /** Time between consequent emmisions in seconds */
    timeBetweenEmissions = 0.15,
  ) {
    super(
      antsCount * Math.round(1 / timeBetweenEmissions) * pheromonesMaxLifeSpan,
      defaultRadius * antsScale,
    );

    this.pheromonesMaxLifeSpan = pheromonesMaxLifeSpan;
    this.sensorRadius = this.radius * 4;
    this.pheromoneEmissionTimer = new Timer(timeBetweenEmissions);

    this.initialiseBodies(outOfBoundsDistance);
    this.initialiseSprites();
    this.initialiseSensor();

    // eslint-disable-next-line no-console
    console.log(`time between emissions: ${timeBetweenEmissions}`);
    // eslint-disable-next-line no-console
    console.log(
      `pheromones body count: ${
        antsCount * Math.round(1 / timeBetweenEmissions) * pheromonesMaxLifeSpan
      }`,
    );
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

  private initialiseSensor(): void {
    const { ANT_SENSOR } = TAGS;
    const { tagIndex } = this;
    this.sensor = this.bodies[0];
    this.sensor[tagIndex] = ANT_SENSOR;
  }

  public placePheromone(x: number, y: number, hasFood: boolean, initialIntensity: number): void {
    const { PHEROMONE_FOOD, PHEROMONE_NEST } = TAGS;
    const { tagIndex, intensityIndex, pheromonesMaxLifeSpan } = this;
    let { lastPheromonePickedIndex } = this;
    const { xIndex, yIndex } = this.pheromoneBodyIndexes;
    const pheromone = this.bodies[lastPheromonePickedIndex];
    pheromone[xIndex] = x;
    pheromone[yIndex] = y;
    pheromone[intensityIndex] = initialIntensity * pheromonesMaxLifeSpan;
    pheromone[tagIndex] = hasFood ? PHEROMONE_FOOD : PHEROMONE_NEST;
    const [id] = pheromone;
    this.activePheromones.push(id);
    this.remove(pheromone);
    this.insert(pheromone);

    const pheromoneSprite = this.pheromonesSpritesMap[id];
    pheromoneSprite.x = x;
    pheromoneSprite.y = y;
    pheromoneSprite.alpha = initialIntensity;
    pheromoneSprite.tint = hasFood ? 0x00cc22 : 0x0088ff;

    lastPheromonePickedIndex++;
    this.lastPheromonePickedIndex =
      lastPheromonePickedIndex >= this.bodiesMaxCount ? 3 : lastPheromonePickedIndex;
  }

  public updatePheromones(deltaSeconds: number): void {
    const { intensityIndex, radius, pheromonesMaxLifeSpan } = this;
    const { xIndex, yIndex } = this.pheromoneBodyIndexes;
    const toBeRemoved: number[] = [];
    this.activePheromones.forEach((activeId: number): void => {
      const pheromone = this.bodies[activeId];
      pheromone[intensityIndex] -= deltaSeconds;
      const sprite = this.pheromonesSpritesMap[activeId];
      if (pheromone[intensityIndex] > 0) {
        sprite.alpha = pheromone[intensityIndex] / pheromonesMaxLifeSpan;
      } else {
        pheromone[xIndex] = activeId * -radius;
        pheromone[yIndex] = activeId * -radius;
        if (sprite) {
          sprite.x = -10;
          sprite.y = -10;
        }
        toBeRemoved.push(activeId);
      }
    });
    this.activePheromones = this.activePheromones.filter(
      (active: number) => !toBeRemoved.includes(active),
    );
  }

  public getPheromonesCount(): number {
    return this.activePheromones.length;
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
    _antsScale: number,
    hasFood: boolean,
  ): [number, number] {
    const { intensityIndex, tagIndex, sensor, sensorRadius } = this;
    const { xIndex, yIndex } = this.pheromoneBodyIndexes;
    const { AABB_leftIndex, AABB_topIndex, AABB_rightIndex, AABB_bottomIndex } = this.brachIndexes;
    const { PHEROMONE_FOOD, PHEROMONE_NEST } = TAGS;

    let tag = hasFood ? PHEROMONE_NEST : PHEROMONE_FOOD;
    sensor[xIndex] = x + directionX * sensorRadius * 0.5;
    sensor[yIndex] = y + directionY * sensorRadius * 0.5;

    const [id, xB, yB] = sensor;
    const branch = this.branches[id];

    if (
      xB - sensorRadius < branch[AABB_leftIndex] ||
      yB - sensorRadius < branch[AABB_topIndex] ||
      xB + sensorRadius > branch[AABB_rightIndex] ||
      yB + sensorRadius > branch[AABB_bottomIndex]
    ) {
      this.remove(sensor);
      this.insert(sensor);
    }

    let intensity = 0;
    let directionTargetX = 0;
    let directionTargetY = 0;

    for (const other of this.getPotentials(sensor)) {
      const otherIntensity = other[intensityIndex];
      if (
        otherIntensity > intensity &&
        other[tagIndex] === tag &&
        this.areCirclesOverlapping(sensor, other, sensorRadius)
      ) {
        intensity = otherIntensity;
        directionTargetX = other[xIndex] - x;
        directionTargetY = other[yIndex] - y;
      }
    }

    return [directionTargetX, directionTargetY];
  }
}
