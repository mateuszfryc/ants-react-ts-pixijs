import { createContext } from 'react';
import { makeObservable, observable, action } from 'mobx';
import { Simulation } from 'simulation/Simulation';
import { SimulationSettingsType } from 'simulation/types';

export class GlobalStore {
  currentSimulation: Simulation | undefined;
  simulationContainer: HTMLElement | undefined;
  simulationSettings: SimulationSettingsType;

  constructor() {
    makeObservable(this, {
      currentSimulation: observable,
      createSimulation: action,
    });

    this.simulationContainer = undefined;
    this.currentSimulation = undefined;
    this.simulationSettings = {
      antsCount: 100,
    };
  }

  createSimulation(antsCount?: number): void {
    if (this.simulationContainer && (this.simulationSettings.antsCount || antsCount)) {
      this.currentSimulation = new Simulation(
        this.simulationContainer,
        antsCount ?? this.simulationSettings.antsCount,
      );
    }
  }

  setSimulationContainer(container: HTMLElement): void {
    this.simulationContainer = container;
  }

  setAntsCount(count: number): void {
    this.simulationSettings.antsCount = count;
  }
}

const store = new GlobalStore();

export default createContext(store);
