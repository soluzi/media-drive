import type { Response } from "express";
import { ResponseKeys } from "../utils/response-keys";

export type ApiSuccess<T> = {
  success: true;
  data: T;
  pagination?: PageMeta;
  message?: string;
};
export type ApiFail = { success: false; message: string; code?: string };
export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiFail;

function send<T>(
  res: Response<ApiResponse<T>>,
  status: number,
  body: ApiResponse<T>
) {
  return res.status(status).json(body);
}

/* =========================
 * 2xx
 * =======================*/
export function ok<T>(res: Response<ApiResponse<T>>, data: T) {
  return send(res, 200, { success: true, data });
}
export function created<T>(res: Response<ApiResponse<T>>, data: T) {
  return send(res, 201, { success: true, data });
}
export function createdWithMessage<T>(
  res: Response<ApiResponse<T>>,
  data: T,
  message?: string
) {
  const msg = message ?? ResponseKeys.FILE_UPLOADED_SUCCESS;
  return send(res, 201, { success: true, data, message: msg });
}
export function accepted<T>(res: Response<ApiResponse<T>>, data: T) {
  return send(res, 202, { success: true, data });
}
export function noContent(res: Response) {
  return res.status(204).end();
}
export function okWithMessage<T>(
  res: Response<ApiResponse<T>>,
  data: T,
  message?: string
) {
  const msg = message ?? ResponseKeys.MEDIA_DELETED_SUCCESS;
  return send(res, 200, { success: true, data, message: msg });
}

/* =========================
 * 4xx
 * =======================*/
export function badRequest(res: Response, message?: string, code?: string) {
  const msg = message ?? ResponseKeys.BAD_REQUEST;
  return send(res, 400, {
    success: false,
    message: msg,
    ...(code ? { code } : {}),
  });
}
export function unauthorized(res: Response, message?: string, code?: string) {
  const msg = message ?? ResponseKeys.UNAUTHORIZED;
  return send(res, 401, {
    success: false,
    message: msg,
    ...(code ? { code } : {}),
  });
}
export function forbidden(res: Response, message?: string, code?: string) {
  const msg = message ?? ResponseKeys.FORBIDDEN;
  return send(res, 403, {
    success: false,
    message: msg,
    ...(code ? { code } : {}),
  });
}
export function notFound(res: Response, message?: string, code?: string) {
  const msg = message ?? ResponseKeys.NOT_FOUND;
  return send(res, 404, {
    success: false,
    message: msg,
    ...(code ? { code } : {}),
  });
}
export function conflict(res: Response, message?: string, code?: string) {
  const msg = message ?? ResponseKeys.CONFLICT;
  return send(res, 409, {
    success: false,
    message: msg,
    ...(code ? { code } : {}),
  });
}
export function gone(res: Response, message?: string, code?: string) {
  const msg = message ?? "errors.gone";
  return send(res, 410, {
    success: false,
    message: msg,
    ...(code ? { code } : {}),
  });
}
export function preconditionFailed(
  res: Response,
  message?: string,
  code?: string
) {
  const msg = message ?? "errors.precondition_failed";
  return send(res, 412, {
    success: false,
    message: msg,
    ...(code ? { code } : {}),
  });
}
export function unprocessableEntity(
  res: Response,
  message?: string,
  code?: string
) {
  const msg = message ?? "errors.unprocessable_entity";
  return send(res, 422, {
    success: false,
    message: msg,
    ...(code ? { code } : {}),
  });
}
export function tooManyRequests(
  res: Response,
  message?: string,
  code?: string
) {
  const msg = message ?? "errors.too_many_requests";
  return send(res, 429, {
    success: false,
    message: msg,
    ...(code ? { code } : {}),
  });
}

/* =========================
 * Convenience helpers for common errors
 * =======================*/
export function noFile(res: Response, message?: string) {
  return badRequest(res, message ?? ResponseKeys.NO_FILE, ResponseKeys.NO_FILE);
}

