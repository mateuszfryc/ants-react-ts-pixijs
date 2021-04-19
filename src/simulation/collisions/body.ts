import * as PIXI from 'pixi.js';

import { BVHBranch } from './BVHBranch';

export class Body extends BVHBranch {
  x: number;
  y: number;
  xv: number;
  yv: number;
  rotation: number;
  padding: number;
  tag: number;
  removeSelfFromCollisions: () => void;
  spriteRef: PIXI.Sprite | undefined;
  _polygon: boolean;
  _bvh_padding: number;

  constructor(x = 0, y = 0, padding = 0, tag: number) {
    super(false);
    this.x = x;
    this.y = y;

    // x and y random and normalized velocity
    // let xr = Math.random() * 2 - 1;
    // let yr = Math.random() * 2 - 1;
    // const lenght = Math.sqrt(xr * xr + yr * yr);
    // xr /= lenght;
    // yr /= lenght;

    this.xv = 0; // xr;
    this.yv = 0; // yr;
    this.rotation = 0; // radians
    this.padding = padding;
    this.tag = tag;
    this.removeSelfFromCollisions = () => {};
    this.spriteRef = undefined;
    this._polygon = false;
    this._bvh_padding = padding;
  }
}
