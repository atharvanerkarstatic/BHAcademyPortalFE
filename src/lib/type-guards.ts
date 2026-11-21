export type JsonObject = { [key: string]: unknown };

export function isRecord(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getStringProp(obj: JsonObject, key: string): string | undefined {
  const val = obj[key];
  return typeof val === "string" ? val : undefined;
}

export function getNonEmptyStringProp(obj: JsonObject, key: string): string | undefined {
  const val = obj[key];
  if (typeof val !== "string") {
    return undefined;
  }
  const trimmed = val.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function extractErrorMessage(body: unknown): string | undefined {
  if (!isRecord(body)) {
    return undefined;
  }
  return (
    getNonEmptyStringProp(body, "message") ??
    getNonEmptyStringProp(body, "error") ??
    getNonEmptyStringProp(body, "details")
  );
}

export function createEmptyPage<T>(size: number) {
  return {
    content: [] as Array<T>,
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
