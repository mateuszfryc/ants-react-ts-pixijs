import * as PIXI from 'pixi.js';

import { BVHBranch } from './BVHBranch';
import { Shape } from './proxyTypes';

export class BVH {
  _hierarchy: BVHBranch | Shape | undefined;
  _bodies: Shape[];
  _dirty_branches: [];

  constructor() {
    this._hierarchy = undefined;
    this._bodies = [];
    this._dirty_branches = [];
  }

  // Inserts a body into the BVH
  insert(shape: Shape, updating = false): void {
    const isPolygon = shape._polygon;
    if (!updating) {
      this._bodies.push(shape);
    }

    const body_x = shape.x;
    const body_y = shape.y;

    if (
      isPolygon &&
      (shape._dirty_coords ||
        shape.x !== shape._x ||
        shape.y !== shape._y ||
        shape.angle !== shape._angle ||
        shape.scale_x !== shape._scale_x ||
        shape.scale_y !== shape._scale_y)
    ) {
      shape._calculateCoords();
    }

    const padding = shape._bvh_padding;
    const radius = isPolygon ? 0 : shape.radius * shape.scale;
    const body_min_x = (isPolygon ? shape._min_x : body_x - radius) - padding;
    const body_min_y = (isPolygon ? shape._min_y : body_y - radius) - padding;
    const body_max_x = (isPolygon ? shape._max_x : body_x + radius) + padding;
    const body_max_y = (isPolygon ? shape._max_y : body_y + radius) + padding;

    // eslint-disable-next-line no-param-reassign
    shape._bvh_min_x = body_min_x;
    // eslint-disable-next-line no-param-reassign
    shape._bvh_min_y = body_min_y;
    // eslint-disable-next-line no-param-reassign
    shape._bvh_max_x = body_max_x;
    // eslint-disable-next-line no-param-reassign
    shape._bvh_max_y = body_max_y;

    let current = this._hierarchy!;
    let sort = 0;

    if (!current) {
      this._hierarchy = shape;

      return;
    }

    // eslint-disable-next-line no-constant-condition
    while (true) {
      // Branch
      sort += 1;
      if (current._bvh_branch) {
        const left = current._bvh_left!;
        const left_min_y = left._bvh_min_y;
        const left_max_x = left._bvh_max_x;
        const left_max_y = left._bvh_max_y;
        const left_new_min_x = body_min_x < left._bvh_min_x ? body_min_x : left._bvh_min_x;
        const left_new_min_y = body_min_y < left_min_y ? body_min_y : left_min_y;
        const left_new_max_x = body_max_x > left_max_x ? body_max_x : left_max_x;
        const left_new_max_y = body_max_y > left_max_y ? body_max_y : left_max_y;
        const left_volume = (left_max_x - left._bvh_min_x) * (left_max_y - left_min_y);
        const left_new_volume =
          (left_new_max_x - left_new_min_x) * (left_new_max_y - left_new_min_y);
        const left_difference = left_new_volume - left_volume;

        const right = current._bvh_right!;
        const right_min_x = right._bvh_min_x;
        const right_min_y = right._bvh_min_y;
        const right_max_x = right._bvh_max_x;
        const right_max_y = right._bvh_max_y;
        const right_new_min_x = body_min_x < right_min_x ? body_min_x : right_min_x;
        const right_new_min_y = body_min_y < right_min_y ? body_min_y : right_min_y;
        const right_new_max_x = body_max_x > right_max_x ? body_max_x : right_max_x;
        const right_new_max_y = body_max_y > right_max_y ? body_max_y : right_max_y;
        const right_volume = (right_max_x - right_min_x) * (right_max_y - right_min_y);
        const right_new_volume =
          (right_new_max_x - right_new_min_x) * (right_new_max_y - right_new_min_y);
        const right_difference = right_new_volume - right_volume;

        current._bvh_sort = sort;
        current._bvh_min_x = left_new_min_x < right_new_min_x ? left_new_min_x : right_new_min_x;
        current._bvh_min_y = left_new_min_y < right_new_min_y ? left_new_min_y : right_new_min_y;
        current._bvh_max_x = left_new_max_x > right_new_max_x ? left_new_max_x : right_new_max_x;
        current._bvh_max_y = left_new_max_y > right_new_max_y ? left_new_max_y : right_new_max_y;

        current = left_difference <= right_difference ? left : right;
      }
      // Leaf
      else {
        const grandparent = current._bvh_parent;
        const parent_min_x = current._bvh_min_x;
        const parent_min_y = current._bvh_min_y;
        const parent_max_x = current._bvh_max_x;
        const parent_max_y = current._bvh_max_y;
        // eslint-disable-next-line no-multi-assign, no-param-reassign
        const new_parent = (current._bvh_parent = shape._bvh_parent = BVHBranch.getBranch());

        new_parent._bvh_parent = grandparent;
        new_parent._bvh_left = current;
        new_parent._bvh_right = shape;
        new_parent._bvh_sort = sort;
        new_parent._bvh_min_x = body_min_x < parent_min_x ? body_min_x : parent_min_x;
        new_parent._bvh_min_y = body_min_y < parent_min_y ? body_min_y : parent_min_y;
        new_parent._bvh_max_x = body_max_x > parent_max_x ? body_max_x : parent_max_x;
        new_parent._bvh_max_y = body_max_y > parent_max_y ? body_max_y : parent_max_y;

        if (!grandparent) {
          this._hierarchy = new_parent;
        } else if (grandparent._bvh_left === current) {
          grandparent._bvh_left = new_parent;
        } else {
          grandparent._bvh_right = new_parent;
        }

        break;
      }
    }
  }

