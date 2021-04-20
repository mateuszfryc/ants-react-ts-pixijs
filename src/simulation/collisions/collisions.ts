import * as PIXI from 'pixi.js';

import { BVH } from './BVH';
import { Circle } from './circle';
import { aabbAABB, circleCircle, polygonCircle, polygonPolygon } from './SAT';
import { Polygon } from './polygon';
import { Shape } from './proxyTypes';
import { Result } from './result';

export const TAGS = {
  ANT: 0,
  OBSTACLE: 1,
  NEST: 2,
  NEST_VISIBLE_AREA: 3,
  FOOD: 4,
  FOOD_SCENT_AREA: 5,
  SCENT_NEST: 6,
  SCENT_FOOD: 7,
};

export class Collisions {
  _bvh: BVH;

  constructor() {
    this._bvh = new BVH();
  }

  addCircle(x = 0, y = 0, radius = 1, tag = TAGS.ANT, scale = 1, padding = 0, id = 0): Circle {
    const body = new Circle(x, y, radius, tag, scale, padding, id) as Shape;

    const removeSelf = (): void => {
      this.remove(body);
    };
    removeSelf.bind(this);
    body.removeSelfFromCollisions = removeSelf;

    this._bvh.insert(body);

    return body;
  }

  addPolygon(
    x = 0,
    y = 0,
    points = [[0, 0]],
    tag = TAGS.OBSTACLE,
    angle = 0,
    scale_x = 1,
    scale_y = 1,
    padding = 0,
  ): Polygon {
    const body = new Polygon(x, y, points, tag, angle, scale_x, scale_y, padding) as Shape;

    const removeSelf = (): void => {
      this.remove(body);
    };
    removeSelf.bind(this);
    body.removeSelfFromCollisions = removeSelf;

    this._bvh.insert(body);

    return body;
  }

  // Inserts bodies into the collision system
  insert(...bodies: Shape[]): Collisions {
    for (const body of bodies) {
      this._bvh.insert(body, false);
    }

    return this;
  }

  // Removes bodies from the collision system
  remove(...bodies: Shape[]): Collisions {
    for (const body of bodies) {
      this._bvh.remove(body, false);
    }

    return this;
  }

  // Updates the collision system. This should be called before any collisions are tested.
  update(): Collisions {
    this._bvh.update();

    return this;
  }

  // Draws the bodies within the system to a CanvasRenderingContext2D's current path
  draw(context: PIXI.Graphics): void {
    this._bvh.draw(context);
  }

  // Returns a list of potential collisions
  getPotentials(shape: Shape): Shape[] {
    const bvh = this._bvh;

    if (bvh === undefined) {
      throw new Error('Body does not belong to a collision system');
    }

    return bvh.potentials(shape);
  }

  addSingleWorldBound(points: number[][], collisionPadding = 0): Polygon {
    return this.addPolygon(0, 0, points, TAGS.OBSTACLE, 0, 1, 1, collisionPadding);
  }

  createWorldBounds(width: number, height: number, thickness = 10, offset = 0): Polygon[] {
    // this is required for the status bar
    const bottomPadding = 20;
    const top = this.addSingleWorldBound([
      [offset, offset],
      [width - offset, offset],
      [width - offset, thickness + offset],
      [offset, thickness + offset],
    ]);
    const right = this.addSingleWorldBound([
      [width - thickness - offset, offset],
      [width - offset, offset],
      [width - offset, height - offset - bottomPadding],
      [width - thickness - offset, height - offset - bottomPadding],
    ]);
    const bottom = this.addSingleWorldBound([
      [offset, height - thickness - bottomPadding - offset],
      [width - offset, height - thickness - bottomPadding - offset],
      [width - offset, height - bottomPadding - offset],
      [offset, height - bottomPadding - offset],
    ]);
    const left = this.addSingleWorldBound([
      [0 + offset, offset],
      [thickness + offset, offset],
      [thickness + offset, height - bottomPadding - offset],
      [0 + offset, height - bottomPadding - offset],
    ]);

    return [top, right, bottom, left];
  }

  // eslint-disable-next-line class-methods-use-this
  isCollision(a: Shape, b: Shape, result?: Result): boolean {
    const a_polygon = a._polygon;
    const b_polygon = b._polygon;

    if (result) {
      result.a = a;
      result.b = b;
      result.a_in_b = true;
      result.b_in_a = true;
      result.overlap = undefined;
      result.overlap_x = 0;
      result.overlap_y = 0;
    }

    if (
      a_polygon &&
      (a._dirty_coords ||
        a.x !== a._x ||
        a.y !== a._y ||
        a.angle !== a._angle ||
        a.scale_x !== a._scale_x ||
        a.scale_y !== a._scale_y)
    ) {
      a._calculateCoords();
    }

    if (
      b_polygon &&
      (b._dirty_coords ||
        b.x !== b._x ||
        b.y !== b._y ||
        b.angle !== b._angle ||
        b.scale_x !== b._scale_x ||
        b.scale_y !== b._scale_y)
    ) {
      b._calculateCoords();
    }

    if (aabbAABB(a, b)) {
      if (a_polygon && a._dirty_normals) {
        a._calculateNormals();
      }

      if (b_polygon && b._dirty_normals) {
        b._calculateNormals();
      }

      if (a_polygon) {
        return b_polygon ? polygonPolygon(a, b, result) : polygonCircle(a, b, result);
      }
      if (b_polygon) {
        return polygonCircle(b, a, result, true);
      }

      return circleCircle(a, b, result);
    }

    return false;
  }
}
