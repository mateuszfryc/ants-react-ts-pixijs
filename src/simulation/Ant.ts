import * as PIXI from 'pixi.js';

import AntImage from 'assets/ant-red.png';
import { Circle } from 'simulation/collisions/circle';
import { TAGS } from 'simulation/collisions/collisions';
import { doNTimes, randomInRange, randomSign } from 'utils/math';
import { Timer } from 'simulation/Timer';

const antTexture = PIXI.Texture.from(AntImage);

let lastCreatedAntId = 0;
export const singleAntPropsCount = 9;
export const antsPropsInt8IDs = {
  speedId: 0,
  targetSpeedId: 1,
  maxSpeedId: 2,
  rotationDirectionId: 3,
  hasFoodId: 4,
  pheromoneEmissionTimeOffsetId: 5,
};
export const antPropsInt8Count = Object.keys(antsPropsInt8IDs).length;
export const antsPropsFloat16IDs = {
  xvId: 0,
  yvId: 1,
  xvTargetId: 2,
  yvTargetId: 3,
};
export const antPropsFloat16Count = Object.keys(antsPropsFloat16IDs).length;

export function spawnAnt(id: number, x: number, y: number, size = 8): any {
  const antCollisionShape = new Circle(
    x,
    y,
    size * 0.85, // radius
    TAGS.ANT,
    1, // scale
    0, // padding
    id,
  );

  const antSprite = PIXI.Sprite.from(antTexture);
  antSprite.scale.set(size * 0.095);
  antSprite.anchor.set(0.5);

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
  const pheromoneEmissionTimeOffset = randomInRange(-127, 127);
  // eslint-disable-next-line prettier/prettier
  const propertiesInt8 = [
    speed,
    targetSpeed,
    maxSpeed,
    rotationDirection,
    hasFood,
    pheromoneEmissionTimeOffset,
  ];
  // eslint-disable-next-line prettier/prettier
  const propertiesFloat16 = [xv, yv, xvTarget, yvTarget];

  return [id, antCollisionShape, antSprite, rotationChangeTimer, propertiesInt8, propertiesFloat16];
}

export function releaseTheAnts(
  useAntCallback: (ant: any) => boolean,
  xSpawn: number,
  ySpawn: number,
  singleAntSize: number,
): void {
  setTimeout(() => {
    const [
      id,
      antCollisionShape,
      antSprite,
      rotationChangeTimer,
      propertiesInt8,
      propertiesFloat16,
    ] = spawnAnt(
      lastCreatedAntId,
      xSpawn + randomInRange(-10, 10),
      ySpawn + randomInRange(-10, 10),
      singleAntSize,
    );
    lastCreatedAntId++;

    if (
      useAntCallback({
        id,
        antCollisionShape,
        antSprite,
        rotationChangeTimer,
        propertiesInt8,
        propertiesFloat16,
      })
    ) {
      releaseTheAnts(useAntCallback, xSpawn, ySpawn, singleAntSize);
    }
  }, 0);
}

export const throwAllAntsAtOnce = (
  useAntCallback: (ant: any) => boolean,
  worldWidth: number,
  worldHeight: number,
  singleAntSize: number,
  antsCount: number,
): void => {
  doNTimes(() => {
    const [
      id,
      antCollisionShape,
      antSprite,
      rotationChangeTimer,
      propertiesInt8,
      propertiesFloat16,
    ] = spawnAnt(
      lastCreatedAntId,
      randomInRange(worldWidth * 0.05, worldWidth * 0.95),
      randomInRange(worldHeight * 0.05, worldHeight * 0.95),
      singleAntSize,
    );
    lastCreatedAntId++;
    useAntCallback({
      id,
      antCollisionShape,
      antSprite,
      rotationChangeTimer,
      propertiesInt8,
      propertiesFloat16,
    });
  }, antsCount);
};
