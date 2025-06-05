import {ClaudeConfig} from '../models/ClaudeConfig';

export class ClaudeService {
  private config: ClaudeConfig;

  constructor() {
    this.config = ClaudeConfig.getInstance();
  }

  public enableSonnetForAllClients(): void {
    this.config.enableClaudeSonnet();
  }

  public isSonnetEnabled(): boolean {
    return this.config.isEnabled();
  }
}
