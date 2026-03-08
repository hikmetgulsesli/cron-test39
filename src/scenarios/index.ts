export interface Scenario {
  id: string;
  name: string;
  description: string;
}

export class ScenarioRunner {
  private scenarios: Scenario[] = [];

  public addScenario(scenario: Scenario): void {
    this.scenarios.push(scenario);
  }

  public getScenarios(): Scenario[] {
    return this.scenarios;
  }
}
