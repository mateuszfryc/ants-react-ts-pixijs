import { BVHBranch } from './BVHBranch';

export class Body extends BVHBranch {
  x: number;
  y: number;
  xVelocity: number;
  yVelocity: number;
  rotation: number;
  padding: number;
  tags: string[];
  _polygon: boolean;
  _bvh_padding: number;

  constructor(x = 0, y = 0, padding = 0, tags: string[]) {
    super(false);
    this.x = x;
    this.y = y;
    this.xVelocity = 0;
    this.yVelocity = 0;
    this.rotation = 0; // radians
    this.padding = padding;
    this.tags = tags;
    this._polygon = false;
    this._bvh_padding = padding;
  }
}
