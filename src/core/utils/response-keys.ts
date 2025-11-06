/**
 * Common response message keys
 */
export const ResponseKeys = {
  // 4xx Client Errors
  BAD_REQUEST: "errors.bad_request",
  UNAUTHORIZED: "errors.unauthorized",
  FORBIDDEN: "errors.forbidden",
  NOT_FOUND: "errors.not_found",
  CONFLICT: "errors.conflict",

  // Upload/File Errors
  NO_FILE: "errors.no_file",
  MISSING_PARAMETERS: "errors.missing_parameters",
  MISSING_ID: "errors.missing_id",
  FILE_TOO_LARGE: "errors.file_too_large",
  TOO_MANY_FILES: "errors.too_many_files",
  UNEXPECTED_FILE_FIELD: "errors.unexpected_file_field",
  UPLOAD_ERROR: "errors.upload_error",
  INVALID_FILE_TYPE: "errors.invalid_file_type",
  VALIDATION_ERROR: "errors.validation_error",

  // 5xx Server Errors
  INTERNAL_ERROR: "errors.internal_error",

  // Success Messages
  FILE_UPLOADED_SUCCESS: "messages.file_uploaded_success",
  MEDIA_DELETED_SUCCESS: "messages.media_deleted_success",
} as const;

export type ResponseKey = (typeof ResponseKeys)[keyof typeof ResponseKeys];
