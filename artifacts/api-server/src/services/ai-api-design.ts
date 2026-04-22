export interface APIEndpoint {
  method: string;
  path: string;
  summary: string;
  requestBody?: { type: string; properties: Record<string, { type: string; required?: boolean; description?: string }> };
  responses: Record<string, { description: string; schema?: string }>;
  tags: string[];
}

export interface APIDesignResult {
  title: string;
  version: string;
  baseUrl: string;
  endpoints: APIEndpoint[];
  openApiSpec: string;
  suggestions: string[];
}

export function generateAPIDesign(description: string): APIDesignResult {
  const lower = description.toLowerCase();
  const isAuth = lower.includes("auth") || lower.includes("user") || lower.includes("login");
  const isCrud = lower.includes("crud") || lower.includes("resource") || lower.includes("manage");
  const isEcommerce = lower.includes("product") || lower.includes("shop") || lower.includes("cart") || lower.includes("order");

  let endpoints: APIEndpoint[] = [];
  let title = "API";
  const suggestions: string[] = [];

  if (isEcommerce) {
    title = "E-Commerce API";
    endpoints = [
      { method: "GET", path: "/products", summary: "List all products with pagination", responses: { "200": { description: "Paginated product list", schema: "Product[]" } }, tags: ["Products"] },
      { method: "GET", path: "/products/{id}", summary: "Get product by ID", responses: { "200": { description: "Product details" }, "404": { description: "Product not found" } }, tags: ["Products"] },
      { method: "POST", path: "/products", summary: "Create a new product", requestBody: { type: "object", properties: { name: { type: "string", required: true, description: "Product name" }, price: { type: "number", required: true, description: "Price in cents" }, description: { type: "string", description: "Product description" }, category: { type: "string", description: "Product category" } } }, responses: { "201": { description: "Product created" }, "400": { description: "Validation error" } }, tags: ["Products"] },
      { method: "POST", path: "/cart/items", summary: "Add item to cart", requestBody: { type: "object", properties: { productId: { type: "string", required: true }, quantity: { type: "integer", required: true } } }, responses: { "200": { description: "Cart updated" } }, tags: ["Cart"] },
      { method: "POST", path: "/orders", summary: "Create order from cart", requestBody: { type: "object", properties: { shippingAddress: { type: "object", required: true }, paymentMethod: { type: "string", required: true } } }, responses: { "201": { description: "Order created" }, "402": { description: "Payment failed" } }, tags: ["Orders"] },
      { method: "GET", path: "/orders/{id}", summary: "Get order status", responses: { "200": { description: "Order details" } }, tags: ["Orders"] },
    ];
    suggestions.push("Add rate limiting to prevent cart abuse", "Use ETags for product caching", "Implement webhook notifications for order status changes", "Add cursor-based pagination for product listings");
  } else if (isAuth) {
    title = "Auth API";
    endpoints = [
      { method: "POST", path: "/auth/register", summary: "Register a new user", requestBody: { type: "object", properties: { email: { type: "string", required: true }, password: { type: "string", required: true }, name: { type: "string", required: true } } }, responses: { "201": { description: "User created" }, "409": { description: "Email already exists" } }, tags: ["Auth"] },
      { method: "POST", path: "/auth/login", summary: "Authenticate user", requestBody: { type: "object", properties: { email: { type: "string", required: true }, password: { type: "string", required: true } } }, responses: { "200": { description: "JWT token pair" }, "401": { description: "Invalid credentials" } }, tags: ["Auth"] },
      { method: "POST", path: "/auth/refresh", summary: "Refresh access token", requestBody: { type: "object", properties: { refreshToken: { type: "string", required: true } } }, responses: { "200": { description: "New token pair" } }, tags: ["Auth"] },
      { method: "GET", path: "/users/me", summary: "Get current user profile", responses: { "200": { description: "User profile" }, "401": { description: "Unauthorized" } }, tags: ["Users"] },
      { method: "PATCH", path: "/users/me", summary: "Update current user", requestBody: { type: "object", properties: { name: { type: "string" }, avatar: { type: "string" } } }, responses: { "200": { description: "Updated profile" } }, tags: ["Users"] },
    ];
    suggestions.push("Use bcrypt with salt rounds >= 12 for password hashing", "Implement refresh token rotation", "Add rate limiting on login endpoint", "Consider adding OAuth2 social login support");
  } else {
    title = isCrud ? "Resource API" : "General API";
    const resource = lower.match(/(?:manage|crud|api for)\s+(\w+)/)?.[1] || "items";
    endpoints = [
      { method: "GET", path: `/${resource}`, summary: `List all ${resource}`, responses: { "200": { description: `Paginated ${resource} list` } }, tags: [resource] },
      { method: "GET", path: `/${resource}/{id}`, summary: `Get ${resource} by ID`, responses: { "200": { description: `${resource} details` }, "404": { description: "Not found" } }, tags: [resource] },
      { method: "POST", path: `/${resource}`, summary: `Create a new ${resource.slice(0, -1) || resource}`, requestBody: { type: "object", properties: { name: { type: "string", required: true }, description: { type: "string" } } }, responses: { "201": { description: "Created" }, "400": { description: "Validation error" } }, tags: [resource] },
      { method: "PUT", path: `/${resource}/{id}`, summary: `Update ${resource.slice(0, -1) || resource}`, requestBody: { type: "object", properties: { name: { type: "string" }, description: { type: "string" } } }, responses: { "200": { description: "Updated" }, "404": { description: "Not found" } }, tags: [resource] },
      { method: "DELETE", path: `/${resource}/{id}`, summary: `Delete ${resource.slice(0, -1) || resource}`, responses: { "204": { description: "Deleted" }, "404": { description: "Not found" } }, tags: [resource] },
    ];
    suggestions.push("Use plural nouns for resource names", "Return 204 No Content for successful deletes", "Implement filtering with query parameters", "Add HATEOAS links for discoverability");
  }

  const spec = JSON.stringify({
    openapi: "3.0.3",
    info: { title, version: "1.0.0" },
    servers: [{ url: "https://api.example.com/v1" }],
    paths: Object.fromEntries(endpoints.map(e => [`${e.path}`, { [e.method.toLowerCase()]: { summary: e.summary, tags: e.tags, responses: e.responses } }])),
  }, null, 2);

  return { title, version: "1.0.0", baseUrl: "/api/v1", endpoints, openApiSpec: spec, suggestions };
}

export function generateClientSDK(endpoints: APIEndpoint[]): string {
  const lines = ['class APIClient {', '  constructor(private baseUrl: string, private token?: string) {}', '', '  private async request(method: string, path: string, body?: any) {', '    const res = await fetch(`${this.baseUrl}${path}`, {', '      method,', '      headers: { "Content-Type": "application/json", ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}) },', '      ...(body ? { body: JSON.stringify(body) } : {}),', '    });', '    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);', '    return res.status === 204 ? null : res.json();', '  }', ''];
  endpoints.forEach(e => {
    const name = e.method.toLowerCase() + e.path.replace(/[/{}-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').split('_').map((w, i) => i === 0 ? w : w[0].toUpperCase() + w.slice(1)).join('');
    const hasId = e.path.includes('{id}');
    const hasBody = !!e.requestBody;
    const params = [hasId ? 'id: string' : '', hasBody ? 'body: any' : ''].filter(Boolean).join(', ');
    const path = hasId ? `\`${e.path.replace('{id}', '${id}')}\`` : `"${e.path}"`;
    lines.push(`  async ${name}(${params}) { return this.request("${e.method}", ${path}${hasBody ? ', body' : ''}); }`);
  });
  lines.push('}');
  return lines.join('\n');
}
