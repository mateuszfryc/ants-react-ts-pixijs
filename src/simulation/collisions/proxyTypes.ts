import { Body } from './body';
import { Circle } from './circle';
import { Polygon } from './polygon';

export type Shape = Body & Circle & Polygon;
