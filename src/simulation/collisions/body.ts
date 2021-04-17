import * as PIXI from 'pixi.js';

import { BVHBranch } from './BVHBranch';

export class Body extends BVHBranch {
  x: number;
  y: number;
  xVelocity: number;
  yVelocity: number;
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
    this.xVelocity = 0;
    this.yVelocity = 0;
    this.rotation = 0; // radians
    this.padding = padding;
    this.tag = tag;
    this.removeSelfFromCollisions = () => {};
    this.spriteRef = undefined;
    this._polygon = false;
    this._bvh_padding = padding;
  }
}
