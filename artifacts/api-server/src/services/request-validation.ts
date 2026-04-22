export interface ValidationSchema {
  id: string;
  deploymentId: string;
  endpoint: string;
  method: string;
  schema: Record<string, any>;
  enabled: boolean;
  validations: number;
  failures: number;
  createdAt: Date;
}

class RequestValidationService {
  private schemas: Map<string, ValidationSchema> = new Map();

  create(deploymentId: string, endpoint: string, method: string, schema: Record<string, any>): ValidationSchema {
    const id = `vs-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const vs: ValidationSchema = {
      id, deploymentId, endpoint, method, schema, enabled: true,
      validations: 0, failures: 0, createdAt: new Date(),
    };
    this.schemas.set(id, vs);
    return vs;
  }

  validate(id: string, body: Record<string, any>): { valid: boolean; errors: string[] } {
    const vs = this.schemas.get(id);
    if (!vs) return { valid: false, errors: ["Schema not found"] };
    vs.validations++;
    const errors: string[] = [];

    if (vs.schema.required && Array.isArray(vs.schema.required)) {
      for (const field of vs.schema.required) {
        if (!(field in body)) errors.push(`Missing required field: ${field}`);
      }
    }

    if (vs.schema.properties) {
      for (const [key, def] of Object.entries(vs.schema.properties) as [string, any][]) {
        if (key in body) {
          if (def.type && typeof body[key] !== def.type) errors.push(`Field '${key}' expected ${def.type}, got ${typeof body[key]}`);
          if (def.minLength && typeof body[key] === "string" && body[key].length < def.minLength) errors.push(`Field '${key}' too short`);
          if (def.maxLength && typeof body[key] === "string" && body[key].length > def.maxLength) errors.push(`Field '${key}' too long`);
        }
      }
    }

    if (errors.length > 0) vs.failures++;
    return { valid: errors.length === 0, errors };
  }

  get(id: string): ValidationSchema | null { return this.schemas.get(id) || null; }
  list(deploymentId?: string): ValidationSchema[] {
    const all = Array.from(this.schemas.values());
    return deploymentId ? all.filter(s => s.deploymentId === deploymentId) : all;
  }
  delete(id: string): boolean { return this.schemas.delete(id); }

  getMetrics(): { totalValidations: number; totalFailures: number; failureRate: number } {
    let totalV = 0, totalF = 0;
    for (const s of this.schemas.values()) { totalV += s.validations; totalF += s.failures; }
    return { totalValidations: totalV, totalFailures: totalF, failureRate: totalV > 0 ? totalF / totalV : 0 };
  }
}

export const requestValidationService = new RequestValidationService();