export function missingParameters(
  res: Response,
  message?: string,
  details?: string
) {
  const msg = message
    ? `${message}${details ? `: ${details}` : ""}`
    : ResponseKeys.MISSING_PARAMETERS;
  return badRequest(res, msg, ResponseKeys.MISSING_PARAMETERS);
}

export function missingId(res: Response, message?: string) {
  return badRequest(
    res,
    message ?? ResponseKeys.MISSING_ID,
    ResponseKeys.MISSING_ID
  );
}

export function fileTooLarge(
  res: Response,
  message?: string,
  maxSize?: number
) {
  const msg = message
    ? `${message}${maxSize ? ` (max: ${maxSize} bytes)` : ""}`
    : ResponseKeys.FILE_TOO_LARGE;
  return badRequest(res, msg, ResponseKeys.FILE_TOO_LARGE);
}

export function tooManyFiles(
  res: Response,
  message?: string,
  maxFiles?: number
) {
  const msg = message
    ? `${message}${maxFiles ? ` (max: ${maxFiles})` : ""}`
    : ResponseKeys.TOO_MANY_FILES;
  return badRequest(res, msg, ResponseKeys.TOO_MANY_FILES);
}

export function unexpectedFileField(
  res: Response,
  message?: string,
  fieldName?: string
) {
  const msg = message
    ? `${message}${fieldName ? `: ${fieldName}` : ""}`
    : ResponseKeys.UNEXPECTED_FILE_FIELD;
  return badRequest(res, msg, ResponseKeys.UNEXPECTED_FILE_FIELD);
}

export function uploadError(res: Response, message?: string) {
  return badRequest(
    res,
    message ?? ResponseKeys.UPLOAD_ERROR,
    ResponseKeys.UPLOAD_ERROR
  );
}

export function invalidFileType(res: Response, message?: string) {
  return badRequest(
    res,
    message ?? ResponseKeys.INVALID_FILE_TYPE,
    ResponseKeys.INVALID_FILE_TYPE
  );
}

export function validationError(res: Response, message?: string) {
  return badRequest(
    res,
    message ?? ResponseKeys.VALIDATION_ERROR,
    ResponseKeys.VALIDATION_ERROR
  );
}

/* =========================
 * 5xx
 * =======================*/
export function internalError(res: Response, message?: string, code?: string) {
  const msg = message ?? ResponseKeys.INTERNAL_ERROR;
  return send(res, 500, {
    success: false,
    message: msg,
    ...(code ? { code } : {}),
  });
}
export function notImplemented(res: Response, message?: string, code?: string) {
  const msg = message ?? "errors.not_implemented";
  return send(res, 501, {
    success: false,
    message: msg,
    ...(code ? { code } : {}),
  });
}
export function serviceUnavailable(
  res: Response,
  message?: string,
  code?: string
) {
  const msg = message ?? "errors.service_unavailable";
  return send(res, 503, {
    success: false,
    message: msg,
    ...(code ? { code } : {}),
  });
}

/* =========================
 * Pagination helpers
 * =======================*/
export type PageMeta = {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
};

export function buildPageMeta(
  total: number,
  page: number,
  perPage: number
): PageMeta {
  const total_pages = Math.max(1, Math.ceil(total / Math.max(1, perPage)));
  return { total, page, per_page: perPage, total_pages: total_pages };
}

/**
 * Returns:
 * {
 *   success: true,
 *   data: T[],
 *   pagination: { total, page, per_page, total_pages },
 *   ...rest (e.g., header)
 * }
 */
export function okPaginated<T>(
  res: Response<ApiResponse<any>>,
  payload: T[] | { data: T[]; [key: string]: unknown },
  total: number,
  page: number,
  perPage: number
) {
  const pagination = buildPageMeta(total, page, perPage);
  const base = Array.isArray(payload) ? { data: payload } : payload;
  return send(res, 200, { success: true, ...base, pagination });
}
