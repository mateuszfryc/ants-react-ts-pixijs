import * as PIXI from 'pixi.js';

import AntImage from 'assets/ant-red.png';
import { Circle } from 'simulation/collisions/circle';
import { TAGS } from 'simulation/collisions/collisions';
import { randomInRange, randomSign } from 'utils/math';
import { Timer } from 'simulation/Timer';

let lastCreatedAntId = 0;
export const singleAntPropsCount = 9;
export const antsPropsIDs = {
  speedId: 0,
  xvId: 1,
  yvId: 2,
  xvTargetId: 3,
  yvTargetId: 4,
  maxSpeedId: 5,
  targetSpeedId: 6,
  rotationDirectionId: 7,
  hasFoodId: 8,
};

export function spawnAnt(id: number, x: number, y: number, size = 10): any {
  const antCollisionShape = new Circle(
    x,
    y,
    size, // radius
    TAGS.ANT,
    1, // scale
    0, // padding
    id,
  );

  const antSprite = PIXI.Sprite.from(AntImage);
  antSprite.scale.set(size * 0.09);
  antSprite.anchor.set(0.5);

  const rotationChangeTimer = new Timer(undefined, undefined, 0.2, 1);

  // x and y random and normalized velocity
  let xv = Math.random() * 2 - 1;
  let yv = Math.random() * 2 - 1;
  const lenght = Math.sqrt(xv * xv + yv * yv);
  xv /= lenght;
  yv /= lenght;
  const xvTarget = xv;
  const yvTarget = yv;
  const maxSpeed = randomInRange(30, 35);
  const speed = maxSpeed * 0.5;
  const targetSpeed = maxSpeed;
  const rotationDirection = randomSign();
  const hasFood = false;
  const properties = [
    speed,
    xv,
    yv,
    xvTarget,
    yvTarget,
    maxSpeed,
    targetSpeed,
    rotationDirection,
    hasFood,
  ];

  return [id, antCollisionShape, antSprite, rotationChangeTimer, properties];
}

export function releaseTheAnts(
  useAntCallback: (ant: any) => boolean,
  xSpawn: number,
  ySpawn: number,
  singleAntSize: number,
): void {
  setTimeout(() => {
    const [id, antCollisionShape, antSprite, rotationChangeTimer, properties] = spawnAnt(
      lastCreatedAntId,
      xSpawn + randomInRange(-10, 10),
      ySpawn + randomInRange(-10, 10),
      singleAntSize,
    );
    lastCreatedAntId++;

    if (useAntCallback({ id, antCollisionShape, antSprite, rotationChangeTimer, properties })) {
      releaseTheAnts(useAntCallback, ySpawn, ySpawn, singleAntSize);
    }
  }, 0);
}
