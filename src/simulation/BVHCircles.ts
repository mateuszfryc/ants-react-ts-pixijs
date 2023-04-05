import * as PIXI from 'pixi.js';

const timer = {
  current: Date.now(),
  canRun() {
    const now = Date.now();
    if (now - this.current > 1000) {
      this.current = now;

      return true;
    }

    return false;
  },
};
let min = 99999;
let avr = 0;
let max = 0;

function updateStat(steps) {
  if (steps < min) min = steps;
  if (steps > max) max = steps;
  avr = (min + max) / 2;
}

type Body = number[];
type Branch = number[];
type BVHData = [
  bodies: Body[],
  branches: Branch[],
  isLeaf: number[],
  parentsIDs: number[],
  longitudes: number[],
  latitudes: number[],
  AABB_left: number[],
  AABB_top: number[],
  AABB_right: number[],
  AABB_bottom: number[],
  avilableNodeBranches: number[],
  rightChildrenIDs: number[],
  leftChildrenIDs: number[],
  rootBranch: Branch | undefined,
  lastNodeBranchIndex: number,
];

export class BVHCircles {
  readonly idIndex = 0;
  readonly bodiesMaxCount: number;
  bodies: Body[] = [];
  branches: Branch[] = [];
  avilableNodeBranches: Branch = [];
  branchesMaxCount: number;
  lastNodeBranchIndex = 0;
  areBodiesInitialised = false;
  rootBranch: Branch | undefined;
  /** Bodies properties */
  longitudes: Float32Array;
  latitudes: Float32Array;
  /** Branches properties */
  isLeaf: Int8Array;
  parentsIDs: Int32Array;
  rightChildrenIDs: Int32Array;
  leftChildrenIDs: Int32Array;
  AABB_left: Float32Array;
  AABB_top: Float32Array;
  AABB_right: Float32Array;
  AABB_bottom: Float32Array;
  radius: number;

  constructor(bodiesMaxCount: number, defaultRadius: number) {
    this.bodiesMaxCount = bodiesMaxCount;
    this.branchesMaxCount = bodiesMaxCount * 2 - 1;

    this.longitudes = new Float32Array(bodiesMaxCount);
    this.latitudes = new Float32Array(bodiesMaxCount);

    this.isLeaf = new Int8Array(this.branchesMaxCount);
    this.parentsIDs = new Int32Array(this.branchesMaxCount);
    this.rightChildrenIDs = new Int32Array(this.branchesMaxCount);
    this.leftChildrenIDs = new Int32Array(this.branchesMaxCount);
    this.AABB_left = new Float32Array(this.branchesMaxCount);
    this.AABB_top = new Float32Array(this.branchesMaxCount);
    this.AABB_right = new Float32Array(this.branchesMaxCount);
    this.AABB_bottom = new Float32Array(this.branchesMaxCount);

    this.lastNodeBranchIndex = bodiesMaxCount;
    this.radius = defaultRadius;
  }

  protected setBVHData(data: BVHData): void {
    const [
      bodies,
      branches,
      isLeaf,
      parentsIDs,
      longitudes,
      latitudes,
      AABB_left,
      AABB_top,
      AABB_right,
      AABB_bottom,
      avilableNodeBranches,
      rightChildrenIDs,
      leftChildrenIDs,
      rootBranch,
      lastNodeBranchIndex,
    ] = data;
    this.bodies = bodies;
    this.branches = branches;
    this.avilableNodeBranches = avilableNodeBranches;
    this.isLeaf.set(isLeaf);
    this.parentsIDs.set(parentsIDs);
    this.longitudes.set(longitudes);
    this.latitudes.set(latitudes);
    this.AABB_left.set(AABB_left);
    this.AABB_top.set(AABB_top);
    this.AABB_right.set(AABB_right);
    this.AABB_bottom.set(AABB_bottom);
    this.rightChildrenIDs.set(rightChildrenIDs);
    this.leftChildrenIDs.set(leftChildrenIDs);
    this.rootBranch = rootBranch;
    this.lastNodeBranchIndex = lastNodeBranchIndex;
  }

  public async initialiseBodies(): Promise<void> {
    const step = this.initBodies.bind(this);

    return new Promise(step);
  }

