export class LoggerError extends Error {
  public readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'LoggerError';
    this.code = code;
  }
}

export class LoggerConfigError extends LoggerError {
  constructor(message: string) {
    super('LOGGER_CONFIG_ERROR', message);
    this.name = 'LoggerConfigError';
  }
}

export class LoggerWriteError extends LoggerError {
  constructor(message: string) {
    super('LOGGER_WRITE_ERROR', message);
    this.name = 'LoggerWriteError';
  }
}
