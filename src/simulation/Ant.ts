import * as PIXI from 'pixi.js';

import AntImage from 'assets/ant-red.png';
import { Circle } from 'simulation/collisions/circle';
import { TAGS } from 'simulation/collisions/collisions';
import { randomInRange } from 'utils/math';
import { SpriteWithCollisions } from 'simulation/SpriteWithCollisions';
import { Shape } from 'simulation/collisions/proxyTypes';
import { Timer } from 'simulation/Timer';

const { ANT } = TAGS;

export class Ant extends SpriteWithCollisions {
  id: number;
  speed: number;
  maxSpeed: number;
  rotationSign: number;
  nestScent: number;
  foodScent: number;
  hasFood: boolean;
  foundFood: boolean;
  attachedFoodSprite: PIXI.Sprite | undefined;
  recentlyVistedScentParticles: number[];
  rotationSignChangeTimer: Timer;
  scentEmissionTimer: Timer;
  followedScendAge: number;

  constructor(id: number, x: number, y: number, maxSpeed = 30, scale = 0.2, nestScent = 32) {
    const rotation = Math.atan2(randomInRange(-1, 1), randomInRange(-1, 1));
    super(AntImage, new Circle(x, y, scale * 8, ANT) as Shape, x, y, scale, rotation);

    this.id = id;
    this.maxSpeed = maxSpeed * 0.5;
    this.speed = maxSpeed;
    this.rotationSign = Math.random() * 2 - 1;
    this.nestScent = nestScent;
    this.foodScent = 0;
    this.hasFood = false;
    this.foundFood = false;
    this.attachedFoodSprite = undefined;
    this.recentlyVistedScentParticles = [];
    this.rotationSignChangeTimer = new Timer(0.2, undefined, 0.2, 1);
    this.scentEmissionTimer = new Timer(0.15);
    this.followedScendAge = 0;
  }

  getRotationAtPoint(x: number, y: number): number {
    return -Math.atan2(this.x - x, this.y - y);
  }

  getRotationAwayFromPoint(x: number, y: number): number {
    return -Math.atan2(x - this.x, y - this.y);
  }
}