  protected initBodiesByInserting(resolve: () => void): void {
    const {
      bodiesMaxCount,
      bodies,
      branches,
      radius,
      isLeaf,
      leftChildrenIDs,
      rightChildrenIDs,
      parentsIDs,
    } = this;
    const outOfBoundsDistance = 999999;

    rightChildrenIDs.fill(-1);
    leftChildrenIDs.fill(-1);
    parentsIDs.fill(-1);
    isLeaf.fill(1);

    let index = 0;
    for (index = 0; index < bodiesMaxCount; index++) {
      bodies[index] = [index];
      branches[index] = [index];

      const distance = outOfBoundsDistance + (radius + 50) * index;
      this.insert(index, distance, distance);
    }

    resolve();
  }

  protected initBodies(resolve: () => void): void {
    const {
      bodiesMaxCount,
      bodies,
      branches,
      radius,
      isLeaf,
      branchesMaxCount,
      leftChildrenIDs,
      rightChildrenIDs,
      parentsIDs,
      latitudes,
      longitudes,
      AABB_left,
      AABB_top,
      AABB_right,
      AABB_bottom,
    } = this;
    const outOfBoundsDistance = 999999;

    let index = 0;
    for (index = 0; index < bodiesMaxCount; index++) {
      bodies[index] = [index];
      branches[index] = [index];
    }

    index = 0;
    for (index = 0; index < branchesMaxCount; index++) {
      branches[index] = [index];
      isLeaf[index] = index < bodiesMaxCount ? 1 : 0;
      leftChildrenIDs[index] = index < bodiesMaxCount ? -1 : index - bodiesMaxCount;
      rightChildrenIDs[index] = index < bodiesMaxCount ? -1 : index + 1;
      parentsIDs[index] = index < bodiesMaxCount ? index + bodiesMaxCount : index - 1;
      if (index === bodiesMaxCount - 1) parentsIDs[index] = branchesMaxCount - 1;
      if (index === bodiesMaxCount) parentsIDs[index] = -1;
      if (index === branchesMaxCount - 1)
        rightChildrenIDs[index] = branchesMaxCount - bodiesMaxCount;
      const x = outOfBoundsDistance + index * 5;
      latitudes[index] = x;
      longitudes[index] = x;
      AABB_left[index] = x - radius;
      AABB_top[index] = x - radius;
      AABB_right[index] = x + radius;
      AABB_bottom[index] = x + radius;
    }

    this.lastNodeBranchIndex = bodiesMaxCount;
    this.rootBranch = this.branches[bodiesMaxCount];

    resolve();
  }

