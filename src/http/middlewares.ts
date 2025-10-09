/**
 * HTTP Middlewares
 */

import { Request, Response, NextFunction } from "express";

/**
 * Example auth middleware factory
 */
export function createAuthMiddleware(
  authFn: (req: Request) => Promise<boolean> | boolean
) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const authorized = await authFn(req);

      if (!authorized) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      next();
    } catch (error) {
      res.status(500).json({ error: "Authentication failed" });
    }
  };
}

/**
 * CORS middleware for media endpoints
 */
export function corsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }

  next();
}
