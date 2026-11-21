export function isRecord(value: unknown): value is object {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function extractErrorMessage(body: unknown): string | undefined {
  if (!isRecord(body)) {
    return undefined;
  }
  if ("message" in body) {
    const message = asNonEmptyString(body.message);
    if (message) {
      return message;
    }
  }
  if ("error" in body) {
    const error = asNonEmptyString(body.error);
    if (error) {
      return error;
    }
  }
  if ("details" in body) {
    const details = asNonEmptyString(body.details);
    if (details) {
      return details;
    }
  }
  return undefined;
}

export function createEmptyPage<T>(size: number, content: Array<T> = []) {
  return {
    content,
    page: 1,
    size,
    totalElements: 0,
    totalPages: 0,
    first: true,
    last: true,
    hasNext: false,
    hasPrevious: false,
  };
}