  public insert(index: number, x: number, y: number, radius = this.radius): void {
    const { branches, longitudes, latitudes, AABB_left, AABB_top, AABB_right, AABB_bottom } = this;
    longitudes[index] = x;
    latitudes[index] = y;
    const xMin = x - radius;
    const yMin = y - radius;
    const xMax = x + radius;
    const yMax = y + radius;

    AABB_left[index] = xMin;
    AABB_top[index] = yMin;
    AABB_right[index] = xMax;
    AABB_bottom[index] = yMax;

    if (this.rootBranch === undefined) {
      this.rootBranch = branches[index];

      return;
    }

    let current = this.rootBranch;
    const { idIndex, isLeaf, leftChildrenIDs, rightChildrenIDs, parentsIDs } = this;

    let shouldLoop = true;
    let steps = 0;
    while (shouldLoop) {
      /** is of BranchType */
      let currentId = current[idIndex];
      steps++;
      if (isLeaf[currentId] === 0) {
        const left = branches[leftChildrenIDs[currentId]];
        const leftId = left[idIndex];
        /** Get left AABB */
        const xMinLeft = AABB_left[leftId];
        const yMinLeft = AABB_top[leftId];
        const xMaxLeft = AABB_right[leftId];
        const yMaxLeft = AABB_bottom[leftId];

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
        const right = branches[rightChildrenIDs[currentId]];
        const rightId = right[idIndex];
        const xMinRight = AABB_left[rightId];
        const yMinRight = AABB_top[rightId];
        const xMaxRight = AABB_right[rightId];
        const yMaxRight = AABB_bottom[rightId];

        /** Simulate new right AABB by extending it with newCircle AABB */
        const right_new_min_x = Math.min(xMin, xMinRight);
        const right_new_min_y = Math.min(yMin, yMinRight);
        const right_new_max_x = Math.max(xMax, xMaxRight);
        const right_new_max_y = Math.max(yMax, yMaxRight);

        const right_volume = (xMaxRight - xMinRight) * (yMaxRight - yMinRight);
        const right_new_volume =
          (right_new_max_x - right_new_min_x) * (right_new_max_y - right_new_min_y);
        const right_difference = right_new_volume - right_volume;

        AABB_left[currentId] = Math.min(left_new_min_x, right_new_min_x);
        AABB_top[currentId] = Math.min(left_new_min_y, right_new_min_y);
        AABB_right[currentId] = Math.max(left_new_max_x, right_new_max_x);
        AABB_bottom[currentId] = Math.max(left_new_max_y, right_new_max_y);

        current = left_difference <= right_difference ? left : right;
      }
      // Leaf
      else {
        currentId = current[idIndex];
        const parentId = parentsIDs[currentId];
        const grandparent: Branch | undefined = branches[parentId];
        const hasGrandparent = grandparent !== undefined;
        const grandparentId = hasGrandparent ? grandparent[idIndex] : undefined!;
        const parent_min_x = AABB_left[currentId];
        const parent_min_y = AABB_top[currentId];
        const parent_max_x = AABB_right[currentId];
        const parent_max_y = AABB_bottom[currentId];
        const newParentId = this.avilableNodeBranches.pop() ?? this.lastNodeBranchIndex++;
        if (this.lastNodeBranchIndex >= this.branchesMaxCount)
          this.lastNodeBranchIndex = this.bodiesMaxCount;
        const newParent = [newParentId];
        isLeaf[newParentId] = 0;
        parentsIDs[newParentId] = hasGrandparent ? grandparentId : -1;
        rightChildrenIDs[newParentId] = index;
        leftChildrenIDs[newParentId] = currentId;
        AABB_left[newParentId] = Math.min(xMin, parent_min_x);
        AABB_top[newParentId] = Math.min(yMin, parent_min_y);
        AABB_right[newParentId] = Math.max(xMax, parent_max_x);
        AABB_bottom[newParentId] = Math.max(yMax, parent_max_y);

        branches[newParentId] = newParent;
        parentsIDs[currentId] = newParentId;
        parentsIDs[index] = newParentId;

        if (!hasGrandparent) {
          this.rootBranch = newParent;
        } else if (leftChildrenIDs[grandparentId] === current[idIndex]) {
          leftChildrenIDs[grandparentId] = newParentId;
        } else {
          rightChildrenIDs[grandparentId] = newParentId;
        }

        updateStat(steps);
        if (timer.canRun()) console.log(`min: ${min} | avr: ${avr} | max: ${max}`);

        shouldLoop = false;
      }
    }
  }

  public remove(id = 0): void {
    if (this.rootBranch === undefined) return;

    const { idIndex } = this;
    /** Don't remove root body/branch */
    if (this.rootBranch[idIndex] === id) {
      this.rootBranch = undefined;

      return;
    }

    /**
     * Get sibling of the branch being removed
     * and make it sibling of the parent (child
     * of grandparent)
     */
    const parentId = this.parentsIDs[id];
    const grandparent: Branch | undefined = this.branches[this.parentsIDs[parentId]];

    const parentLeftChildId = this.leftChildrenIDs[parentId];
    const parentLeftChild: Branch | undefined = this.branches[parentLeftChildId];
    const sibling =
      parentLeftChildId === id ? this.branches[this.rightChildrenIDs[parentId]] : parentLeftChild;
    const siblingId = sibling[idIndex];

    this.parentsIDs[siblingId] = grandparent ? grandparent[idIndex] : -1;

    if (grandparent !== undefined) {
      let tempId = grandparent[idIndex];
      if (this.leftChildrenIDs[tempId] === parentId) {
        this.leftChildrenIDs[tempId] = siblingId;
      } else {
        this.rightChildrenIDs[tempId] = siblingId;
      }

      let tempBranch = grandparent;

      /**
       * For grandparent that has now new child
       * compute new AABB and traverse upt the tree
       * up to the root and do the same at each step.
       */
      while (tempBranch) {
        const left = this.branches[this.leftChildrenIDs[tempId]];
        const leftId = left[idIndex];
        /** Get left AABB */
        const xMinLeft = this.AABB_left[leftId];
        const yMinLeft = this.AABB_top[leftId];
        const xMaxLeft = this.AABB_right[leftId];
        const yMaxLeft = this.AABB_bottom[leftId];

        /** Get right AABB */
        const right = this.branches[this.rightChildrenIDs[tempId]];
        const rightId = right[idIndex];
        const xMinRight = this.AABB_left[rightId];
        const yMinRight = this.AABB_top[rightId];
        const xMaxRight = this.AABB_right[rightId];
        const yMaxRight = this.AABB_bottom[rightId];

        this.AABB_left[tempId] = Math.min(xMinLeft, xMinRight);
        this.AABB_top[tempId] = Math.min(yMinLeft, yMinRight);
        this.AABB_right[tempId] = Math.max(xMaxLeft, xMaxRight);
        this.AABB_bottom[tempId] = Math.max(yMaxLeft, yMaxRight);

        tempBranch = this.branches[this.parentsIDs[tempId]];
        if (tempBranch) tempId = tempBranch[idIndex];
      }
    } else {
      this.rootBranch = sibling;
    }

    this.avilableNodeBranches.push(parentId);
  }

