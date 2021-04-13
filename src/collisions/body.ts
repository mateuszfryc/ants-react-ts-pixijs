import { BVHBranch } from './BVHBranch';

export class Body extends BVHBranch {
  x: number;
  y: number;
  xVelocity: number;
  yVelocity: number;
  rotation: number;
  targetRotation: number;
  padding: number;
  _polygon: boolean;
  _bvh_padding: number;

  constructor(x = 0, y = 0, padding = 0) {
    super(false);
    this.x = x;
    this.y = y;
    this.xVelocity = 0;
    this.yVelocity = 0;
    this.rotation = 0; // radians
    this.targetRotation = 0; // radians
    this.padding = padding;
    this._polygon = false;
    this._bvh_padding = padding;
  }
}
