const branchPool: CircleMinimal[] = [];

export class CircleMinimal {
  id: number;
  x: number;
  y: number;
  radius: number;
  scale: number;
  tag: number;
  _bvh_parent: CircleMinimal | undefined;
  _bvh_branch: boolean;
  _bvh_left: CircleMinimal | undefined;
  _bvh_right: CircleMinimal | undefined;
  _bvh_sort: number;
  _bvh_min_x: number;
  _bvh_min_y: number;
  _bvh_max_x: number;
  _bvh_max_y: number;

  constructor(id = 0, x = 0, y = 0, radius = 1, scale = 1, tag = 0, isBranch = false) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.scale = scale;
    this.tag = tag;
    this._bvh_parent = undefined;
    this._bvh_branch = isBranch;
    this._bvh_left = undefined;
    this._bvh_right = undefined;
    this._bvh_sort = 0;
    this._bvh_min_x = 0;
    this._bvh_min_y = 0;
    this._bvh_max_x = 0;
    this._bvh_max_y = 0;
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
  let hierarchy: CircleMinimal | undefined;

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

    circle._bvh_min_x = body_min_x;
    circle._bvh_min_y = body_min_y;
    circle._bvh_max_x = body_max_x;
    circle._bvh_max_y = body_max_y;

    let current = hierarchy!;
    let sort = 0;

    if (!current) {
      hierarchy = circle;

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
        // eslint-disable-next-line no-multi-assign
        const new_parent = (current._bvh_parent = circle._bvh_parent =
          branchPool.length > 0 ? branchPool.pop()! : new CircleMinimal(0, 0, 0, 0, 0, 0, true));

        new_parent._bvh_parent = grandparent;
        new_parent._bvh_left = current;
        new_parent._bvh_right = circle;
        new_parent._bvh_sort = sort;
        new_parent._bvh_min_x = body_min_x < parent_min_x ? body_min_x : parent_min_x;
        new_parent._bvh_min_y = body_min_y < parent_min_y ? body_min_y : parent_min_y;
        new_parent._bvh_max_x = body_max_x > parent_max_x ? body_max_x : parent_max_x;
        new_parent._bvh_max_y = body_max_y > parent_max_y ? body_max_y : parent_max_y;

        if (!grandparent) {
          hierarchy = new_parent;
        } else if (grandparent._bvh_left === current) {
          grandparent._bvh_left = new_parent;
        } else {
          grandparent._bvh_right = new_parent;
        }

        break;
      }
    }
  }

  function remove(circle: CircleMinimal, updating = false): void {
    if (!updating) {
      bodies.splice(bodies.indexOf(circle), 1);
    }

    if (hierarchy === circle) {
      hierarchy = undefined;

      return;
    }

    const parent = circle._bvh_parent!;
    const grandparent = parent._bvh_parent;
    const parent_left = parent._bvh_left;
    const sibling = (parent_left === circle ? parent._bvh_right : parent_left)!;

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

        branch = branch._bvh_parent as CircleMinimal;
      }
    } else {
      hierarchy = sibling;
    }

    branchPool.push(parent);
  }

  // Updates the BVH. Moved bodies are removed/inserted.
  function update(): void {
    const count = bodies.length;

    for (let i = 0; i < count; ++i) {
      const body = bodies[i];
      const { x, y, radius } = body;

      if (
        x - radius < body._bvh_min_x ||
        y - radius < body._bvh_min_y ||
        x + radius > body._bvh_max_x ||
        y + radius > body._bvh_max_y
      ) {
        remove(body, true);
        insert(body, true);
      }
    }
  }

  // Returns a list of potential collisions for a body
  function getPotentials(body: CircleMinimal): CircleMinimal[] {
    const shapes: CircleMinimal[] = [];
    const min_x = body._bvh_min_x;
    const min_y = body._bvh_min_y;
    const max_x = body._bvh_max_x;
    const max_y = body._bvh_max_y;

    let current = hierarchy;
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
          shapes.push(current as CircleMinimal);
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

  function areCirclesColliding(a: CircleMinimal, b: CircleMinimal): boolean {
    /** Stage 1: step, by step AABB test */
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
