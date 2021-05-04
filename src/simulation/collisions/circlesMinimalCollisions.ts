import * as PIXI from 'pixi.js';

interface VolumeAABBType {
  id: number;
  radius: number;
  parent: VolumeAABBType | CircleMinimal | undefined;
  right: VolumeAABBType | CircleMinimal | undefined;
  left: VolumeAABBType | CircleMinimal | undefined;
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
}

export class CircleMinimal {
  id: number;
  x: number;
  y: number;
  radius: number;
  scale: number;
  tag: number;
  parent: VolumeAABBType | CircleMinimal | undefined;
  right: VolumeAABBType | CircleMinimal | undefined;
  left: VolumeAABBType | CircleMinimal | undefined;
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;

  constructor(id = 0, x = 0, y = 0, radius = 1, scale = 1, tag = 0) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.scale = scale;
    this.tag = tag;
    this.parent = undefined;
    this.right = undefined;
    this.left = undefined;
    this.xMin = 0;
    this.yMin = 0;
    this.xMax = 0;
    this.yMax = 0;
  }

  draw(context: PIXI.Graphics): void {
    const { x, y, radius: radiusWithoutScale, scale } = this;
    const radius = radiusWithoutScale * scale;
    context.moveTo(x + radius, y);
    context.drawCircle(x, y, radius);
  }
}

type setupReturnType = {
  insert: (circle: CircleMinimal, updating?: boolean) => void;
  remove: (circle: CircleMinimal, updating?: boolean) => void;
  getPotentials: (body: CircleMinimal) => CircleMinimal[];
  update: () => void;
  areCirclesColliding: (a: CircleMinimal, b: CircleMinimal) => boolean;
};

