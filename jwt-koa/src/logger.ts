import * as winston from "winston";
import "winston-daily-rotate-file";

const customFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-dd HH:mm:ss" }),
  winston.format.align(),
  winston.format.printf((i) => `${i.level}: ${[i.timestamp]}: ${i.message}`)
);
const defaultOptions = {
  format: customFormat,
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "14d",
};

export const globalLogger = winston.createLogger({
  format: customFormat,
  transports: [
    new winston.transports.Console(),
    new winston.transports.DailyRotateFile({
      filename: "logs/error-%DATE%.log",
      level: "error",
      ...defaultOptions,
    }),
    new winston.transports.DailyRotateFile({
      filename: "logs/info-%DATE%.log",
      level: "info",
      ...defaultOptions,
    }),
  ],
});
