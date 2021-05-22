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
  sensors: number[][] = [];
  sprites = ParticleContainer;
  lastPheromonePickedIndex = 3;
  readonly sensorForwardDistance = 3.8;
  readonly sensorsSideDistance = 0.46;
  readonly sensorsSideSpread = 0.7;
  readonly pheromonesMaxLifeSpan: number;
  readonly pheromoneEmissionTimer: Timer;
  readonly pheromoneRadius: number;
  readonly sensorRadius: number;
  /**
   * This additional property of the minimal collisions items
   * is added on top of other circles properties.
   */
  readonly spawnTimeIndex = 5;

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
    timeBetweenEmissions = 0.2,
  ) {
    super(antsCount * Math.round(1 / timeBetweenEmissions) * pheromonesMaxLifeSpan);

    this.pheromonesMaxLifeSpan = pheromonesMaxLifeSpan;
    this.pheromoneRadius = defaultRadius * antsScale;
    this.sensorRadius = this.pheromoneRadius * 1.2;
    this.pheromoneEmissionTimer = new Timer(timeBetweenEmissions);

    this.initialiseBodies(this.pheromoneRadius, outOfBoundsDistance);
    this.initialiseSprites();
    this.initialiseSensors();

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
      pheromoneSprite.scale.set(0.1 * this.pheromoneRadius);
      this.pheromonesSpritesMap[index] = pheromoneSprite;
      pheromonesSprites.addChild(pheromoneSprite);
    }, this.bodiesMaxCount);
    // eslint-disable-next-line no-console
    console.timeEnd(initLabel);
  }

  private initialiseSensors(): void {
    const { ANT_SENSOR } = TAGS;
    const { tagIndex, radiusIndex } = this.pheromoneBodyIndexes;
    this.sensors = [0, 1, 2].map((id: number): number[] => {
      const sensor: number[] = this.bodies[id];
      sensor[tagIndex] = ANT_SENSOR;
      sensor[radiusIndex] = this.sensorRadius;

      return sensor;
    });
  }

  public addPheromone(x: number, y: number, hasFood: boolean, spawnTime: number): void {
    const { PHEROMONE_FOOD, PHEROMONE_NEST } = TAGS;
    const { spawnTimeIndex } = this;
    let { lastPheromonePickedIndex } = this;
    const { xIndex, yIndex, tagIndex } = this.pheromoneBodyIndexes;
    const pheromone = this.bodies[lastPheromonePickedIndex];
    pheromone[xIndex] = x;
    pheromone[yIndex] = y;
    pheromone[spawnTimeIndex] = spawnTime;
    pheromone[tagIndex] = hasFood ? PHEROMONE_FOOD : PHEROMONE_NEST;
    const [id] = pheromone;
    this.activePheromones.push(id);
    this.remove(pheromone);
    this.insert(pheromone);

    const pheromoneSprite = this.pheromonesSpritesMap[id];
    pheromoneSprite.x = x;
    pheromoneSprite.y = y;
    pheromoneSprite.alpha = 1;
    pheromoneSprite.tint = hasFood ? 0x00cc22 : 0x0088ff;

    lastPheromonePickedIndex++;
    this.lastPheromonePickedIndex =
      lastPheromonePickedIndex >= this.bodiesMaxCount ? 3 : lastPheromonePickedIndex;
  }

  public updatePheromones(frameStartTime: number): void {
    const { spawnTimeIndex, pheromonesMaxLifeSpan, pheromoneRadius } = this;
    const { xIndex, yIndex } = this.pheromoneBodyIndexes;
    const toBeRemoved: number[] = [];
    this.activePheromones.forEach((activeId: number): void => {
      const pheromone = this.bodies[activeId];
      let lifeSpan = (frameStartTime - pheromone[spawnTimeIndex]) / 1000;
      const sprite = this.pheromonesSpritesMap[activeId];
      if (lifeSpan < pheromonesMaxLifeSpan) {
        sprite.alpha = 1 - lifeSpan / pheromonesMaxLifeSpan;
      } else {
        pheromone[xIndex] = activeId * -pheromoneRadius;
        pheromone[yIndex] = activeId * -pheromoneRadius;
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
  public getDirectionFromSensors(
    x: number,
    y: number,
    directionX: number,
    directionY: number,
    antsScale: number,
    hasFood: boolean,
    frameStartTime: number,
  ): [number, number] {
    const { sensorForwardDistance, sensorsSideDistance, sensorsSideSpread, spawnTimeIndex } = this;
    const [sensorLeft, sensorForward, sensorRight] = this.sensors;
    const { xIndex, yIndex, tagIndex } = this.pheromoneBodyIndexes;
    const { AABB_leftIndex, AABB_topIndex, AABB_rightIndex, AABB_bottomIndex } = this.brachIndexes;
    const { PHEROMONE_FOOD, PHEROMONE_NEST } = TAGS;

    const xBase = directionX * antsScale;
    const yBase = directionY * antsScale;
    let tag = hasFood ? PHEROMONE_NEST : PHEROMONE_FOOD;
    sensorForward[xIndex] = x + xBase * sensorForwardDistance;
    sensorForward[yIndex] = y + yBase * sensorForwardDistance;
    sensorLeft[xIndex] =
      x +
      xBase * (sensorForwardDistance * sensorsSideDistance) -
      directionY * (sensorForwardDistance * sensorsSideSpread) * antsScale;
    sensorLeft[yIndex] =
      y +
      yBase * (sensorForwardDistance * sensorsSideDistance) +
      directionX * (sensorForwardDistance * sensorsSideSpread) * antsScale;
    sensorRight[xIndex] =
      x +
      xBase * (sensorForwardDistance * sensorsSideDistance) +
      directionY * (sensorForwardDistance * sensorsSideSpread) * antsScale;
    sensorRight[yIndex] =
      y +
      yBase * (sensorForwardDistance * sensorsSideDistance) -
      directionX * (sensorForwardDistance * sensorsSideSpread) * antsScale;

    this.sensors.forEach((body: number[]) => {
      const [id, xB, yB, radiusB] = body;
      const branch = this.branches[id];

      if (
        xB - radiusB < branch[AABB_leftIndex] ||
        yB - radiusB < branch[AABB_topIndex] ||
        xB + radiusB > branch[AABB_rightIndex] ||
        yB + radiusB > branch[AABB_bottomIndex]
      ) {
        this.remove(body);
        this.insert(body);
      }
    });

    let frontSensorInputSum = 0;
    let leftSensorInputSum = 0;
    let rightSensorInputSum = 0;

    for (const other of this.getPotentials(sensorForward)) {
      const matchesSearchedTag = other[tagIndex] === tag;
      if (matchesSearchedTag && this.areCirclesOverlapping(sensorForward, other)) {
        frontSensorInputSum += frameStartTime - other[spawnTimeIndex];
      }
    }

    for (const other of this.getPotentials(sensorLeft)) {
      const matchesSearchedTag = other[tagIndex] === tag;
      if (matchesSearchedTag && this.areCirclesOverlapping(sensorLeft, other)) {
        leftSensorInputSum += frameStartTime - other[spawnTimeIndex];
      }
    }

    for (const other of this.getPotentials(sensorRight)) {
      const matchesSearchedTag = other[tagIndex] === tag;
      if (matchesSearchedTag && this.areCirclesOverlapping(sensorRight, other)) {
        rightSensorInputSum += frameStartTime - other[spawnTimeIndex];
      }
    }

    let directionTargetX = 0;
    let directionTargetY = 0;

    if (frontSensorInputSum > Math.max(leftSensorInputSum, rightSensorInputSum)) {
      directionTargetX = sensorForward[xIndex] - x;
      directionTargetY = sensorForward[yIndex] - y;
    } else if (leftSensorInputSum > rightSensorInputSum) {
      directionTargetX = sensorLeft[xIndex] - x;
      directionTargetY = sensorLeft[yIndex] - y;
    } else if (rightSensorInputSum > leftSensorInputSum) {
      directionTargetX = sensorRight[xIndex] - x;
      directionTargetY = sensorRight[yIndex] - y;
    }

    return [directionTargetX, directionTargetY];
  }
}
