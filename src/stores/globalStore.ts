import { createContext } from 'react';
import { makeObservable, observable, action } from 'mobx';
import { Simulation } from 'simulation/Simulation';
import { SimulationSettings, Vector } from 'simulation/types';

export class GlobalStore {
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
      antsCount: 300,
      nestPositon: { x: 500, y: 500 },
      /** In seconds */
      pheromonesLifeSpan: 30,
    };
  }

  createSimulation(): void {
    if (this.currentSimulation) this.currentSimulation.prepeareToBeRemoved();
    if (this.simulationContainer) {
      this.currentSimulation = new Simulation(this.simulationContainer, this.simulationSettings);
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
