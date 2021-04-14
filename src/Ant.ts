import AntImage from 'assets/ant-red.png';
import { Circle } from 'collisions/circle';
import { TAGS } from 'collisions/collisions';
import { randomInRange } from 'utils/math';
import { SpriteWithCollisions } from 'SpriteWithCollisions';
import { Shape } from 'collisions/proxyTypes';

export class Ant extends SpriteWithCollisions {
  speed: number;
  rotationFlipSign: number;
  rotationFlipTime: number;
  rotationFlipMuliplierCounter: number;

  constructor(x: number, y: number, speed = 30, scale = 0.2) {
    const rotation = Math.atan2(randomInRange(-1, 1), randomInRange(-1, 1));
    super(AntImage, new Circle(x, y, scale * 11, [TAGS.ANT]) as Shape, x, y, scale, rotation);
    this.speed = speed;
    this.rotationFlipSign = Math.random() * 2 - 1;
    this.rotationFlipTime = Math.random() * 2;
    this.rotationFlipMuliplierCounter = 0;
  }
}
