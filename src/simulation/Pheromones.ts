import { Circle } from 'simulation/collisions/circle';

const radius = 2;
const initialStrength = 16; // seconds

export class Pheromone extends Circle {
  lifeSpan: number;

  constructor(x: number, y: number, tag: number, id: number) {
    super(x, y, radius, tag, 1, 0, id);
    this.lifeSpan = initialStrength;
  }
}
