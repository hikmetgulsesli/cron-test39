"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigManager = void 0;
class ConfigManager {
    config = null;
    load(config) {
        this.config = config;
    }
    getConfig() {
        return this.config;
    }
}
exports.ConfigManager = ConfigManager;
//# sourceMappingURL=index.js.map