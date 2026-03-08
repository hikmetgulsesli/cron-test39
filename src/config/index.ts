export interface Config {
  name: string;
  schedules: string[];
  timezone: string;
}

export class ConfigManager {
  private config: Config | null = null;

  public load(config: Config): void {
    this.config = config;
  }

  public getConfig(): Config | null {
    return this.config;
  }
}