  remove(shape: Shape, updating = false): void {
    if (!updating) {
      this._bodies.splice(this._bodies.indexOf(shape), 1);
    }

    if (this._hierarchy === shape) {
      this._hierarchy = undefined;

      return;
    }

    const parent = shape._bvh_parent!;
    const grandparent = parent._bvh_parent;
    const parent_left = parent._bvh_left;
    const sibling = (parent_left === shape ? parent._bvh_right : parent_left)!;

    sibling._bvh_parent = grandparent;

    if (sibling._bvh_branch) {
      sibling._bvh_sort = parent._bvh_sort;
    }

    if (grandparent) {
      if (grandparent._bvh_left === parent) {
        grandparent._bvh_left = sibling;
      } else {
        grandparent._bvh_right = sibling;
      }

      let branch = grandparent;

      while (branch) {
        const left = branch._bvh_left!;
        const left_min_x = left._bvh_min_x;
        const left_min_y = left._bvh_min_y;
        const left_max_x = left._bvh_max_x;
        const left_max_y = left._bvh_max_y;

        const right = branch._bvh_right!;
        const right_min_x = right._bvh_min_x;
        const right_min_y = right._bvh_min_y;
        const right_max_x = right._bvh_max_x;
        const right_max_y = right._bvh_max_y;

        branch._bvh_min_x = left_min_x < right_min_x ? left_min_x : right_min_x;
        branch._bvh_min_y = left_min_y < right_min_y ? left_min_y : right_min_y;
        branch._bvh_max_x = left_max_x > right_max_x ? left_max_x : right_max_x;
        branch._bvh_max_y = left_max_y > right_max_y ? left_max_y : right_max_y;

        branch = branch._bvh_parent as BVHBranch;
      }
    } else {
      this._hierarchy = sibling;
    }

    BVHBranch.releaseBranch(parent);
  }

  // Updates the BVH. Moved bodies are removed/inserted.
  update(): void {
    const bodies = this._bodies;
    const count = bodies.length;

    for (let i = 0; i < count; ++i) {
      const body = bodies[i];

      let update = false;

      if (!update && body.padding !== body._bvh_padding) {
        body._bvh_padding = body.padding;
        update = true;
      }

      if (!update) {
        const polygon = body._polygon;

        if (
          polygon &&
          (body._dirty_coords ||
            body.x !== body._x ||
            body.y !== body._y ||
            body.angle !== body._angle ||
            body.scale_x !== body._scale_x ||
            body.scale_y !== body._scale_y)
        ) {
          body._calculateCoords();
        }

        const { x } = body;
        const { y } = body;
        const radius = polygon ? 0 : body.radius * body.scale;
        const min_x = polygon ? body._min_x : x - radius;
        const min_y = polygon ? body._min_y : y - radius;
        const max_x = polygon ? body._max_x : x + radius;
        const max_y = polygon ? body._max_y : y + radius;

        update =
          min_x < body._bvh_min_x ||
          min_y < body._bvh_min_y ||
          max_x > body._bvh_max_x ||
          max_y > body._bvh_max_y;
      }

      if (update) {
        this.remove(body, true);
        this.insert(body, true);
      }
    }
  }

  // Returns a list of potential collisions for a body
  potentials(body: Shape): Shape[] {
    const shapes: Shape[] = [];
    const min_x = body._bvh_min_x;
    const min_y = body._bvh_min_y;
    const max_x = body._bvh_max_x;
    const max_y = body._bvh_max_y;

    let current = this._hierarchy;
    let traverse_left = true;

    if (!current || !current._bvh_branch) {
      return shapes;
    }

    while (current) {
      if (traverse_left) {
        traverse_left = false;

        let left = current._bvh_branch ? current._bvh_left : undefined;

        while (
          left &&
          left._bvh_max_x >= min_x &&
          left._bvh_max_y >= min_y &&
          left._bvh_min_x <= max_x &&
          left._bvh_min_y <= max_y
        ) {
          current = left;
          left = current!._bvh_branch ? current!._bvh_left : undefined;
        }
      }

      const isBranch = current!._bvh_branch;
      const right = isBranch ? current!._bvh_right : undefined;

      if (
        right &&
        right._bvh_max_x > min_x &&
        right._bvh_max_y > min_y &&
        right._bvh_min_x < max_x &&
        right._bvh_min_y < max_y
      ) {
        current = right;
        traverse_left = true;
      } else {
        if (!isBranch && current !== body) {
          shapes.push(current as Shape);
        }

        let parent = current!._bvh_parent;

        if (parent) {
          while (parent && parent._bvh_right === current) {
            current = parent;
            parent = current._bvh_parent;
          }

          current = parent;
        } else {
          break;
        }
      }
    }

    return shapes;
  }

  // Draws the bodies within the BVH to a CanvasRenderingContext2D's current path
  draw(context: PIXI.Graphics): void {
    const bodies = this._bodies;
    const count = bodies.length;

    for (let i = 0; i < count; ++i) {
      bodies[i].draw(context);
    }
  }
}
