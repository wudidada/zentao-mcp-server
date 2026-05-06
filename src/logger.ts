import pino from "pino";
import { config } from "./config.js";

const transport =
  process.env.NODE_ENV === "production"
    ? undefined
    : pino.transport({
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          destination: 2,
        },
      });

export const logger = pino({
  level: config.LOG_LEVEL,
  redact: {
    paths: [
      "*.password",
      "*.token",
      "*.authorization",
      "req.headers.authorization",
      "response.config.headers.Authorization",
    ],
    remove: true,
  },
}, transport ?? pino.destination(2));
