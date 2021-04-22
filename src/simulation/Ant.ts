import * as PIXI from 'pixi.js';

import AntImage from 'assets/ant-red.png';
import { Circle } from 'simulation/collisions/circle';
import { TAGS } from 'simulation/collisions/collisions';
import { randomInRange, randomSign } from 'utils/math';
import { Timer } from 'simulation/Timer';

let antsIdCounter = 0;

export function spawnAnt(x: number, y: number, size = 10): any {
  const antCollisionShape = new Circle(
    x,
    y,
    size, // radius
    TAGS.ANT,
    1, // scale
    0, // padding
    antsIdCounter,
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
  const maxSpeed = randomInRange(40, 50);
  const speed = maxSpeed * 0.5;
  const targetSpeed = maxSpeed;
  const rotationDirection = randomSign();
  const hasFood = false;
  const properties = [
    /* indexes */
    /* 0: */ speed,
    /* 1: */ xv,
    /* 2: */ yv,
    /* 3: */ xvTarget,
    /* 4: */ yvTarget,
    /* 5: */ maxSpeed,
    /* 6: */ targetSpeed,
    /* 7: */ rotationDirection,
    /* 8: */ hasFood,
  ];

  antsIdCounter++;

  return [antCollisionShape, antSprite, rotationChangeTimer, properties];
}

export function releaseTheAnts(
  useAntCallback: (ant: any) => boolean,
  xSpawn: number,
  ySpawn: number,
  singleAntSize: number,
): void {
  setTimeout(() => {
    const [antCollisionShape, antSprite, rotationChangeTimer, properties] = spawnAnt(
      xSpawn + randomInRange(-10, 10),
      ySpawn + randomInRange(-10, 10),
      singleAntSize,
    );
    const { id } = antCollisionShape;

    if (useAntCallback({ id, antCollisionShape, antSprite, rotationChangeTimer, properties })) {
      releaseTheAnts(useAntCallback, ySpawn, ySpawn, singleAntSize);
    }
  }, 30);
}
