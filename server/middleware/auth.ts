import "dotenv/config";
import { clerkMiddleware, getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";

export const clerkAuth = clerkMiddleware({
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  secretKey: process.env.CLERK_SECRET_KEY,
});

export function requireClerkAuth(req: Request, res: Response, next: NextFunction) {
  const configured = Boolean(process.env.CLERK_SECRET_KEY && process.env.CLERK_PUBLISHABLE_KEY);
  if (!configured) {
    return next();
  }

  const auth = getAuth(req);
  if (!auth.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  return next();
}

export function getClerkUserId(req: Request): string | null {
  const auth = getAuth(req);
  return auth.userId ?? null;
}
