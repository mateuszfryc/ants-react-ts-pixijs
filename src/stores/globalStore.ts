import { action, makeObservable, observable } from 'mobx';
import { createContext } from 'react';
import { DebugDraw } from 'simulation/DebugDraw';
import { Metrics } from 'simulation/Metrics';
import { Simulation } from 'simulation/Simulation';
import { SimulationSettings, Vector } from 'simulation/types';

export class GlobalStore {
  metrics = new Metrics();
  debugDraw = new DebugDraw();
  currentSimulation: Simulation | undefined;
  simulationContainer: HTMLElement | undefined;
  simulationSettings: SimulationSettings;

  constructor() {
    makeObservable(this, {
      currentSimulation: observable,
      metrics: observable,
      debugDraw: observable,
      simulationSettings: observable,
      createSimulation: action,
      setAntsCount: action,
    });

    this.simulationContainer = undefined;
    this.currentSimulation = undefined;
    this.simulationSettings = {
      antsCount: 400,
      antsScale: 3,
      nestPositon: { x: 150, y: 150 },
      /** seconds */
      pheromonesLifeSpan: 60,
      /** Time between consequent emmisions in seconds */
      timeBetweenPheromonesEmissions: 0.2,
      isDebugDrawOn: true,
      // fixed time step: seconds
      // simulation speed: 100%
    };
  }

  createSimulation(): void {
    if (this.currentSimulation) this.currentSimulation.prepeareToBeRemoved();
    this.metrics = new Metrics();
    this.debugDraw = new DebugDraw();
    this.currentSimulation = undefined;
    if (this.simulationContainer) {
      this.currentSimulation = new Simulation(
        this.simulationContainer,
        this.simulationSettings,
        this.metrics,
        this.debugDraw,
      );
    }
  }

  setSimulationContainer(container: HTMLElement): void {
    this.simulationContainer = container;
  }

  setAntsCount(count: number): void {
    this.simulationSettings.antsCount = count;
  }

  setNestPosition(position: Vector): void {
    this.simulationSettings.nestPositon = position;
  }

  setPheromonesLifeSpan(lifeSpan: number): void {
    this.simulationSettings.pheromonesLifeSpan = lifeSpan;
  }
}

const store = new GlobalStore();

export default createContext(store);
