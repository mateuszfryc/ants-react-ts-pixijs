type Body = number[];
type Branch = number[];

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
export function workerResponse({ data }: any): void {
  // eslint-disable-next-line no-restricted-globals, @typescript-eslint/no-explicit-any
  const script = self as any;
  const [bodiesMaxCount, radius] = data;
  const branchesMaxCount = bodiesMaxCount * 2 - 1;
  const bodies: Body[] = [];
  const branches: Branch[] = [];
  const isLeaf: number[] = [];
  const parentsIDs: number[] = [];
  const longitudes: number[] = [];
  const latitudes: number[] = [];
  const AABB_left: number[] = [];
  const AABB_top: number[] = [];
  const AABB_right: number[] = [];
  const AABB_bottom: number[] = [];
  const avilableNodeBranches: Branch = [];
  const rightChildrenIDs: number[] = [];
  const leftChildrenIDs: number[] = [];
  const idIndex = 0;
  const outOfBoundsDistance = 99999999;
  let lastNodeBranchIndex = bodiesMaxCount;
  let rootBranch: Branch | undefined;
  let index = 0;

  for (index; index < bodiesMaxCount; index++) {
    bodies[index] = [index];
    branches[index] = [index];
    isLeaf[index] = 1;
    parentsIDs[index] = -1;
    rightChildrenIDs[index] = -1;
    leftChildrenIDs[index] = -1;

    const x = outOfBoundsDistance + index * radius + 1;
    const y = outOfBoundsDistance + index * radius + 1;
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
    if (rootBranch === undefined) {
      rootBranch = branches[index];

      // eslint-disable-next-line no-continue
      continue;
    }
    let current = rootBranch;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      /** is of BranchType */
      let currentId = current[idIndex];
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

        const newParentId = avilableNodeBranches.pop() ?? lastNodeBranchIndex++;
        if (lastNodeBranchIndex >= branchesMaxCount) lastNodeBranchIndex = bodiesMaxCount;
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
          rootBranch = newParent;
        } else if (leftChildrenIDs[grandparentId] === current[idIndex]) {
          leftChildrenIDs[grandparentId] = newParentId;
        } else {
          rightChildrenIDs[grandparentId] = newParentId;
        }
        break;
      }
    }
  }

  script.postMessage([
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
  ]);
}
