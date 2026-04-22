import type { Request, Response } from "express";
import { interpolate } from "@workspace/i18n";
import { loadServerBundle } from "../services/i18n";

export type ErrorKey =
  | "errors.generic"
  | "errors.network"
  | "errors.unauthorized"
  | "errors.forbidden"
  | "errors.notFound"
  | "errors.validation"
  | "errors.rateLimit"
  | "errors.server"
  | "errors.payment"
  | "errors.quota"
  | "errors.auth.invalidCredentials"
  | "errors.auth.emailTaken"
  | "errors.auth.usernameTaken"
  | "errors.auth.userNotFound"
  | "errors.auth.locked"
  | "errors.auth.lockedJustNow"
  | "errors.auth.oauthOnly"
  | "errors.auth.passwordOauth"
  | "errors.auth.passwordCurrentWrong"
  | "errors.auth.resetTokenInvalid"
  | "errors.auth.resetTokenExpired";

const STATUS: Record<ErrorKey, number> = {
  "errors.generic": 500,
  "errors.network": 503,
  "errors.unauthorized": 401,
  "errors.forbidden": 403,
  "errors.notFound": 404,
  "errors.validation": 400,
  "errors.rateLimit": 429,
  "errors.server": 500,
  "errors.payment": 402,
  "errors.quota": 402,
  "errors.auth.invalidCredentials": 401,
  "errors.auth.emailTaken": 409,
  "errors.auth.usernameTaken": 409,
  "errors.auth.userNotFound": 401,
  "errors.auth.locked": 423,
  "errors.auth.lockedJustNow": 423,
  "errors.auth.oauthOnly": 401,
  "errors.auth.passwordOauth": 400,
  "errors.auth.passwordCurrentWrong": 401,
  "errors.auth.resetTokenInvalid": 400,
  "errors.auth.resetTokenExpired": 400,
};

export function localizedError(
  req: Request,
  key: ErrorKey,
  params?: Record<string, unknown>,
): { status: number; body: { error: string; message: string; locale: string } } {
  const locale = req.locale ?? "en";
  const bundle = loadServerBundle(locale) ?? {};
  const enBundle = loadServerBundle("en") ?? {};
  const template = (bundle[key] as string | undefined) ?? (enBundle[key] as string | undefined) ?? key;
  const message = interpolate(template, params);
  return {
    status: STATUS[key],
    body: { error: key, message, locale },
  };
}

export function sendLocalizedError(
  req: Request,
  res: Response,
  key: ErrorKey,
  params?: Record<string, unknown>,
): void {
  const { status, body } = localizedError(req, key, params);
  res.status(status).json(body);
}
