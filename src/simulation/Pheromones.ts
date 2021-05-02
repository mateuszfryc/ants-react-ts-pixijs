import { CircleMinimal } from './collisions/circlesMinimalCollisions';

/** Time before pheromone will decay (in seconds) */
export const pheromoneInitialLifeSpan = 32;
const radius = 2;

export class Pheromone extends CircleMinimal {
  lifeSpan: number;

  constructor(id: number, x: number, y: number, tag: number) {
    super(id, x, y, radius, 1, tag);
    this.lifeSpan = pheromoneInitialLifeSpan;
  }
}
