export class BVHBranch {
  _bvh_parent: BVHBranch | undefined;
  _bvh_branch: boolean;
  _bvh_left: BVHBranch | undefined;
  _bvh_right: BVHBranch | undefined;
  _bvh_min_x: number;
  _bvh_min_y: number;
  _bvh_max_x: number;
  _bvh_max_y: number;

  constructor(isBranch = true) {
    this._bvh_parent = undefined;
    this._bvh_branch = isBranch;
    this._bvh_left = undefined;
    this._bvh_right = undefined;
    this._bvh_min_x = 0;
    this._bvh_min_y = 0;
    this._bvh_max_x = 0;
    this._bvh_max_y = 0;
  }
}
