import * as PIXI from 'pixi.js';

import { BVHBranch } from './BVHBranch';

export class Body extends BVHBranch {
  id: number;
  x: number;
  y: number;
  xv: number;
  yv: number;
  padding: number;
  tag: number;
  // removeSelfFromCollisions: () => void;
  spriteRef: PIXI.Sprite | undefined;
  markedForRemoval: boolean;
  _polygon: boolean;
  _bvh_padding: number;

  constructor(x = 0, y = 0, padding = 0, tag = 0, id = 0) {
    super(false);
    this.id = id;
    this.x = x;
    this.y = y;
    this.xv = 1;
    this.yv = 0;

    this.padding = padding;
    this.tag = tag;
    // this.removeSelfFromCollisions = () => {};
    this.spriteRef = undefined;
    this.markedForRemoval = false;
    this._polygon = false;
    this._bvh_padding = padding;
  }
}
