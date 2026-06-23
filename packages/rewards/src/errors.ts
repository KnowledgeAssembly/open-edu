export class RewardError extends Error {
  public readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'RewardError';
    this.code = code;
  }
}

export class RewardExecutionError extends RewardError {
  constructor(message: string) {
    super('REWARD_EXECUTION_ERROR', message);
    this.name = 'RewardExecutionError';
  }
}

export class RewardConfigurationError extends RewardError {
  constructor(message: string) {
    super('REWARD_CONFIGURATION_ERROR', message);
    this.name = 'RewardConfigurationError';
  }
}
