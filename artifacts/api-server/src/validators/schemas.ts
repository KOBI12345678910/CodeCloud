import { z } from "zod";

export const RegisterSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain uppercase letter")
    .regex(/[a-z]/, "Must contain lowercase letter")
    .regex(/\d/, "Must contain a number"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Only letters, numbers, _, -"),
  displayName: z.string().max(100).optional(),
});

export const LoginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
  twoFactorCode: z.string().optional(),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "refreshToken is required"),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "currentPassword is required"),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain uppercase letter")
    .regex(/[a-z]/, "Must contain lowercase letter")
    .regex(/\d/, "Must contain a number"),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email("Invalid email format"),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain uppercase letter")
    .regex(/[a-z]/, "Must contain lowercase letter")
    .regex(/\d/, "Must contain a number"),
});

export const CreateProjectSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name too long")
    .regex(/^[a-zA-Z0-9_\- .]+$/, "Invalid characters in name"),
  language: z.enum([
    "javascript",
    "typescript",
    "python",
    "html",
    "go",
    "rust",
    "java",
    "cpp",
  ]),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().optional().default(true),
  templateId: z.string().uuid().optional(),
});

export const CreateFileSchema = z.object({
  name: z
    .string()
    .min(1, "Filename is required")
    .max(255)
    .regex(/^[^<>:"|?*\\]+$/, "Invalid filename characters"),
  path: z.string().min(1, "Path is required").max(1000),
  content: z.string().optional().default(""),
  isDirectory: z.boolean().optional().default(false),
});

export const UpdateFileSchema = z.object({
  content: z.string().optional(),
  name: z.string().min(1).max(255).optional(),
});

export const MoveFileSchema = z.object({
  newPath: z.string().min(1).max(1000),
  newName: z.string().min(1).max(255).optional(),
});

export const DeploySchema = z.object({
  subdomain: z
    .string()
    .min(3, "Subdomain must be at least 3 characters")
    .max(63, "Subdomain too long")
    .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, "Invalid subdomain format")
    .optional(),
  environment: z.enum(["production", "staging", "preview"]).optional().default("production"),
});

export const AddSecretSchema = z.object({
  key: z
    .string()
    .min(1, "Key is required")
    .max(100)
    .regex(/^[A-Z_][A-Z0-9_]*$/, "Key must be UPPER_SNAKE_CASE"),
  value: z.string().min(1, "Value is required").max(10000),
});

export const InviteCollaboratorSchema = z.object({
  email: z.string().email("Invalid email"),
  role: z.enum(["viewer", "editor", "admin"]).optional().default("viewer"),
});

export const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().optional(),
  runCommand: z.string().max(500).optional(),
  entryFile: z.string().max(255).optional(),
});

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const SearchSchema = z.object({
  query: z.string().min(1).max(200),
  language: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export const FormatCodeSchema = z.object({
  code: z.string(),
  language: z.string().optional(),
  filename: z.string().optional(),
  options: z
    .object({
      tabWidth: z.number().int().min(1).max(8).optional(),
      useTabs: z.boolean().optional(),
      printWidth: z.number().int().min(40).max(200).optional(),
      singleQuote: z.boolean().optional(),
      semi: z.boolean().optional(),
      trailingComma: z.enum(["all", "es5", "none"]).optional(),
    })
    .optional(),
});

export const CreateApiKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  scopes: z.string().optional().default("read"),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

export const FeedbackSchema = z.object({
  type: z.enum(["bug", "feature", "improvement"]),
  description: z.string().min(10, "Please provide more details").max(5000),
  severity: z.enum(["low", "medium", "high", "critical"]).optional().default("medium"),
  email: z.string().email().optional(),
  projectId: z.string().uuid().optional(),
});

export const CommentSchema = z.object({
  content: z.string().min(1).max(5000),
  projectId: z.string().uuid(),
  fileId: z.string().uuid().optional(),
  parentId: z.string().uuid().optional(),
});

export function validateBody<T>(schema: z.ZodType<T>) {
  return (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: "Validation failed",
        details: result.error.issues.map((issue: z.ZodIssue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery<T>(schema: z.ZodType<T>) {
  return (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json({
        error: "Invalid query parameters",
        details: result.error.issues.map((issue: z.ZodIssue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
      return;
    }
    (req as unknown as Record<string, unknown>).validatedQuery = result.data;
    next();
  };
}

export function validateParams<T>(schema: z.ZodType<T>) {
  return (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      res.status(400).json({
        error: "Invalid path parameters",
        details: result.error.issues.map((issue: z.ZodIssue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
      return;
    }
    next();
  };
}
