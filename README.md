# @good-food/utils

Shared utilities library for Good Food microservices.

## Installation

```bash
bun add @good-food/utils
```

## Usage

### Authentication Middleware

```typescript
import { Elysia } from 'elysia';
import { authMiddleware, createAuthMiddleware, Role } from '@good-food/utils';

const app = new Elysia()
  // Apply default auth middleware (just verifies JWT)
  .use(authMiddleware)
  .get('/protected', ({ user }) => {
    return { message: `Hello ${user?.email}` };
  });

// Or with role-based access control
const adminMiddleware = createAuthMiddleware({
  allowedRoles: [Role.ADMIN]
});

const app = new Elysia()
  .use(adminMiddleware)
  .get('/admin', ({ user }) => {
    return { message: 'Admin area' };
  });
```

### Available Roles

- `Role.ADMIN`
- `Role.FRANCHISE_OWNER`
- `Role.STAFF`
- `Role.CUSTOMER`

### Environment Variables

| Variable | Description |
|----------|-------------|
| `JWT_PUBLIC_KEY_BASE64` | Base64-encoded RS256 public key for JWT verification |

## Development

```bash
# Install dependencies
bun install

# Build the library
bun run build

# Run tests
bun test
```

## API Reference

### `createAuthMiddleware(options?)`

Creates an authentication middleware with optional role-based access control.

**Options:**
- `allowedRoles?: Role[]` - Optional array of roles that are permitted access

### `authMiddleware`

Default authentication middleware without role restrictions.

### `extractRoles(user)`

Helper function to extract roles from the user payload.

```typescript
import { extractRoles } from '@good-food/utils';

const roles = extractRoles(user);
// Returns: Role[]
```

## CI/CD

This package uses GitHub Actions for continuous integration and deployment.

### Automatic Build
Every push to `main` and all pull requests trigger:
- Dependency installation
- Build verification
- Test execution

### Publishing to npm
To publish a new version:

1. Update the version in `package.json`
2. Commit your changes
3. Create and push a version tag:
   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```

The GitHub Action will automatically build and publish to npm.

### Required Secrets
Add the following secret to your GitHub repository:

| Secret | Description |
|--------|-------------|
| `NPM_TOKEN` | npm access token with publish permissions |

To create an npm token:
1. Go to [npmjs.com](https://www.npmjs.com/) → Account Settings → Access Tokens
2. Generate a new "Automation" token
3. Add it as a repository secret in GitHub Settings → Secrets → Actions