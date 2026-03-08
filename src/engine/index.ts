export interface EngineConfig {
  name: string;
  version: string;
}

export class CronEngine {
  private config: EngineConfig;

  constructor(config: EngineConfig) {
    this.config = config;
  }

  public getConfig(): EngineConfig {
    return this.config;
  }
}
