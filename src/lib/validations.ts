/**
 * Global input validation and sanitization utilities
 * Enforces security, formats, and character limits
 */

// Mobile number: exactly 10 digits
export const MOBILE_REGEX = /^[6-9]\d{9}$/;

// Standard email format
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Allowed image MIME types and extensions
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/jpg"];
export const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png"];
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Strips non-digit characters and ensures maximum 10 digits.
 */
export function sanitizeMobileNumber(value: string): string {
  return value.replace(/\D/g, "").slice(0, 10);
}

/**
 * Validates 10-digit mobile number format.
 */
export function isValidMobileNumber(value: string): boolean {
  return /^\d{10}$/.test(value.trim());
}

/**
 * Validates standard email address format.
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Trims input and removes control characters / malicious null bytes.
 * Prevents basic injection / corrupted input before reaching API.
 */
export function sanitizeTextInput(value: string, maxLength?: number): string {
  if (!value) return "";
  let clean = value.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, "").trim();
  if (typeof maxLength === "number" && maxLength > 0) {
    clean = clean.slice(0, maxLength);
  }
  return clean;
}

/**
 * Sanitizes numeric input to ensure it is never negative or less than minimum.
 */
export function sanitizeNonNegativeNumber(
  value: string | number,
  fallback = 0,
  min = 0
): number {
  if (value === "" || value === null || value === undefined) return fallback;
  const num = typeof value === "number" ? value : parseInt(String(value).trim(), 10);
  if (isNaN(num)) return fallback;
  return Math.max(min, num);
}

/**
 * Validates an image file before upload:
 * - Must be PNG, JPG, or JPEG
 * - Must not exceed 5 MB
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: "No file provided" };
  }

  // Strictly check file size (5MB max)
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `File size exceeds 5 MB limit (current: ${sizeInMb} MB). Please upload an image up to 5 MB.`,
    };
  }

  // Check file extension strictly - only .png, .jpg, .jpeg
  const fileName = file.name.toLowerCase();
  const hasValidExt = ALLOWED_IMAGE_EXTENSIONS.some((ext) => fileName.endsWith(ext));

  // Check MIME type if present (must strictly match image/jpeg or image/png, reject webp etc.)
  const mimeType = (file.type || "").toLowerCase().trim();
  const hasValidType = !mimeType || ALLOWED_IMAGE_TYPES.includes(mimeType);

  if (!hasValidExt || !hasValidType) {
    return {
      valid: false,
      error: "Only .png, .jpg, and .jpeg image formats are allowed (WEBP and other formats are not supported).",
    };
  }

  return { valid: true };
}
