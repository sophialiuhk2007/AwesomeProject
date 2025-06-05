export class ClaudeConfig {
  private static instance: ClaudeConfig;
  private isClaudeSonnetEnabled: boolean = false;

  private constructor() {}

  public static getInstance(): ClaudeConfig {
    if (!ClaudeConfig.instance) {
      ClaudeConfig.instance = new ClaudeConfig();
    }
    return ClaudeConfig.instance;
  }

  public enableClaudeSonnet(): void {
    this.isClaudeSonnetEnabled = true;
  }

  public isEnabled(): boolean {
    return this.isClaudeSonnetEnabled;
  }
}
