"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Database = void 0;
class Database {
    entries = [];
    insert(entry) {
        this.entries.push(entry);
    }
    getAll() {
        return this.entries;
    }
    findById(id) {
        return this.entries.find((entry) => entry.id === id);
    }
}
exports.Database = Database;
//# sourceMappingURL=index.js.map