import * as PIXI from 'pixi.js';

export class CirclesBVHMinimalCollisions {
  readonly bodiesMaxCount: number;
  readonly branchesMaxCount: number;
  readonly avilableNodeBranches: number[] = [];
  readonly bodies: number[][] = [];
  readonly branches: number[][] = [];
  lastNodeBranchIndex = 0;
  rootBranch: number[] = [];
  longitudes: Float32Array;
  latitudes: Float32Array;
  radius: number;

  readonly brachIndexes = {
    idIndex: 0,
    isLeafIndex: 1,
    AABB_leftIndex: 2,
    AABB_topIndex: 3,
    AABB_rightIndex: 4,
    AABB_bottomIndex: 5,
    parentIdIndex: 6,
    rightIdIndex: 7,
    leftIdIndex: 8,
  };

  constructor(bodiesMaxCount: number, defaultRadius: number) {
    this.bodiesMaxCount = bodiesMaxCount;
    this.branchesMaxCount = bodiesMaxCount * 2 - 1;
    this.bodies.length = bodiesMaxCount;
    this.branches.length = this.branchesMaxCount;

    this.longitudes = new Float32Array(bodiesMaxCount);
    this.longitudes.fill(0);
    this.latitudes = new Float32Array(bodiesMaxCount);
    this.latitudes.fill(0);

    this.lastNodeBranchIndex = bodiesMaxCount;
    this.radius = defaultRadius;
  }

  public initialiseBodies(outOfBoundsDistance = 9999): void {
    const { radius } = this;
    const initLabel = 'CirclesBVHMinimalCollisions bodies init time';
    // eslint-disable-next-line no-console
    console.time(initLabel);
    /**
     * Pre-initialise all circles and put them
     * outside of the world bounds.
     */
    let index = 0;
    const highNumber = outOfBoundsDistance;
    const { bodiesMaxCount } = this;
    for (index; index < bodiesMaxCount; index++) {
      // prettier-ignore
      const circle = [index];
      this.bodies[index] = circle;
      const distance = highNumber + (radius + 1) * index;
      /** x */
      this.longitudes[index] = distance;
      /** y */
      this.latitudes[index] = distance;
      this.branches[index] = [index, 1, -1, -1, -1, -1, -1, -1, -1];
      this.insert(index);
    }
    // eslint-disable-next-line no-console
    console.timeEnd(initLabel);
  }

