import { Shape } from './proxyTypes';

export class Result {
  a: Shape | undefined;
  b: Shape | undefined;
  a_in_b: boolean;
  b_in_a: boolean;
  overlap: number | undefined;
  overlap_x: number;
  overlap_y: number;

  constructor() {
    // The source body tested
    this.a = undefined;

    // The target body tested against
    this.b = undefined;

    // True if A is completely contained within B
    this.a_in_b = false;

    // True if B is completely contained within A
    this.b_in_a = false;

    // The magnitude of the shortest axis of overlap
    this.overlap = undefined;

    // The X direction of the shortest axis of overlap
    this.overlap_x = 0;

    // The Y direction of the shortest axis of overlap
    this.overlap_y = 0;
  }
}
