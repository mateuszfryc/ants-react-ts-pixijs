import * as PIXI from 'pixi.js';

import { BVH } from './BVH';
import { Circle } from './circle';
import { aabbAABB, circleCircle, polygonCircle, polygonPolygon } from './SAT';
import { Polygon } from './polygon';
import { Shape } from './proxyTypes';
import { Result } from './result';

export const TAGS = {
  ANT: 'ant',
  OBSTACLE: 'world-bounds',
  NEST: 'nest',
  FOOD: 'food',
  SCENT_NEST: 'scent_nest',
  FOOD_NEST: 'scent_food',
};

export class Collisions {
  _bvh: BVH;

  constructor() {
    this._bvh = new BVH();
  }

  addCircle(x = 0, y = 0, radius = 0, tags = [TAGS.ANT], scale = 1, padding = 0): Circle {
    const body = new Circle(x, y, radius, tags, scale, padding) as Shape;

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
    tags = [TAGS.OBSTACLE],
    angle = 0,
    scale_x = 1,
    scale_y = 1,
    padding = 0,
  ): Polygon {
    const body = new Polygon(x, y, points, tags, angle, scale_x, scale_y, padding) as Shape;

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
    // eslint-disable-next-line no-restricted-syntax
    for (const body of bodies) {
      this._bvh.insert(body, false);
    }

    return this;
  }

  // Removes bodies from the collision system
  remove(...bodies: Shape[]): Collisions {
    // eslint-disable-next-line no-restricted-syntax
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

  createWorldBounds(width: number, height: number, padding = 2): Polygon[] {
    const top = this.addPolygon(0, 0, [
      [0, 0],
      [width, 0],
      [width, padding],
      [0, padding],
    ]);
    const right = this.addPolygon(0, 0, [
      [width - padding, 0],
      [width, 0],
      [width, height],
      [width - padding, height],
    ]);
    const bottom = this.addPolygon(0, 0, [
      [0, height - padding],
      [width, height - padding],
      [width, height],
      [0, height],
    ]);
    const left = this.addPolygon(0, 0, [
      [0, 0],
      [padding, 0],
      [padding, height],
      [0, height],
    ]);

    return [top, right, bottom, left];
  }

  // eslint-disable-next-line class-methods-use-this
  isCollision(a: Shape, b: Shape, result?: Result): boolean {
    const a_polygon = a._polygon;
    const b_polygon = b._polygon;

    if (result) {
      // eslint-disable-next-line no-param-reassign
      result.a = a;
      // eslint-disable-next-line no-param-reassign
      result.b = b;
      // eslint-disable-next-line no-param-reassign
      result.a_in_b = true;
      // eslint-disable-next-line no-param-reassign
      result.b_in_a = true;
      // eslint-disable-next-line no-param-reassign
      result.overlap = undefined;
      // eslint-disable-next-line no-param-reassign
      result.overlap_x = 0;
      // eslint-disable-next-line no-param-reassign
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
