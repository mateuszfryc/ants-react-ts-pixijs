import { doNTimes } from 'utils/do-n-times';

const brachIndexes = {
  isLeafIndex: 1,
  AABB_leftIndex: 2,
  AABB_topIndex: 3,
  AABB_rightIndex: 4,
  AABB_bottomIndex: 5,
  parentIdIndex: 6,
  rightIdIndex: 7,
  leftIdIndex: 8,
};

const pheromoneBodyIndexes = {
  xIndex: 1,
  yIndex: 2,
  radiusIndex: 3,
  scaleIndex: 4,
  tagIndex: 5,
  spawnTimeIndex: 6,
};

type setupCollisionsType = {
  arePheromonesOverlapping: (a: number[], b: number[]) => boolean;
  bodies: number[][];
  branches: number[][];
  getPotentials: (body: number[]) => number[][];
  insert: (body: number[]) => void;
  remove: (body: number[]) => void;
  idIndex: 0;
  brachIndexes: typeof brachIndexes;
  pheromoneBodyIndexes: typeof pheromoneBodyIndexes;
};

export function setupCollisions(bodiesMaxCount: number): setupCollisionsType {
  const { min, max, abs } = Math;
  let bodies: number[][] = [];
  bodies.length = bodiesMaxCount;
  let branches: number[][] = [];
  branches.length = 2 * bodiesMaxCount - 1;
  let avilableNodeBranches: number[] = [];
  let lastNodeBranchIndex = bodiesMaxCount;
  let rootBranch: number[] = [];
  const idIndex = 0;

  // Branch/Leaf
  /* ---------------------*/
  /* 0: id                */
  /* 1: is leaft          */
  /* 2: AABB_left limit   */
  /* 3: AABB_top limit    */
  /* 4: AABB_right limit  */
  /* 5: AABB_bottom limit */
  /* 6: parent id         */
  /* 7: right leaf id     */
  /* 8: left leaf id      */

  // Branch properties indexes
  const {
    isLeafIndex,
    AABB_leftIndex,
    AABB_topIndex,
    AABB_rightIndex,
    AABB_bottomIndex,
    parentIdIndex,
    rightIdIndex,
    leftIdIndex,
  } = brachIndexes;

  // Body::Circle
  /* ------------- */
  /* 0: id         */
  /* 1: x          */
  /* 2: y          */
  /* 3: radius     */
  /* 4: scale      */
  /* 5: tag        */
  /* 6: spawnTime  */

  // Circle properties indexes
  const {
    xIndex,
    yIndex,
    radiusIndex,
    scaleIndex,
    tagIndex,
    spawnTimeIndex,
  } = pheromoneBodyIndexes;

  // Inserts a body into the BVH
  function insert(body: number[]): void {
    const [id, x, y, radius] = body;
    const xMin = x - radius;
    const yMin = y - radius;
    const xMax = x + radius;
    const yMax = y + radius;

    /**
     * Create branch node that will represent the body in the tree.
     * Its id should be the same as the id of the body it represents.
     */
    const newBranch = [id, 1, xMin, yMin, xMax, yMax, -1, -1, -1];
    branches[id] = newBranch;

    if (rootBranch.length === 0) {
      rootBranch = newBranch;

      return;
    }

    let current = rootBranch;

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
        const left_new_min_x = min(xMin, xMinLeft);
        const left_new_min_y = min(yMin, yMinLeft);
        const left_new_max_x = max(xMax, xMaxLeft);
        const left_new_max_y = max(yMax, yMaxLeft);

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
        const right_new_min_x = min(xMin, xMinRight);
        const right_new_min_y = min(yMin, yMinRight);
        const right_new_max_x = max(xMax, xMaxRight);
        const right_new_max_y = max(yMax, yMaxRight);

        const right_volume = (xMaxRight - xMinRight) * (yMaxRight - yMinRight);
        const right_new_volume =
          (right_new_max_x - right_new_min_x) * (right_new_max_y - right_new_min_y);
        const right_difference = right_new_volume - right_volume;

        current[AABB_leftIndex] = min(left_new_min_x, right_new_min_x);
        current[AABB_topIndex] = min(left_new_min_y, right_new_min_y);
        current[AABB_rightIndex] = max(left_new_max_x, right_new_max_x);
        current[AABB_bottomIndex] = max(left_new_max_y, right_new_max_y);

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
        const newParentId = avilableNodeBranches.pop() ?? lastNodeBranchIndex;
        lastNodeBranchIndex++;
        const newParent = [
          newParentId,
          0,
          min(xMin, parent_min_x),
          min(yMin, parent_min_y),
          max(xMax, parent_max_x),
          max(yMax, parent_max_y),
          parentId > -1 ? grandparent[idIndex] : -1,
          newBranch[idIndex],
          current[idIndex],
        ];
        branches[newParentId] = newParent;
        current[parentIdIndex] = newParentId;
        newBranch[parentIdIndex] = newParentId;

        if (grandparent.length === 0) {
          rootBranch = newParent;
        } else if (grandparent[leftIdIndex] === current[idIndex]) {
          grandparent[leftIdIndex] = newParentId;
        } else {
          grandparent[rightIdIndex] = newParentId;
        }

        break;
      }
    }
  }

  function remove(body: number[]): void {
    const [id] = body;
    const branch = branches[id];
    /** Don't remove root body/branch */
    if (rootBranch.length > 0 && rootBranch[idIndex] === id) {
      rootBranch = [];

      return;
    }

    /**
     * Get sibling of the branch being removed
     * and make it sibling of the parent (child
     * of grandparent)
     */
    const parentId = branch[parentIdIndex];
    const parent = branches[parentId];
    const grandparent = branches[parent[parentIdIndex]] ?? [];
    const parentLeftId = parent[leftIdIndex];
    const parentLeft = branches[parentLeftId] ?? [];
    const sibling = parentLeftId === id ? branches[parent[rightIdIndex]] : parentLeft;

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
        const left = branches[tempBranch[leftIdIndex]];
        /** Get left AABB */
        const xMinLeft = left[AABB_leftIndex];
        const yMinLeft = left[AABB_topIndex];
        const xMaxLeft = left[AABB_rightIndex];
        const yMaxLeft = left[AABB_bottomIndex];

        /** Get right AABB */
        const right = branches[tempBranch[rightIdIndex]];
        const xMinRight = right[AABB_leftIndex];
        const yMinRight = right[AABB_topIndex];
        const xMaxRight = right[AABB_rightIndex];
        const yMaxRight = right[AABB_bottomIndex];

        tempBranch[AABB_leftIndex] = min(xMinLeft, xMinRight);
        tempBranch[AABB_topIndex] = min(yMinLeft, yMinRight);
        tempBranch[AABB_rightIndex] = max(xMaxLeft, xMaxRight);
        tempBranch[AABB_bottomIndex] = max(yMaxLeft, yMaxRight);

        tempBranch = branches[tempBranch[parentIdIndex]];
      }
    } else {
      rootBranch = sibling;
    }

    avilableNodeBranches.push(parentId);
  }

  // Returns a list of potential collisions for a body
  function getPotentials(body: number[]): number[][] {
    const potentials: number[][] = [];
    if (rootBranch.length === 0 || rootBranch[isLeafIndex] === 1) {
      return potentials;
    }

    const [id] = body;
    const branch = branches[id];
    const xMin = branch[AABB_leftIndex];
    const yMin = branch[AABB_topIndex];
    const xMax = branch[AABB_rightIndex];
    const yMax = branch[AABB_bottomIndex];

    let current = rootBranch;
    let traverse_left = true;
    while (current.length > 0) {
      if (traverse_left) {
        traverse_left = false;

        let left = current[isLeafIndex] === 0 ? branches[current[leftIdIndex]] : [];

        while (
          left.length > 0 &&
          left[AABB_rightIndex] >= xMin &&
          left[AABB_bottomIndex] >= yMin &&
          left[AABB_leftIndex] <= xMax &&
          left[AABB_topIndex] <= yMax
        ) {
          current = left;
          left = current[isLeafIndex] === 0 ? branches[current[leftIdIndex]] : [];
        }
      }

      const isLeaf = current[isLeafIndex] === 1;
      const right = isLeaf ? [] : branches[current[rightIdIndex]];

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
          potentials.push(bodies[current[idIndex]]);
        }

        if (current[parentIdIndex] > -1) {
          let parent = branches[current[parentIdIndex]] ?? [];
          while (parent.length > 0 && parent[rightIdIndex] === current[idIndex]) {
            current = parent;
            parent = branches[current[parentIdIndex]] ?? [];
          }

          current = parent;
        } else {
          break;
        }
      }
    }

    return potentials;
  }

  function arePheromonesOverlapping(a: number[], b: number[]): boolean {
    /** Stage 1: AABB test step by step */
    const [, xA, yA, radiusA, scaleA] = a;
    const radiusAScaled = radiusA * scaleA;
    const a_min_x = xA - radiusAScaled;
    const a_min_y = yA - radiusAScaled;
    const a_max_x = xA + radiusAScaled;
    const a_max_y = yA + radiusAScaled;

    const [, xB, yB, radiusB, scaleB] = b;
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

    if (abs(length_squared) > radius_sum * radius_sum) {
      return false;
    }

    return true;
  }

  /**
   * Pre-initialise all pheromones.
   * It's done only once and later on
   * pheromones will be drawn from
   * their pool and set different position.
   * Unused pheromones will be thrown
   * out of the edge of the screen.
   */
  doNTimes((index: number): void => {
    // prettier-ignore
    const circle = [
      index,      /* 0: id        */
      -2 * index, /* 1: x         */
      -2 * index, /* 2: y         */
      1,          /* 3: radius    */
      1,          /* 4: scale     */
      0,          /* 5: tag       */
      0,          /* 6: spawnTime */
    ];
    bodies[index] = circle;
    insert(circle);
  }, bodiesMaxCount);

  return {
    arePheromonesOverlapping,
    bodies,
    brachIndexes,
    branches,
    getPotentials,
    idIndex,
    insert,
    pheromoneBodyIndexes,
    remove,
  };
}
