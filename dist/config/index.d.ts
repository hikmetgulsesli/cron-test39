export interface Config {
    name: string;
    schedules: string[];
    timezone: string;
}
export declare class ConfigManager {
    private config;
    load(config: Config): void;
    getConfig(): Config | null;
}
//# sourceMappingURL=index.d.ts.map