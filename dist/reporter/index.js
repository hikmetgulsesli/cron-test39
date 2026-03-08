"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Reporter = void 0;
class Reporter {
    reports = [];
    generateReport(results) {
        const report = {
            id: `report-${Date.now()}`,
            timestamp: new Date(),
            results,
        };
        this.reports.push(report);
        return report;
    }
    getReports() {
        return this.reports;
    }
}
exports.Reporter = Reporter;
//# sourceMappingURL=index.js.map