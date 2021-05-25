import { createContext } from 'react';
import { makeObservable, observable, action } from 'mobx';
import { Simulation } from 'simulation/Simulation';
import { SimulationSettings, Vector } from 'simulation/types';
import { Metrics } from 'simulation/Metrics';

export class GlobalStore {
  metrics = new Metrics();
  currentSimulation: Simulation | undefined;
  simulationContainer: HTMLElement | undefined;
  simulationSettings: SimulationSettings;

  constructor() {
    makeObservable(this, {
      currentSimulation: observable,
      simulationSettings: observable,
      createSimulation: action,
      setAntsCount: action,
    });

    this.simulationContainer = undefined;
    this.currentSimulation = undefined;
    this.simulationSettings = {
      antsCount: 5,
      antsScale: 3,
      nestPositon: { x: 150, y: 150 },
      /** seconds */
      pheromonesLifeSpan: 30,
      /** Time between consequent emmisions in seconds */
      timeBetweenPheromonesEmissions: 0.15,
      isDebugDrawOn: false,
    };
  }

  createSimulation(): void {
    this.metrics = new Metrics();
    if (this.currentSimulation) this.currentSimulation.prepeareToBeRemoved();
    this.currentSimulation = undefined;
    if (this.simulationContainer) {
      this.currentSimulation = new Simulation(
        this.simulationContainer,
        this.simulationSettings,
        this.metrics,
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
