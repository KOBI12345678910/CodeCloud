export interface ReadmeSection {
  id: string;
  name: string;
  type: "api" | "install" | "usage" | "badges" | "config" | "contributing";
  autoUpdate: boolean;
  lastUpdated: string;
  content: string;
}

export interface ReadmePreview {
  sections: ReadmeSection[];
  markdown: string;
}

const sections: ReadmeSection[] = [
  {
    id: "s1", name: "Badges", type: "badges", autoUpdate: true,
    lastUpdated: new Date(Date.now() - 3600000).toISOString(),
    content: `![Build](https://img.shields.io/badge/build-passing-brightgreen)
![Coverage](https://img.shields.io/badge/coverage-94%25-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Version](https://img.shields.io/badge/version-2.4.3-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18-green)`,
  },
  {
    id: "s2", name: "Installation", type: "install", autoUpdate: true,
    lastUpdated: new Date(Date.now() - 7200000).toISOString(),
    content: `## Installation

\`\`\`bash
# Clone the repository
git clone https://github.com/codecloud/codecloud.git
cd codecloud

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env

# Run database migrations
pnpm run db:push

# Start the development server
pnpm run dev
\`\`\`

### Prerequisites
- Node.js >= 18.0.0
- pnpm >= 8.0.0
- PostgreSQL >= 15`,
  },
  {
    id: "s3", name: "API Documentation", type: "api", autoUpdate: true,
    lastUpdated: new Date(Date.now() - 1800000).toISOString(),
    content: `## API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | \`/api/auth/register\` | Register new user |
| POST | \`/api/auth/login\` | Login user |
| POST | \`/api/auth/logout\` | Logout user |
| GET | \`/api/auth/me\` | Get current user |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | \`/api/projects\` | List all projects |
| POST | \`/api/projects\` | Create project |
| GET | \`/api/projects/:id\` | Get project |
| PUT | \`/api/projects/:id\` | Update project |
| DELETE | \`/api/projects/:id\` | Delete project |

### Deployments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | \`/api/deploy\` | Create deployment |
| GET | \`/api/deployments/:id\` | Get deployment status |
| POST | \`/api/deployments/:id/rollback\` | Rollback deployment |`,
  },
  {
    id: "s4", name: "Usage Examples", type: "usage", autoUpdate: true,
    lastUpdated: new Date(Date.now() - 5400000).toISOString(),
    content: `## Usage

### Creating a Project
\`\`\`typescript
const response = await fetch('/api/projects', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'my-app',
    template: 'react-typescript',
  }),
});
const project = await response.json();
\`\`\`

### Deploying
\`\`\`typescript
const deploy = await fetch('/api/deploy', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    projectId: project.id,
    environment: 'production',
  }),
});
\`\`\``,
  },
  {
    id: "s5", name: "Configuration", type: "config", autoUpdate: false,
    lastUpdated: new Date(Date.now() - 86400000).toISOString(),
    content: `## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| \`DATABASE_URL\` | PostgreSQL connection string | — |
| \`PORT\` | Server port | 3000 |
| \`NODE_ENV\` | Environment | development |
| \`JWT_SECRET\` | JWT signing secret | — |
| \`CLERK_SECRET_KEY\` | Clerk authentication key | — |`,
  },
  {
    id: "s6", name: "Contributing", type: "contributing", autoUpdate: false,
    lastUpdated: new Date(Date.now() - 172800000).toISOString(),
    content: `## Contributing

1. Fork the repository
2. Create your feature branch (\`git checkout -b feature/amazing-feature\`)
3. Commit your changes (\`git commit -m 'Add amazing feature'\`)
4. Push to the branch (\`git push origin feature/amazing-feature\`)
5. Open a Pull Request`,
  },
];

export function getSections(projectId: string): ReadmeSection[] { return sections; }

export function generateReadme(projectId: string): ReadmePreview {
  const md = sections.map(s => s.content).join("\n\n");
  return { sections, markdown: `# CodeCloud\n\n${md}` };
}

export function toggleAutoUpdate(projectId: string, sectionId: string): ReadmeSection | null {
  const s = sections.find(x => x.id === sectionId);
  if (!s) return null;
  s.autoUpdate = !s.autoUpdate;
  return s;
}

export function updateSection(projectId: string, sectionId: string, content: string): ReadmeSection | null {
  const s = sections.find(x => x.id === sectionId);
  if (!s) return null;
  s.content = content;
  s.lastUpdated = new Date().toISOString();
  return s;
}

export function refreshSection(projectId: string, sectionId: string): ReadmeSection | null {
  const s = sections.find(x => x.id === sectionId);
  if (!s) return null;
  s.lastUpdated = new Date().toISOString();
  return s;
}
