import {ClaudeService} from '../services/ClaudeService';

export class ClaudeController {
  private claudeService: ClaudeService;

  constructor() {
    this.claudeService = new ClaudeService();
  }

  public enableClaudeSonnet(): void {
    this.claudeService.enableSonnetForAllClients();
  }
}
