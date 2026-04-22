import { ZodError } from "zod";
import { ZentaoMcpError } from "../errors.js";

export function success(data: unknown, title?: string) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            ok: true,
            title,
            data,
          },
          null,
          2,
        ),
      },
    ],
  };
}

export function failure(error: unknown) {
  const normalized = normalizeError(error);
  return {
    isError: true,
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            ok: false,
            error: normalized,
          },
          null,
          2,
        ),
      },
    ],
  };
}

function normalizeError(error: unknown): { code: string; message: string } {
  if (error instanceof ZentaoMcpError) {
    return {
      code: error.code,
      message: error.message,
    };
  }

  if (error instanceof ZodError) {
    return {
      code: "VALIDATION_ERROR",
      message: error.issues.map((item) => item.message).join("; "),
    };
  }

  if (error instanceof Error) {
    return {
      code: "UNKNOWN_ERROR",
      message: error.message,
    };
  }

  return {
    code: "UNKNOWN_ERROR",
    message: "未知错误。",
  };
}
