import * as PIXI from 'pixi.js';

import NestImage from 'assets/nest.png';
import NestEntranceCoverImage from 'assets/nest-entrance-cover.png';
import { Circle } from 'simulation/collisions/circle';
import { Collisions, TAGS } from 'simulation/collisions/collisions';
import { SpriteWithCollisions } from 'simulation/SpriteWithCollisions';
import { Shape } from 'simulation/collisions/proxyTypes';

const { NEST, NEST_VISIBLE_AREA } = TAGS;

class Nest extends SpriteWithCollisions {
  areaIsVisibleIn: Shape;
  entranceCoverSprite: PIXI.Sprite;

  constructor(x: number, y: number, scale = 1) {
    // circle in the SpriteWithCollisions type acts as a drop zone for ants with food
    super(NestImage, new Circle(x, y, scale * 17, NEST) as Shape, x, y, scale);

    this.areaIsVisibleIn = new Circle(x, y, scale * 55, NEST_VISIBLE_AREA) as Shape;

    const entranceCover = PIXI.Sprite.from(NestEntranceCoverImage);
    entranceCover.x = x;
    entranceCover.y = y;
    entranceCover.scale.set(scale * 0.6);
    entranceCover.anchor.set(0.5);
    entranceCover.zIndex = 3;
    this.entranceCoverSprite = entranceCover;
  }
}

export function createNest(
  spawnX: number,
  spawnY: number,
  stage: PIXI.Container,
  collisionSystem: Collisions,
): Nest {
  const nest = new Nest(spawnX, spawnY);
  stage.addChild(nest);
  stage.addChild(nest.entranceCoverSprite);
  collisionSystem.insert(nest.body);

  return nest;
}
