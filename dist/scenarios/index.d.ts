export interface Scenario {
    id: string;
    name: string;
    description: string;
}
export declare class ScenarioRunner {
    private scenarios;
    addScenario(scenario: Scenario): void;
    getScenarios(): Scenario[];
}
//# sourceMappingURL=index.d.ts.map