import * as PIXI from 'pixi.js';

import AntImage from 'assets/ant-red.png';
import { Circle } from 'collisions/circle';
import { TAGS } from 'collisions/collisions';
import { randomInRange } from 'utils/math';
import { SpriteWithCollisions } from 'SpriteWithCollisions';
import { Shape } from 'collisions/proxyTypes';
import { Timer } from 'Timer';

export class Ant extends SpriteWithCollisions {
  speed: number;
  rotationSign: number;
  rotationFlipTime: number;
  rotationFlipMuliplierCounter: number;
  scentEmissionTimer: Timer;
  nestScent: number;
  foodScent: number;
  hasFood: boolean;
  attachedFoodSprite: PIXI.Sprite | undefined;

  constructor(x: number, y: number, speed = 30, scale = 0.2) {
    const rotation = Math.atan2(randomInRange(-1, 1), randomInRange(-1, 1));
    super(AntImage, new Circle(x, y, scale * 10, [TAGS.ANT]) as Shape, x, y, scale, rotation);

    this.speed = speed;
    // eslint-disable-next-line unicorn/consistent-function-scoping
    const flipRotation = (): void => {
      this.rotationSign *= -1;
    };
    flipRotation.bind(this);
    this.rotationSign = Math.random() * 2 - 1;
    this.rotationFlipTime = Math.random() * 2;
    this.rotationFlipMuliplierCounter = 0;
    this.scentEmissionTimer = new Timer(flipRotation, 0.5, true, 0.2, 0.7);
    this.nestScent = 2;
    this.foodScent = 0;
    this.hasFood = false;
    this.attachedFoodSprite = undefined;
  }
}
