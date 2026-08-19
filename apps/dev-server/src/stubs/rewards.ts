export const REWARDS_VERSION = '0.0.0';

export class RewardBroker {
  constructor() {}
  start(): void {}
  stop(): void {}
  evaluate(): void {}
}

export class BadgeTracker {
  constructor() {}
  start(): void {}
  stop(): void {}
}

export function handleBadgeAction(): void {}
export function handleWebhookAction(): void {}

export function verifyReceipt(): { valid: false; reason: string } {
  return { valid: false, reason: 'not available in browser mode' }
}

export function replayRewards(): { replayed: number } {
  return { replayed: 0 }
}

export class RewardError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RewardError'
  }
}
export class RewardExecutionError extends RewardError {}
export class RewardConfigurationError extends RewardError {}

export function evaluateCondition(): boolean {
  return false
}
export function shouldFireAction(): boolean {
  return false
}
export function getDefaultContext(): Record<string, never> {
  return {}
}
