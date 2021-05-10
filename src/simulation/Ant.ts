import * as PIXI from 'pixi.js';

import AntImage from 'assets/ant-red.png';
import { Circle } from 'simulation/collisions/circle';
import { Collisions, TAGS } from 'simulation/collisions/collisions';
import { randomInRange, randomSign, randomUnitVector } from 'utils/math';
import { Timer } from 'simulation/Timer';
import { doNTimes } from 'utils/do-n-times';
import { Shape } from './collisions/proxyTypes';

export function setupAnts(antsCount: number, antsSprites: PIXI.Container): any {
  const antsScale = 3;
  const antsProps: number[][] = [];
  antsProps.length = antsCount;
  const maxPheromonesEmission = 64;
  const antsCollisions = new Collisions();
  const antsCollisionShapes = new Map<number, Circle>();

  const antTexture = PIXI.Texture.from(AntImage);
  const timers = new Map<number, Timer>();

  let lastCreatedAntId = 0;
  const antsSpritesMap = new Map<number, PIXI.Sprite>();

  /**
   * Desribes how many single pheromones
   * can be emitted before ant
   * will have to visit nest or find food,
   * to start emitting pheromones again.
   */

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
    let xv = randomInRange(-1, 1);
    let yv = randomInRange(-1, 1);
    const lenght = Math.sqrt(xv * xv + yv * yv);
    xv /= lenght;
    yv /= lenght;
    const xvTarget = xv;
    const yvTarget = yv;
    const maxSpeed = randomInRange(55, 60);
    const speed = maxSpeed * 0.5;
    const targetSpeed = maxSpeed;
    const rotationDirection = randomSign();
    const hasFood = 0;
    const pheromoneStrength = maxPheromonesEmission;
    const properties = [
      id,
      xv,
      yv,
      xvTarget,
      yvTarget,
      speed,
      targetSpeed,
      maxSpeed,
      rotationDirection,
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
    antsCollisions,
    antsCollisionShapes,
    antsProps,
    antsScale,
    antsSpritesMap,
    maxPheromonesEmission,
    releaseOneByOne,
    throwAllAtOnce,
    timers,

    /** Single ant's properties ids used to index props arrays */
    antPropsIndexes: {
      iID: 0,
      iXVelocity: 1,
      iYVelocity: 2,
      iXvTarget: 3,
      iYvTarget: 4,
      iSpeed: 5,
      iTargetSpeed: 6,
      iMaxSpeed: 7,
      iRotationDirection: 8,
      iHasFood: 9,
      iPheromoneStrength: 10,
    },
  };
}