  /** Returns a list of potential collisions for a body */
  public getPotentials(id = 0): Body[] {
    const potentials: Body[] = [];
    if (this.rootBranch === undefined) return potentials;

    let current = this.rootBranch;
    const { idIndex, isLeaf } = this;
    if (isLeaf[current[idIndex]] === 1) return potentials;
    const {
      AABB_left,
      AABB_top,
      AABB_right,
      AABB_bottom,
      branches,
      leftChildrenIDs,
      rightChildrenIDs,
      bodies,
      parentsIDs,
    } = this;

    const xMin = AABB_left[id];
    const yMin = AABB_top[id];
    const xMax = AABB_right[id];
    const yMax = AABB_bottom[id];

    let traverse_left = true;
    while (current !== undefined) {
      if (traverse_left) {
        traverse_left = false;

        let left = branches[leftChildrenIDs[current[idIndex]]];
        let leftId = left !== undefined ? left[idIndex] : undefined!;

        while (
          left !== undefined &&
          AABB_right[leftId] >= xMin &&
          AABB_bottom[leftId] >= yMin &&
          AABB_left[leftId] <= xMax &&
          AABB_top[leftId] <= yMax
        ) {
          current = left;
          left = branches[leftChildrenIDs[current![idIndex]]];
          leftId = left !== undefined ? left[idIndex] : undefined!;
        }
      }

      const right: Branch | undefined = branches[rightChildrenIDs[current![idIndex]]];
      const rightId = right !== undefined ? right[idIndex] : undefined!;

      if (
        right !== undefined &&
        AABB_right[rightId] > xMin &&
        AABB_bottom[rightId] > yMin &&
        AABB_left[rightId] < xMax &&
        AABB_top[rightId] < yMax
      ) {
        current = right;
        traverse_left = true;
      } else {
        const currentId = current![idIndex];
        if (isLeaf[currentId] === 1 && currentId !== id) {
          potentials.push(bodies[currentId]);
        }

        let parent: Branch | undefined = branches[parentsIDs[currentId]];

        if (parent !== undefined) {
          while (parent !== undefined && rightChildrenIDs[parent[idIndex]] === current![idIndex]) {
            current = parent;
            parent = branches[parentsIDs[current[idIndex]]];
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
    /** Skip: Stage 1: AABB test step by step */
    const xA = this.longitudes[aID];
    const yA = this.latitudes[aID];
    // const a_min_x = xA - radiusA;
    // const a_min_y = yA - radiusA;
    // const a_max_x = xA + radiusA;
    // const a_max_y = yA + radiusA;

    const xB = this.longitudes[bID];
    const yB = this.latitudes[bID];
    // const b_min_x = xB - radiusB;
    // const b_min_y = yB - radiusB;
    // const b_max_x = xB + radiusB;
    // const b_max_y = yB + radiusB;

    // if (a_min_x > b_max_x) return false;
    // if (a_min_y > b_max_y) return false;
    // if (a_max_x < b_min_x) return false;
    // if (a_max_y < b_min_y) return false;

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
    this.bodies.forEach((body: Body, index: number): void => {
      const { radius } = this;
      const id = body[0];
      const x = this.longitudes[id];
      const y = this.latitudes[id];
      context.drawCircle(x, y, index === 0 ? radius * 3 : radius);
    });
  }
}
