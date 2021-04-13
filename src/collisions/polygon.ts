import * as PIXI from 'pixi.js';

import { Body } from 'collisions/body';

export class Polygon extends Body {
  angle: number;
  scale_x: number;
  scale_y: number;
  _polygon: boolean;
  _x: number;
  _y: number;
  _angle: number;
  _scale_x: number;
  _scale_y: number;
  _min_x: number;
  _min_y: number;
  _max_x: number;
  _max_y: number;
  _points: number[] | Float64Array;
  _coords: number[] | Float64Array;
  _segments: number[][][];
  _edges: number[] | Float64Array;
  _normals: number[] | Float64Array;
  _dirty_coords: boolean;
  _dirty_normals: boolean;

  constructor(
    x = 0,
    y = 0,
    points: number[][],
    tags: string[],
    angle = 0,
    scale_x = 1,
    scale_y = 1,
    padding = 0,
  ) {
    super(x, y, padding, tags);

    // The angle of the body in radians
    this.angle = angle;
    this.scale_x = scale_x;
    this.scale_y = scale_y;

    this._polygon = true;
    this._x = x;
    this._y = y;
    this._angle = angle;
    this._scale_x = scale_x;
    this._scale_y = scale_y;
    this._min_x = 0;
    this._min_y = 0;
    this._max_x = 0;
    this._max_y = 0;
    this._points = [];
    this._coords = [];
    this._segments = [];
    this._edges = [];
    this._normals = [];
    this._dirty_coords = true;
    this._dirty_normals = true;

    Polygon.prototype.setPoints.call(this, points || []);
  }

  getCoords(): number[] | Float64Array {
    if (
      this._dirty_coords ||
      this.x !== this._x ||
      this.y !== this._y ||
      this.angle !== this._angle ||
      this.scale_x !== this._scale_x ||
      this.scale_y !== this._scale_y
    ) {
      this._calculateCoords();
    }

    return this._coords;
  }

  getPoints(): number[][] {
    const coords = this.getCoords();
    const points: number[][] = [];

    points.push([coords[0], coords[1]]);

    for (let i = 2; i < coords.length; i += 2) {
      points.push([coords[i], coords[i + 1]]);
    }

    if (coords.length > 4) {
      points.push([coords[0], coords[1]]);
    }

    return points;
  }

  calculateSegments(): void {
    const coords = this.getCoords();
    const points: number[][] = [];

    points.push([coords[0], coords[1]]);

    for (let i = 2; i < coords.length; i += 2) {
      points.push([coords[i], coords[i + 1]]);
    }

    if (coords.length > 4) {
      points.push([coords[0], coords[1]]);
    }

    // eslint-disable-next-line no-plusplus
    for (let i = 1; i < points.length; i++) {
      this._segments.push([points[i - 1], points[i]]);
    }
    this._segments.push([points[points.length - 1], points[0]]);
  }

  getSegments(): number[][][] {
    if (this._segments.length === 0) {
      this.calculateSegments();
    }

    return this._segments;
  }

  draw(context: PIXI.Graphics): void {
    if (
      this._dirty_coords ||
      this.x !== this._x ||
      this.y !== this._y ||
      this.angle !== this._angle ||
      this.scale_x !== this._scale_x ||
      this.scale_y !== this._scale_y
    ) {
      this._calculateCoords();
    }

    const coords = this._coords;

    // Point routine
    // if (coords.length === 2) {
    //   context.moveTo(coords[0], coords[1]);
    //   context.arc(coords[0], coords[1], 1, 0, Math.PI * 2);
    // } else {
    context.moveTo(coords[0], coords[1]);

    for (let i = 2; i < coords.length; i += 2) {
      context.lineTo(coords[i], coords[i + 1]);
    }

    if (coords.length > 4) {
      context.lineTo(coords[0], coords[1]);
    }
    // }
  }

  // Sets the points making up the polygon. It's important to use this function when changing the polygon's shape to ensure internal data is also updated.
  setPoints(new_points: number[][]): void {
    const count = new_points.length;

    this._points = new Float64Array(count * 2);
    this._coords = new Float64Array(count * 2);
    this._edges = new Float64Array(count * 2);
    this._normals = new Float64Array(count * 2);

    const points = this._points;

    for (let i = 0, ix = 0, iy = 1; i < count; ++i, ix += 2, iy += 2) {
      const new_point = new_points[i];

      points[ix] = new_point[0];
      points[iy] = new_point[1];
    }

    this._dirty_coords = true;
  }

  // Calculates and caches the polygon's world coordinates based on its points, angle, and scale
  _calculateCoords(): void {
    const { x } = this;
    const { y } = this;
    const { angle } = this;
    const { scale_x } = this;
    const { scale_y } = this;
    const points = this._points;
    const coords = this._coords;
    const count = points.length;

    let min_x = 0;
    let max_x = 0;
    let min_y = 0;
    let max_y = 0;

    for (let ix = 0, iy = 1; ix < count; ix += 2, iy += 2) {
      let coord_x: number = points[ix] * scale_x;
      let coord_y: number = points[iy] * scale_y;

      if (angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const tmp_x = coord_x;
        const tmp_y = coord_y;

        coord_x = tmp_x * cos - tmp_y * sin;
        coord_y = tmp_x * sin + tmp_y * cos;
      }

      coord_x += x;
      coord_y += y;

      coords[ix] = coord_x;
      coords[iy] = coord_y;

      if (ix === 0) {
        max_x = coord_x;
        max_y = coord_y;
        min_x = max_x;
        min_y = max_y;
      } else {
        if (coord_x < min_x) {
          min_x = coord_x;
        } else if (coord_x > max_x) {
          max_x = coord_x;
        }

        if (coord_y < min_y) {
          min_y = coord_y;
        } else if (coord_y > max_y) {
          max_y = coord_y;
        }
      }
    }

    this._x = x;
    this._y = y;
    this._angle = angle;
    this._scale_x = scale_x;
    this._scale_y = scale_y;
    this._min_x = min_x;
    this._min_y = min_y;
    this._max_x = max_x;
    this._max_y = max_y;
    this._dirty_coords = false;
    this._dirty_normals = true;
  }

  // Calculates the normals and edges of the polygon's sides
  _calculateNormals(): void {
    const coords = this._coords;
    const edges = this._edges;
    const normals = this._normals;
    const count = coords.length;

    for (let ix = 0, iy = 1; ix < count; ix += 2, iy += 2) {
      const next = ix + 2 < count ? ix + 2 : 0;
      const x = coords[next] - coords[ix];
      const y = coords[next + 1] - coords[iy];
      const length = x || y ? Math.sqrt(x * x + y * y) : 0;

      edges[ix] = x;
      edges[iy] = y;
      normals[ix] = length ? y / length : 0;
      normals[iy] = length ? -x / length : 0;
    }

    this._dirty_normals = false;
  }
}
