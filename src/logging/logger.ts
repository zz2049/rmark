type ErrorContext = unknown;

const isDevelopment = import.meta.env.DEV;

function serializeError(context: ErrorContext): unknown {
  if (context instanceof Error) {
    return { name: context.name, message: context.message, stack: context.stack };
  }
  return context;
}

export const logger = {
  debug(message: string, context?: unknown): void {
    if (isDevelopment) console.debug(`[rmark] ${message}`, context ?? '');
  },
  error(message: string, context?: ErrorContext): void {
    console.error(`[rmark] ${message}`, serializeError(context));
  },
};
