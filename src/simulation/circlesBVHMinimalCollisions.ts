import { doNTimes } from 'utils/do-n-times';

export class CirclesBVHMinimalCollisions {
  avilableNodeBranches: number[] = [];
  bodies: number[][] = [];
  branches: number[][] = [];
  lastNodeBranchIndex = 0;
  rootBranch: number[] = [];

  brachIndexes = {
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

  pheromoneBodyIndexes = {
    idIndex: 0,
    xIndex: 1,
    yIndex: 2,
    radiusIndex: 3,
    tagIndex: 4,
  };

  constructor(bodiesMaxCount: number) {
    this.bodies.length = bodiesMaxCount;
    this.branches.length = 2 * bodiesMaxCount - 1;
    this.lastNodeBranchIndex = bodiesMaxCount;

    /** Pre-initialise all circles. */
    doNTimes((index: number): void => {
      // prettier-ignore
      const circle = [
        index,      /* 0: id     */
        -2 * index, /* 1: x      */
        -2 * index, /* 2: y      */
        1,          /* 3: radius */
        0,          /* 4: tag    */
      ];
      this.bodies[index] = circle;
      this.insert(circle);
    }, bodiesMaxCount);
  }

  /** Inserts a body into the BVH */
  insert(body: number[]): void {
    const [id, x, y, radius] = body;
    const xMin = x - radius;
    const yMin = y - radius;
    const xMax = x + radius;
    const yMax = y + radius;
    const { branches } = this;

    /**
     * Create branch node that will represent the body in the tree.
     * Its id should be the same as the id of the body it represents.
     */
    const newBranch = [id, 1, xMin, yMin, xMax, yMax, -1, -1, -1];
    branches[id] = newBranch;

    if (this.rootBranch.length === 0) {
      this.rootBranch = newBranch;

      return;
    }

    let current = this.rootBranch;
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
        const newParentId = this.avilableNodeBranches.pop() ?? this.lastNodeBranchIndex;
        this.lastNodeBranchIndex++;
        const newParent = [
          newParentId,
          0,
          Math.min(xMin, parent_min_x),
          Math.min(yMin, parent_min_y),
          Math.max(xMax, parent_max_x),
          Math.max(yMax, parent_max_y),
          parentId > -1 ? grandparent[idIndex] : -1,
          newBranch[idIndex],
          current[idIndex],
        ];
        branches[newParentId] = newParent;
        current[parentIdIndex] = newParentId;
        newBranch[parentIdIndex] = newParentId;

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
  }

  remove(body: number[]): void {
    const [id] = body;
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

  /**
   * Performs remove and insert operations
   * but with minor changes/optimisations.
   * Other than that it's just copy/paste
   * of the above insert and remove methods.
   */
  update(body: number[]): void {
    const [id, x, y, radius] = body;
    const branch = this.branches[id];
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
    let parentId = branch[parentIdIndex];
    let grandparent: number[] = [];

    /** 1. Remove body from hierarchy */
    /** Don't remove root body/branch */
    if (this.rootBranch.length > 0 && this.rootBranch[idIndex] === id) {
      this.rootBranch = [];
    } else {
      const parent = this.branches[parentId];
      grandparent = this.branches[parent[parentIdIndex]] ?? [];
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
    }

    /** 2. Insert body back into hierarchy */

    const xMin = x - radius;
    const yMin = y - radius;
    const xMax = x + radius;
    const yMax = y + radius;
    const newBranch = [id, 1, xMin, yMin, xMax, yMax, -1, -1, -1];
    this.branches[id] = newBranch;

    if (this.rootBranch.length === 0) {
      this.rootBranch = newBranch;

      return;
    }

    let current = this.rootBranch;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      /** is of BranchType */
      if (current[isLeafIndex] === 0) {
        const left = this.branches[current[leftIdIndex]];
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
        const right = this.branches[current[rightIdIndex]];
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
        const newParentId = parentId;
        parentId = current[parentIdIndex];
        grandparent = this.branches[parentId] ?? [];
        const parent_min_x = current[AABB_leftIndex];
        const parent_min_y = current[AABB_topIndex];
        const parent_max_x = current[AABB_rightIndex];
        const parent_max_y = current[AABB_bottomIndex];
        const newParent = [
          newParentId,
          0,
          Math.min(xMin, parent_min_x),
          Math.min(yMin, parent_min_y),
          Math.max(xMax, parent_max_x),
          Math.max(yMax, parent_max_y),
          parentId > -1 ? grandparent[idIndex] : -1,
          newBranch[idIndex],
          current[idIndex],
        ];
        this.branches[newParentId] = newParent;
        current[parentIdIndex] = newParentId;
        newBranch[parentIdIndex] = newParentId;

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
  }

  /** Returns a list of potential collisions for a body */
  getPotentials(body: number[]): number[][] {
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

    const [id] = body;
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

  areCirclesOverlapping(a: number[], b: number[]): boolean {
    /** Stage 1: AABB test step by step */
    const [, xA, yA, radiusA] = a;
    const a_min_x = xA - radiusA;
    const a_min_y = yA - radiusA;
    const a_max_x = xA + radiusA;
    const a_max_y = yA + radiusA;

    const [, xB, yB, radiusB] = b;
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
}
