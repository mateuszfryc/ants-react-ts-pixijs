import * as PIXI from 'pixi.js';

import AntImage from 'assets/ant-red.png';
import { Circle } from 'simulation/collisions/circle';
import { Collisions, TAGS } from 'simulation/collisions/collisions';
import { halfPI, randomInRange, randomSign, randomUnitVector } from 'utils/math';
import { Timer } from 'simulation/Timer';
import { doNTimes } from 'utils/do-n-times';
import { ObjectOfNumbers } from 'UI/types/baseTypes';
import { Shape } from './collisions/proxyTypes';

export function setupAnts(antsCount: number, antsSprites: PIXI.ParticleContainer): any {
  const antsScale = 3;
  const antsProps: number[][] = [];
  antsProps.length = antsCount;
  /**
   * Desribes how many single pheromones
   * can be emitted before ant
   * will have to visit nest or find food,
   * to start emitting pheromones again.
   */
  const maxPheromonesEmission = 64;
  const antsCollisions = new Collisions();
  const antsCollisionShapes = new Map<number, Circle>();

  const antTexture = PIXI.Texture.from(AntImage);
  const timers = new Map<number, Timer>();

  let lastCreatedAntId = 0;
  const antsSpritesMap = new Map<number, PIXI.Sprite>();

  const antPropsIndexes: ObjectOfNumbers = [
    'id',
    'directionX',
    'directionY',
    'randomDirectionX',
    'randomDirectionY',
    'speed',
    'speedTarget',
    'maxSpeed',
    'hasFood',
    'pheromoneStrength',
  ].reduce((acc, val, index) => {
    acc[`${val}Index`] = index;

    return acc;
  }, {});

  function spawnAnt(id: number, x: number, y: number): any {
    const antCollisionShape = new Circle(
      x,
      y,
      antsScale * 0.85, // radius
      TAGS.ANT,
      1, // scale
      0, // padding
      id,
    );

    const antSprite = PIXI.Sprite.from(antTexture);
    antSprite.scale.set(antsScale * 0.095);
    antSprite.anchor.set(0.5);
    antSprite.zIndex = 1;
    const rotationChangeTimer = new Timer(undefined, undefined, 0.2, 1);

    // x and y random and normalized velocity
    const [directionX, directionY] = randomUnitVector();
    const randomDirectionX = 0;
    const randomDirectionY = 0;
    const maxSpeed = randomInRange(55, 65);
    const speed = maxSpeed * 0.5;
    const targetSpeed = maxSpeed;
    const hasFood = 0;
    const pheromoneStrength = 0;
    const properties = [
      id,
      directionX,
      directionY,
      randomDirectionX,
      randomDirectionY,
      speed,
      targetSpeed,
      maxSpeed,
      hasFood,
      pheromoneStrength,
    ];

    antsCollisionShapes.set(id, antCollisionShape);
    antsCollisions.insert(antCollisionShape as Shape);
    antsSpritesMap.set(id, antSprite);
    antsSprites.addChild(antSprite);
    timers.set(id, rotationChangeTimer);
    antsProps[id] = properties;
    lastCreatedAntId++;

    return antsCollisionShapes.size < antsCount;
  }

  function releaseOneByOne(xSpawn: number, ySpawn: number): void {
    setTimeout(() => {
      const shouldSpawnNextAnt = spawnAnt(
        lastCreatedAntId,
        xSpawn + randomInRange(-10, 10),
        ySpawn + randomInRange(-10, 10),
      );
      if (shouldSpawnNextAnt) {
        releaseOneByOne(xSpawn, ySpawn);
      }
    }, 0);
  }

  const throwAllAtOnce = (worldWidth: number, worldHeight: number): void => {
    doNTimes(() => {
      spawnAnt(
        lastCreatedAntId,
        randomInRange(10, worldWidth - 10),
        randomInRange(10, worldHeight - 10),
      );
    }, antsCount);
  };

  return {
    antPropsIndexes,
    antsCollisions,
    antsCollisionShapes,
    antsProps,
    antsScale,
    antsSpritesMap,
    maxPheromonesEmission,
    randomDirectionMaxAngle: 1,
    directionChangeMultiplier: 0.16,
    releaseOneByOne,
    throwAllAtOnce,
    timers,
  };
}