  /** Inserts a body into the BVH */
  public insert(id = 0): void {
    // console.time('Insert');
    const { radius } = this;
    const x = this.longitudes[id];
    const y = this.latitudes[id];
    const xMin = x - radius;
    const yMin = y - radius;
    const xMax = x + radius;
    const yMax = y + radius;

    const { AABB_leftIndex, AABB_topIndex, AABB_rightIndex, AABB_bottomIndex } = this.brachIndexes;
    const branch = this.branches[id];
    branch[AABB_leftIndex] = xMin;
    branch[AABB_topIndex] = yMin;
    branch[AABB_rightIndex] = xMax;
    branch[AABB_bottomIndex] = yMax;

    if (this.rootBranch.length === 0) {
      this.rootBranch = branch;

      return;
    }

    let current = this.rootBranch;
    const { idIndex, isLeafIndex, parentIdIndex, rightIdIndex, leftIdIndex } = this.brachIndexes;
    const { branches } = this;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      /** is of BranchType */
      if (current[isLeafIndex] === 0) {
        const left = branches[current[leftIdIndex]];
        /** Get left AABB */
        const xMinLeft = left[AABB_leftIndex];
        const yMinLeft = left[AABB_topIndex];
        const xMaxLeft = left[AABB_rightIndex];
        const yMaxLeft = left[AABB_bottomIndex];

        /** Simulate new left AABB by extending it with newCircle AABB */
        const left_new_min_x = Math.min(xMin, xMinLeft);
        const left_new_min_y = Math.min(yMin, yMinLeft);
        const left_new_max_x = Math.max(xMax, xMaxLeft);
        const left_new_max_y = Math.max(yMax, yMaxLeft);

        const left_volume = (xMaxLeft - xMinLeft) * (yMaxLeft - yMinLeft);
        const left_new_volume =
          (left_new_max_x - left_new_min_x) * (left_new_max_y - left_new_min_y);
        const left_difference = left_new_volume - left_volume;

        /** Get right AABB */
        const right = branches[current[rightIdIndex]];
        const xMinRight = right[AABB_leftIndex];
        const yMinRight = right[AABB_topIndex];
        const xMaxRight = right[AABB_rightIndex];
        const yMaxRight = right[AABB_bottomIndex];

        /** Simulate new right AABB by extending it with newCircle AABB */
        const right_new_min_x = Math.min(xMin, xMinRight);
        const right_new_min_y = Math.min(yMin, yMinRight);
        const right_new_max_x = Math.max(xMax, xMaxRight);
        const right_new_max_y = Math.max(yMax, yMaxRight);

        const right_volume = (xMaxRight - xMinRight) * (yMaxRight - yMinRight);
        const right_new_volume =
          (right_new_max_x - right_new_min_x) * (right_new_max_y - right_new_min_y);
        const right_difference = right_new_volume - right_volume;

        current[AABB_leftIndex] = Math.min(left_new_min_x, right_new_min_x);
        current[AABB_topIndex] = Math.min(left_new_min_y, right_new_min_y);
        current[AABB_rightIndex] = Math.max(left_new_max_x, right_new_max_x);
        current[AABB_bottomIndex] = Math.max(left_new_max_y, right_new_max_y);

        current = left_difference <= right_difference ? left : right;
      }
      // Leaf
      else {
        const parentId = current[parentIdIndex];
        const grandparent = branches[parentId] ?? [];
        const parent_min_x = current[AABB_leftIndex];
        const parent_min_y = current[AABB_topIndex];
        const parent_max_x = current[AABB_rightIndex];
        const parent_max_y = current[AABB_bottomIndex];
        const newParentId = this.avilableNodeBranches.pop() ?? this.lastNodeBranchIndex++;
        if (this.lastNodeBranchIndex >= this.branchesMaxCount)
          this.lastNodeBranchIndex = this.bodiesMaxCount;
        const newParent = [
          newParentId,
          0,
          Math.min(xMin, parent_min_x),
          Math.min(yMin, parent_min_y),
          Math.max(xMax, parent_max_x),
          Math.max(yMax, parent_max_y),
          parentId > -1 ? grandparent[idIndex] : -1,
          branch[idIndex],
          current[idIndex],
        ];
        branches[newParentId] = newParent;
        current[parentIdIndex] = newParentId;
        branch[parentIdIndex] = newParentId;

        if (grandparent.length === 0) {
          this.rootBranch = newParent;
        } else if (grandparent[leftIdIndex] === current[idIndex]) {
          grandparent[leftIdIndex] = newParentId;
        } else {
          grandparent[rightIdIndex] = newParentId;
        }

        break;
      }
    }
    // console.timeEnd('Insert');
  }

  public remove(id = 0): void {
    const branch = this.branches[id];
    const {
      idIndex,
      AABB_leftIndex,
      AABB_topIndex,
      AABB_rightIndex,
      AABB_bottomIndex,
      parentIdIndex,
      rightIdIndex,
      leftIdIndex,
    } = this.brachIndexes;
    /** Don't remove root body/branch */
    if (this.rootBranch.length > 0 && this.rootBranch[idIndex] === id) {
      this.rootBranch = [];

      return;
    }

    /**
     * Get sibling of the branch being removed
     * and make it sibling of the parent (child
     * of grandparent)
     */
    const parentId = branch[parentIdIndex];
    const parent = this.branches[parentId];
    const grandparent = this.branches[parent[parentIdIndex]] ?? [];
    const parentLeftId = parent[leftIdIndex];
    const parentLeft = this.branches[parentLeftId] ?? [];
    const sibling = parentLeftId === id ? this.branches[parent[rightIdIndex]] : parentLeft;

    sibling[parentIdIndex] = grandparent[idIndex];

    if (grandparent.length > 0) {
      if (grandparent[leftIdIndex] === parentId) {
        grandparent[leftIdIndex] = sibling[idIndex];
      } else {
        grandparent[rightIdIndex] = sibling[idIndex];
      }

      let tempBranch = grandparent;

      /**
       * For grandparent that has now new child
       * compute new AABB and traverse upt the tree
       * up to the root and do the same at each step.
       */
      while (tempBranch && tempBranch[leftIdIndex] > -1 && grandparent[rightIdIndex] > -1) {
        const left = this.branches[tempBranch[leftIdIndex]];
        /** Get left AABB */
        const xMinLeft = left[AABB_leftIndex];
        const yMinLeft = left[AABB_topIndex];
        const xMaxLeft = left[AABB_rightIndex];
        const yMaxLeft = left[AABB_bottomIndex];

        /** Get right AABB */
        const right = this.branches[tempBranch[rightIdIndex]];
        const xMinRight = right[AABB_leftIndex];
        const yMinRight = right[AABB_topIndex];
        const xMaxRight = right[AABB_rightIndex];
        const yMaxRight = right[AABB_bottomIndex];

        tempBranch[AABB_leftIndex] = Math.min(xMinLeft, xMinRight);
        tempBranch[AABB_topIndex] = Math.min(yMinLeft, yMinRight);
        tempBranch[AABB_rightIndex] = Math.max(xMaxLeft, xMaxRight);
        tempBranch[AABB_bottomIndex] = Math.max(yMaxLeft, yMaxRight);

        tempBranch = this.branches[tempBranch[parentIdIndex]];
      }
    } else {
      this.rootBranch = sibling;
    }

    this.avilableNodeBranches.push(parentId);
  }

  /** Returns a list of potential collisions for a body */
  public getPotentials(id = 0): number[][] {
    const potentials: number[][] = [];
    const {
      idIndex,
      isLeafIndex,
      AABB_leftIndex,
      AABB_topIndex,
      AABB_rightIndex,
      AABB_bottomIndex,
      parentIdIndex,
      rightIdIndex,
      leftIdIndex,
    } = this.brachIndexes;
    if (this.rootBranch.length === 0 || this.rootBranch[isLeafIndex] === 1) {
      return potentials;
    }

    const branch = this.branches[id];
    const xMin = branch[AABB_leftIndex];
    const yMin = branch[AABB_topIndex];
    const xMax = branch[AABB_rightIndex];
    const yMax = branch[AABB_bottomIndex];

    let current = this.rootBranch;
    let traverse_left = true;
    while (current.length > 0) {
      if (traverse_left) {
        traverse_left = false;

        let left = current[isLeafIndex] === 0 ? this.branches[current[leftIdIndex]] : [];

        while (
          left.length > 0 &&
          left[AABB_rightIndex] >= xMin &&
          left[AABB_bottomIndex] >= yMin &&
          left[AABB_leftIndex] <= xMax &&
          left[AABB_topIndex] <= yMax
        ) {
          current = left;
          left = current[isLeafIndex] === 0 ? this.branches[current[leftIdIndex]] : [];
        }
      }

      const isLeaf = current[isLeafIndex] === 1;
      const right = isLeaf ? [] : this.branches[current[rightIdIndex]];

      if (
        right.length > 0 &&
        right[AABB_rightIndex] > xMin &&
        right[AABB_bottomIndex] > yMin &&
        right[AABB_leftIndex] < xMax &&
        right[AABB_topIndex] < yMax
      ) {
        current = right;
        traverse_left = true;
      } else {
        if (isLeaf && current[idIndex] !== id) {
          potentials.push(this.bodies[current[idIndex]]);
        }

        if (current[parentIdIndex] > -1) {
          let parent = this.branches[current[parentIdIndex]] ?? [];
          while (parent.length > 0 && parent[rightIdIndex] === current[idIndex]) {
            current = parent;
            parent = this.branches[current[parentIdIndex]] ?? [];
          }

          current = parent;
        } else {
          break;
        }
      }
    }

    return potentials;
  }

  public areCirclesOverlapping(
    aID: number,
    bID: number,
    radiusA = this.radius,
    radiusB = this.radius,
  ): boolean {
    /** Stage 1: AABB test step by step */
    const xA = this.longitudes[aID];
    const yA = this.latitudes[aID];
    const a_min_x = xA - radiusA;
    const a_min_y = yA - radiusA;
    const a_max_x = xA + radiusA;
    const a_max_y = yA + radiusA;

    const xB = this.longitudes[bID];
    const yB = this.latitudes[bID];
    const b_min_x = xB - radiusB;
    const b_min_y = yB - radiusB;
    const b_max_x = xB + radiusB;
    const b_max_y = yB + radiusB;

    if (a_min_x > b_max_x) return false;
    if (a_min_y > b_max_y) return false;
    if (a_max_x < b_min_x) return false;
    if (a_max_y < b_min_y) return false;

    /** Stage 2: circle vs circle collision/overlap detection */
    const difference_x = xB - xA;
    const difference_y = yB - yA;
    const radius_sum = radiusA + radiusB;
    const length_squared = difference_x * difference_x + difference_y * difference_y;

    if (Math.abs(length_squared) > radius_sum * radius_sum) {
      return false;
    }

    return true;
  }

  drawShapes(context: PIXI.Graphics): void {
    this.bodies.forEach((body: number[]): void => {
      const { radius } = this;
      const id = body[0];
      const x = this.longitudes[id];
      const y = this.latitudes[id];
      context.drawCircle(x, y, radius);
    });
  }
}
