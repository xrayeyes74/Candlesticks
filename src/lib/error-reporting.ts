type ErrorReportOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

/**
 * Report errors for debugging and monitoring.
 * In production, integrate with your preferred error tracking service (Sentry, LogRocket, etc.)
 */
export function reportError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  
  // Log to console in development
  if (import.meta.env.DEV) {
    console.error("Reported error:", error, context);
  }

  // Extract error message
  const message =
    error instanceof Response
      ? `Response ${error.status}${error.url ? ` at ${error.url}` : ""}`
      : error instanceof Error
        ? error.message
        : String(error);

  // TODO: Integrate with error tracking service
  // Example: Sentry.captureException(error, { contexts: { custom: context } });
  
  // For now, just log the error details
  console.error("Error reported:", {
    message,
    stack: error instanceof Error ? error.stack : undefined,
    pathname: window.location.pathname,
    ...context,
  });
}
