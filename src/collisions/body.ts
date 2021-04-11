import { BVHBranch } from './BVHBranch';

export class Body extends BVHBranch {
  x: number;
  y: number;
  direction_x: number;
  direction_y: number;
  padding: number;
  _polygon: boolean;
  _bvh_padding: number;

  constructor(x = 0, y = 0, padding = 0) {
    super(false);
    this.x = x;
    this.y = y;
    this.direction_x = 0;
    this.direction_y = 0;
    this.padding = padding;
    this._polygon = false;
    this._bvh_padding = padding;
  }
}
