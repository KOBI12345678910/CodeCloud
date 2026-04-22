import type { Request } from "express";
import type { User, Project } from "@workspace/db";

export interface AuthenticatedRequest extends Request {
  userId: string;
  user: User;
  project?: Project;
  projectRole?: "viewer" | "editor" | "admin";
}
