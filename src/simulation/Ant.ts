import * as PIXI from 'pixi.js';

import AntImage from 'assets/ant-red.png';
import { Circle } from 'simulation/collisions/circle';
import { Collisions, TAGS } from 'simulation/collisions/collisions';
import { randomInRange, randomSign, randomUnitVector } from 'utils/math';
import { Timer } from 'simulation/Timer';
import { doNTimes } from 'utils/do-n-times';

export function setupAnts(antsCount: number, antsSprites: PIXI.Container): any {
  const antsScale = 3;
  const timers = new Map<number, Timer>();
  let lastCreatedAntId = 0;
  /**
   * * One (1) dimensional array of properties of all the ants.
   * Accessing single ant prop is done by:
   *   antsProps[i * e + p]
   * where:
   * i = index of the ant
   * e = number of properites single ant has
   * p = index of single prop within range of ant props, starts with 0 and goes up to e - 1
   *
   * the array will look like this:
   * antsProps = [x1, y1, speed1, x2, y2, speed2, x3, y3, speed3...xn, yn, speedn]
   */
  const Int8ArrayItemSize = 1;
  const Float32ArrayItemSize = 4;

  const singleAntPropsCount = 9;
  const antsPropsInt8IDs = {
    speedId: 0,
    targetSpeedId: 1,
    maxSpeedId: 2,
    rotationDirectionId: 3,
    hasFoodId: 4,
    pheromoneStrengthId: 5,
  };
  const antPropsInt8Count = Object.keys(antsPropsInt8IDs).length;
  const antsPropsFloat16IDs = {
    xvId: 0,
    yvId: 1,
    xvTargetId: 2,
    yvTargetId: 3,
  };
  const antPropsFloat16Count = Object.keys(antsPropsFloat16IDs).length;
  const antsPropsInt8: Int8Array = new Int8Array(
    new ArrayBuffer(antsCount * Int8ArrayItemSize * antPropsInt8Count),
  );
  const antsPropsFloat16: Float32Array = new Float32Array(
    new ArrayBuffer(antsCount * Float32ArrayItemSize * antPropsFloat16Count),
  );
  const antsSpritesMap = new Map<number, PIXI.Sprite>();

  /**
   * Desribes how many single pheromones
   * can be emitted before ant
   * will have to visit nest or find food,
   * to start emitting pheromones again.
   */
  const maxPheromonesEmission = 64;
  const feromonesLifetime = 32000; // miliseconds
  const antsCollisions = new Collisions();
  const antsCollisionShapes = new Map<number, Circle>();

  const antTexture = PIXI.Texture.from(AntImage);

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
    // eslint-disable-next-line prettier/prettier
    const propertiesInt8 = [
      speed,
      targetSpeed,
      maxSpeed,
      rotationDirection,
      hasFood,
      pheromoneStrength,
    ];
    // eslint-disable-next-line prettier/prettier
    const propertiesFloat16 = [xv, yv, xvTarget, yvTarget];

    return {
      id,
      antCollisionShape,
      antSprite,
      rotationChangeTimer,
      propertiesInt8,
      propertiesFloat16,
    };
  }

  function registerAnt({
    id,
    antCollisionShape,
    antSprite,
    rotationChangeTimer,
    propertiesInt8,
    propertiesFloat16,
  }: any): boolean {
    antsCollisionShapes.set(id, antCollisionShape);
    antsCollisions.insert(antCollisionShape);
    antsSpritesMap.set(id, antSprite);
    antsSprites.addChild(antSprite);
    timers.set(id, rotationChangeTimer);

    propertiesInt8.forEach((prop: number, index: number) => {
      antsPropsInt8[id * antPropsInt8Count + index] = prop;
    });

    propertiesFloat16.forEach((prop: number, index: number) => {
      antsPropsFloat16[id * antPropsFloat16Count + index] = prop;
    });

    return antsCollisionShapes.size < antsCount;
  }

  function releaseOneByOne(xSpawn: number, ySpawn: number): void {
    setTimeout(() => {
      const ant = spawnAnt(
        lastCreatedAntId,
        xSpawn + randomInRange(-10, 10),
        ySpawn + randomInRange(-10, 10),
      );
      lastCreatedAntId++;

      if (registerAnt(ant)) {
        releaseOneByOne(xSpawn, ySpawn);
      }
    }, 0);
  }

  const throwAllAtOnce = (worldWidth: number, worldHeight: number): void => {
    doNTimes(() => {
      registerAnt(
        spawnAnt(
          lastCreatedAntId,
          randomInRange(10, worldWidth - 10),
          randomInRange(10, worldHeight - 10),
        ),
      );
      lastCreatedAntId++;
    }, antsCount);
  };

  return {
    antsScale,
    antsCollisionShapes,
    antsCollisions,
    antsSpritesMap,
    timers,
    antsPropsInt8,
    antsPropsFloat16,
    releaseOneByOne,
    throwAllAtOnce,
    antPropsInt8Count,
    antPropsFloat16Count,
    antsPropsInt8IDs,
    antsPropsFloat16IDs,
    maxPheromonesEmission,
    feromonesLifetime,
  };
}
