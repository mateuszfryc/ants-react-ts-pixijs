import * as PIXI from 'pixi.js';

import AntImage from 'assets/ant.png';
import { Circle } from 'collisions/circle';
import { TAGS } from 'collisions/collisions';
import { randomInRange } from 'utils/math';

export class Ant extends PIXI.Sprite {
  body: Circle;
  speed: number;
  rotationFlipSign: number;
  rotationFlipTime: number;
  rotationFlipMuliplierCounter: number;

  constructor(x: number, y: number, speed = 30, scale = 0.2) {
    super(PIXI.Texture.from(AntImage));
    this.body = new Circle(x, y, scale * 11, [TAGS.ANT]);
    this.x = x;
    this.y = y;
    this.anchor.set(0.5);
    this.scale.set(scale);
    this.speed = speed;
    const rotation = Math.atan2(randomInRange(-1, 1), randomInRange(-1, 1));
    this.body.rotation = rotation;
    this.rotation = rotation;
    this.rotationFlipSign = Math.random() * 2 - 1;
    this.rotationFlipTime = Math.random() * 2;
    this.rotationFlipMuliplierCounter = 0;
  }
}
