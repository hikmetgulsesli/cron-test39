"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScenarioRunner = void 0;
class ScenarioRunner {
    scenarios = [];
    addScenario(scenario) {
        this.scenarios.push(scenario);
    }
    getScenarios() {
        return this.scenarios;
    }
}
exports.ScenarioRunner = ScenarioRunner;
//# sourceMappingURL=index.js.map