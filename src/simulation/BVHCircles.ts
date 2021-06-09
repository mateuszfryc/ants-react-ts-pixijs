import * as PIXI from 'pixi.js';
import { bvhInitResponse } from './workers/bvhInitResponse';
import { setupWorker } from './workers/setupWorker';

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
  bodies: Body[] = [];
  branches: Branch[] = [];
  avilableNodeBranches: Branch = [];
  branchesMaxCount: number;
  readonly idIndex = 0;
  readonly bodiesMaxCount: number;
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
    if (Worker) {
      const { bodiesMaxCount, radius } = this;
      const setter = this.setBVHData.bind(this);
      const worker: Worker = setupWorker(bvhInitResponse);

      return new Promise((resolve) => {
        worker.addEventListener('message', ({ data }) => {
          setter(data);
          worker.terminate();
          resolve();
        });

        worker.postMessage([bodiesMaxCount, radius]);
      });
    }

    const step = this.initSingleBody.bind(this);

    return new Promise(step);
  }

  protected initSingleBody(resolve: () => void): void {
    /**
     * Large enough distance to place
     * newly created bodies
     * out of physics world bounds
     */
    const index = this.bodies.length;
    const outOfBoundsDistance = 99999999;
    const distance = outOfBoundsDistance + (this.radius + 1) * index;

    this.bodies[index] = [index];
    this.branches[index] = [index];
    this.isLeaf[index] = 1;
    this.parentsIDs[index] = -1;
    this.rightChildrenIDs[index] = -1;
    this.leftChildrenIDs[index] = -1;
    this.AABB_left[index] = -1;
    this.AABB_top[index] = -1;
    this.AABB_right[index] = -1;
    this.AABB_bottom[index] = -1;
    this.insert(index, distance, distance);

    if (this.bodies.length < this.bodiesMaxCount) {
      const step = this.initSingleBody.bind(this);
      setTimeout(() => {
        step(resolve);
      }, 0);

      return;
    }
    resolve();
  }

  public insert(index: number, x: number, y: number, radius = this.radius): void {
    this.longitudes[index] = x;
    this.latitudes[index] = y;
    const xMin = x - radius;
    const yMin = y - radius;
    const xMax = x + radius;
    const yMax = y + radius;

    this.AABB_left[index] = xMin;
    this.AABB_top[index] = yMin;
    this.AABB_right[index] = xMax;
    this.AABB_bottom[index] = yMax;

    if (this.rootBranch === undefined) {
      this.rootBranch = this.branches[index];

      return;
    }

    let current = this.rootBranch;
    const { branches, idIndex } = this;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      /** is of BranchType */
      let currentId = current[idIndex];
      if (this.isLeaf[currentId] === 0) {
        const left = branches[this.leftChildrenIDs[currentId]];
        const leftId = left[idIndex];
        /** Get left AABB */
        const xMinLeft = this.AABB_left[leftId];
        const yMinLeft = this.AABB_top[leftId];
        const xMaxLeft = this.AABB_right[leftId];
        const yMaxLeft = this.AABB_bottom[leftId];

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
        const right = branches[this.rightChildrenIDs[currentId]];
        const rightId = right[idIndex];
        const xMinRight = this.AABB_left[rightId];
        const yMinRight = this.AABB_top[rightId];
        const xMaxRight = this.AABB_right[rightId];
        const yMaxRight = this.AABB_bottom[rightId];

        /** Simulate new right AABB by extending it with newCircle AABB */
        const right_new_min_x = Math.min(xMin, xMinRight);
        const right_new_min_y = Math.min(yMin, yMinRight);
        const right_new_max_x = Math.max(xMax, xMaxRight);
        const right_new_max_y = Math.max(yMax, yMaxRight);

        const right_volume = (xMaxRight - xMinRight) * (yMaxRight - yMinRight);
        const right_new_volume =
          (right_new_max_x - right_new_min_x) * (right_new_max_y - right_new_min_y);
        const right_difference = right_new_volume - right_volume;

        this.AABB_left[currentId] = Math.min(left_new_min_x, right_new_min_x);
        this.AABB_top[currentId] = Math.min(left_new_min_y, right_new_min_y);
        this.AABB_right[currentId] = Math.max(left_new_max_x, right_new_max_x);
        this.AABB_bottom[currentId] = Math.max(left_new_max_y, right_new_max_y);

        current = left_difference <= right_difference ? left : right;
      }
      // Leaf
      else {
        currentId = current[idIndex];
        const parentId = this.parentsIDs[currentId];
        const grandparent: Branch | undefined = branches[parentId];
        const hasGrandparent = grandparent !== undefined;
        const grandparentId = hasGrandparent ? grandparent[idIndex] : undefined!;
        const parent_min_x = this.AABB_left[currentId];
        const parent_min_y = this.AABB_top[currentId];
        const parent_max_x = this.AABB_right[currentId];
        const parent_max_y = this.AABB_bottom[currentId];
        const newParentId = this.avilableNodeBranches.pop() ?? this.lastNodeBranchIndex++;
        if (this.lastNodeBranchIndex >= this.branchesMaxCount)
          this.lastNodeBranchIndex = this.bodiesMaxCount;
        const newParent = [newParentId];
        this.isLeaf[newParentId] = 0;
        this.parentsIDs[newParentId] = hasGrandparent ? grandparentId : -1;
        this.rightChildrenIDs[newParentId] = index;
        this.leftChildrenIDs[newParentId] = currentId;
        this.AABB_left[newParentId] = Math.min(xMin, parent_min_x);
        this.AABB_top[newParentId] = Math.min(yMin, parent_min_y);
        this.AABB_right[newParentId] = Math.max(xMax, parent_max_x);
        this.AABB_bottom[newParentId] = Math.max(yMax, parent_max_y);

        branches[newParentId] = newParent;
        this.parentsIDs[currentId] = newParentId;
        this.parentsIDs[index] = newParentId;

        if (!hasGrandparent) {
          this.rootBranch = newParent;
        } else if (this.leftChildrenIDs[grandparentId] === current[idIndex]) {
          this.leftChildrenIDs[grandparentId] = newParentId;
        } else {
          this.rightChildrenIDs[grandparentId] = newParentId;
        }

        break;
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
    const { idIndex } = this;
    if (this.isLeaf[current[idIndex]] === 1) return potentials;

    const xMin = this.AABB_left[id];
    const yMin = this.AABB_top[id];
    const xMax = this.AABB_right[id];
    const yMax = this.AABB_bottom[id];

    let traverse_left = true;
    while (current !== undefined) {
      if (traverse_left) {
        traverse_left = false;

        let left = this.branches[this.leftChildrenIDs[current[idIndex]]];
        let leftId = left !== undefined ? left[idIndex] : undefined!;

        while (
          left !== undefined &&
          this.AABB_right[leftId] >= xMin &&
          this.AABB_bottom[leftId] >= yMin &&
          this.AABB_left[leftId] <= xMax &&
          this.AABB_top[leftId] <= yMax
        ) {
          current = left;
          left = this.branches[this.leftChildrenIDs[current![idIndex]]];
          leftId = left !== undefined ? left[idIndex] : undefined!;
        }
      }

      const right: Branch | undefined = this.branches[this.rightChildrenIDs[current![idIndex]]];
      const rightId = right !== undefined ? right[idIndex] : undefined!;

      if (
        right !== undefined &&
        this.AABB_right[rightId] > xMin &&
        this.AABB_bottom[rightId] > yMin &&
        this.AABB_left[rightId] < xMax &&
        this.AABB_top[rightId] < yMax
      ) {
        current = right;
        traverse_left = true;
      } else {
        const currentId = current![idIndex];
        if (this.isLeaf[currentId] === 1 && currentId !== id) {
          potentials.push(this.bodies[currentId]);
        }

        let parent: Branch | undefined = this.branches[this.parentsIDs[currentId]];

        if (parent !== undefined) {
          while (
            parent !== undefined &&
            this.rightChildrenIDs[parent[idIndex]] === current![idIndex]
          ) {
            current = parent;
            parent = this.branches[this.parentsIDs[current[idIndex]]];
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
    this.bodies.forEach((body: Body): void => {
      const { radius } = this;
      const id = body[0];
      const x = this.longitudes[id];
      const y = this.latitudes[id];
      context.drawCircle(x, y, radius);
    });
  }
}