export function setupCircleMinimalCollisions(): setupReturnType {
  const bodies: CircleMinimal[] = [];
  const branchPool: VolumeAABBType[] = [];
  const { min, max } = Math;
  let root: VolumeAABBType | undefined;

  // Inserts a body into the BVH
  function insert(circle: CircleMinimal, updating = false): void {
    if (!updating) {
      bodies.push(circle);
    }

    const { x, y, radius } = circle;
    const body_min_x = x - radius;
    const body_min_y = y - radius;
    const body_max_x = x + radius;
    const body_max_y = y + radius;

    circle.xMin = body_min_x;
    circle.yMin = body_min_y;
    circle.xMax = body_max_x;
    circle.yMax = body_max_y;

    if (!root) {
      root = circle;

      return;
    }

    let current = root;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      /** is of BranchType */
      if (current.radius < 0) {
        const left = current.left!;
        /** Get left AABB */
        const { xMin: left_min_x, yMin: left_min_y, xMax: left_max_x, yMax: left_max_y } = left;

        /** Simulate new left AABB by extending it with newCircle AABB */
        const left_new_min_x = min(body_min_x, left_min_x);
        const left_new_min_y = min(body_min_y, left_min_y);
        const left_new_max_x = max(body_max_x, left_max_x);
        const left_new_max_y = max(body_max_y, left_max_y);

        const left_volume = (left_max_x - left_min_x) * (left_max_y - left_min_y);
        const left_new_volume =
          (left_new_max_x - left_new_min_x) * (left_new_max_y - left_new_min_y);
        const left_difference = left_new_volume - left_volume;

        /** Get right AABB */
        const right = current.right!;
        const {
          xMin: right_min_x,
          yMin: right_min_y,
          xMax: right_max_x,
          yMax: right_max_y,
        } = right;

        /** Simulate new right AABB by extending it with newCircle AABB */
        const right_new_min_x = min(body_min_x, right_min_x);
        const right_new_min_y = min(body_min_y, right_min_y);
        const right_new_max_x = max(body_max_x, right_max_x);
        const right_new_max_y = max(body_max_y, right_max_y);

        const right_volume = (right_max_x - right_min_x) * (right_max_y - right_min_y);
        const right_new_volume =
          (right_new_max_x - right_new_min_x) * (right_new_max_y - right_new_min_y);
        const right_difference = right_new_volume - right_volume;

        current.xMin = min(left_new_min_x, right_new_min_x);
        current.yMin = min(left_new_min_y, right_new_min_y);
        current.xMax = max(left_new_max_x, right_new_max_x);
        current.yMax = max(left_new_max_y, right_new_max_y);

        current = left_difference <= right_difference ? left : right;
      }
      // Leaf
      else {
        const grandparent = current.parent;
        const {
          xMin: parent_min_x,
          yMin: parent_min_y,
          xMax: parent_max_x,
          yMax: parent_max_y,
        } = current;
        const new_parent =
          branchPool.length > 0
            ? branchPool.pop()!
            : /* prettier-ignore */ {
              id: -9,
              radius: -1,
              parent: undefined,
              left: undefined,
              right: undefined,
              xMin: 0,
              yMin: 0,
              xMax: 0,
              yMax: 0,
              isBranch: true,
            };
        current.parent = new_parent;
        circle.parent = new_parent;

        new_parent.left = current;
        new_parent.right = circle;
        new_parent.parent = grandparent;
        new_parent.xMin = min(body_min_x, parent_min_x);
        new_parent.yMin = min(body_min_y, parent_min_y);
        new_parent.xMax = max(body_max_x, parent_max_x);
        new_parent.yMax = max(body_max_y, parent_max_y);

        if (!grandparent) {
          root = new_parent;
        } else if (grandparent.left === current) {
          grandparent.left = new_parent;
        } else {
          grandparent.right = new_parent;
        }

        break;
      }
    }
  }

  function remove(circle: CircleMinimal, updating = false): void {
    if (root && root.id === circle.id) {
      return;
    }

    if (!updating) {
      bodies.splice(bodies.indexOf(circle), 1);
    }

    const { parent } = circle;
    const grandparent = parent!.parent;
    const parent_left = parent!.left;
    const sibling = (parent_left === circle ? parent!.right : parent_left)!;

    sibling.parent = grandparent;

    if (grandparent) {
      if (grandparent.left === parent) {
        grandparent.left = sibling;
      } else {
        grandparent.right = sibling;
      }

      let branch = grandparent;

      while (branch) {
        const {
          xMin: left_min_x,
          yMin: left_min_y,
          xMax: left_max_x,
          yMax: left_max_y,
        } = branch.left!;

        const {
          xMin: right_min_x,
          yMin: right_min_y,
          xMax: right_max_x,
          yMax: right_max_y,
        } = branch.right!;

        branch.xMin = min(left_min_x, right_min_x);
        branch.yMin = min(left_min_y, right_min_y);
        branch.xMax = max(left_max_x, right_max_x);
        branch.yMax = max(left_max_y, right_max_y);

        branch = branch.parent as CircleMinimal;
      }
    } else {
      root = sibling;
    }

    branchPool.push(parent!);
  }

  // Updates the BVH. Moved bodies are removed/inserted.
  function update(): void {
    const count = bodies.length;

    let i = 0;
    for (i = 0; i < count; ++i) {
      const body = bodies[i];
      const { x, y, radius } = body as CircleMinimal;

      if (
        x - radius < body.xMin ||
        y - radius < body.yMin ||
        x + radius > body.xMax ||
        y + radius > body.yMax
      ) {
        remove(body, true);
        insert(body, true);
      }
    }
  }

  // Returns a list of potential collisions for a body
  function getPotentials(circle: CircleMinimal): CircleMinimal[] {
    const potentials: CircleMinimal[] = [];
    const { xMin: min_x, yMin: min_y, xMax: max_x, yMax: max_y } = circle;

    let current = root;
    if (!current || current.radius < 0 /** is of BranchType */) {
      return potentials;
    }

    let traverse_left = true;
    while (current) {
      if (traverse_left) {
        traverse_left = false;

        let left = current.radius < 0 /** is of BranchType */ ? current.left : undefined;

        while (
          left &&
          left.xMax >= min_x &&
          left.yMax >= min_y &&
          left.xMin <= max_x &&
          left.yMin <= max_y
        ) {
          current = left;
          left = current!.radius < 0 /** is of BranchType */ ? current!.left : undefined;
        }
      }

      const isBranch = current.radius < 0;
      const right = isBranch ? current!.right : undefined;

      if (
        right &&
        right.xMax > min_x &&
        right.yMax > min_y &&
        right.xMin < max_x &&
        right.yMin < max_y
      ) {
        current = right;
        traverse_left = true;
      } else {
        if (!isBranch && current.id !== circle.id) {
          potentials.push(current as CircleMinimal);
        }

        let { parent } = current!;

        if (parent) {
          while (parent && parent.right === current) {
            current = parent;
            parent = current.parent;
          }

          current = parent!;
        } else {
          break;
        }
      }
    }

    return potentials;
  }

  function areCirclesColliding(a: CircleMinimal, b: CircleMinimal): boolean {
    /** Stage 1: AABB test step by step */
    const { x: xA, y: yA, radius: radiusA, scale: scaleA } = a;
    const radiusAScaled = radiusA * scaleA;
    const a_min_x = xA - radiusAScaled;
    const a_min_y = yA - radiusAScaled;
    const a_max_x = xA + radiusAScaled;
    const a_max_y = yA + radiusAScaled;

    const { x: xB, y: yB, radius: radiusB, scale: scaleB } = b;
    const radiusBScaled = radiusB * scaleB;
    const b_min_x = xB - radiusBScaled;
    const b_min_y = yB - radiusBScaled;
    const b_max_x = xB + radiusBScaled;
    const b_max_y = yB + radiusBScaled;

    if (a_min_x > b_max_x) return false;
    if (a_min_y > b_max_y) return false;
    if (a_max_x < b_min_x) return false;
    if (a_max_y < b_min_y) return false;

    /** Stage 2: circle vs circle collision/overlap detection */
    const difference_x = xB - xA;
    const difference_y = yB - yA;
    const radius_sum = radiusAScaled + radiusBScaled;
    const length_squared = difference_x * difference_x + difference_y * difference_y;

    if (length_squared > radius_sum * radius_sum) {
      return false;
    }

    return true;
  }

  return { insert, remove, update, getPotentials, areCirclesColliding };
}
