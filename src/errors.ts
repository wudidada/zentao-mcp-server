export class ZentaoMcpError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ZentaoMcpError";
  }
}

export class ValidationError extends ZentaoMcpError {
  constructor(message: string, cause?: unknown) {
    super(message, "VALIDATION_ERROR", cause);
    this.name = "ValidationError";
  }
}

export class AuthError extends ZentaoMcpError {
  constructor(message: string, cause?: unknown) {
    super(message, "AUTH_ERROR", cause);
    this.name = "AuthError";
  }
}

export class RemoteApiError extends ZentaoMcpError {
  constructor(
    message: string,
    public readonly statusCode?: number,
    cause?: unknown,
  ) {
    super(message, "REMOTE_API_ERROR", cause);
    this.name = "RemoteApiError";
  }
}
