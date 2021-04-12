import * as PIXI from 'pixi.js';
import { randomInRange } from 'utils/math';

import { Collisions } from './collisions';
import { Shape } from './proxyTypes';
import { Result } from './result';

const result = new Result();
const count = 510;
const speed = 1;
const size = 4;

class CollisionsTest {
  context: PIXI.Graphics;
  collisions: Collisions;
  bodies: Shape[];
  polygons: number;
  circles: number;
  width: number;
  height: number;

  constructor(context: PIXI.Graphics, width: number, height: number) {
    this.context = context;
    this.collisions = new Collisions();
    this.bodies = [];
    this.polygons = 0;
    this.circles = 0;
    this.width = width;
    this.height = height;

    // World bounds
    this.collisions.addPolygon(0, 0, [
      [0, 0],
      [width, 0],
    ]);
    this.collisions.addPolygon(0, 0, [
      [width, 0],
      [width, height],
    ]);
    this.collisions.addPolygon(0, 0, [
      [width, height],
      [0, height],
    ]);
    this.collisions.addPolygon(0, 0, [
      [0, height],
      [0, 0],
    ]);

    for (let i = 0; i < count; ++i) {
      this.createShape(!randomInRange(0, 49));
    }

    this.update();
  }

  update(): void {
    this.collisions.update();

    // eslint-disable-next-line no-restricted-syntax
    for (const body of this.bodies) {
      body.x += body.direction_x * speed;
      body.y += body.direction_y * speed;

      const potentials = this.collisions.getPotentials(body);

      // eslint-disable-next-line no-restricted-syntax
      for (const other of potentials) {
        if (this.collisions.isCollision(body, other, result)) {
          body.x -= result.overlap! * result.overlap_x;
          body.y -= result.overlap! * result.overlap_y;

          let dot = body.direction_x * result.overlap_y + body.direction_y * -result.overlap_x;

          body.direction_x = 2 * dot * result.overlap_y - body.direction_x;
          body.direction_y = 2 * dot * -result.overlap_x - body.direction_y;

          dot = other.direction_x * result.overlap_y + other.direction_y * -result.overlap_x;

          other.direction_x = 2 * dot * result.overlap_y - other.direction_x;
          other.direction_y = 2 * dot * -result.overlap_x - other.direction_y;
        }
      }
    }

    this.context.clear();
    this.context.lineStyle(1, 0x000000);
    this.collisions.draw(this.context);

    requestAnimationFrame(() => {
      this.update();
    });
  }

  createShape(isLarge: boolean): void {
    const min_size = size * 0.75 * (isLarge ? 3 : 1);
    const max_size = size * 1.25 * (isLarge ? 5 : 1);
    const x = randomInRange(0, this.width);
    const y = randomInRange(0, this.height);
    const direction = (randomInRange(0, 360) * Math.PI) / 180;

    let body;

    if (randomInRange(0, 2)) {
      body = this.collisions.addCircle(x, y, randomInRange(min_size, max_size));

      this.circles += 1;
    } else {
      body = this.collisions.addPolygon(
        x,
        y,
        [
          [-randomInRange(min_size, max_size), -randomInRange(min_size, max_size)],
          [randomInRange(min_size, max_size), -randomInRange(min_size, max_size)],
          [randomInRange(min_size, max_size), randomInRange(min_size, max_size)],
          [-randomInRange(min_size, max_size), randomInRange(3, size)],
        ],
        (randomInRange(0, 360) * Math.PI) / 180,
      );

      this.polygons += 1;
    }

    body.direction_x = Math.cos(direction);
    body.direction_y = Math.sin(direction);

    this.bodies.push(body);
  }
}

export const SetupStressTest = (
  context: PIXI.Graphics,
  width: number,
  height: number,
): CollisionsTest => {
  return new CollisionsTest(context, width, height);
};
