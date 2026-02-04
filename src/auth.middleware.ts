import { Elysia } from 'elysia';
import { importSPKI, jwtVerify, type JWTPayload } from 'jose';

export enum Role {
    ADMIN = 'ADMIN',
    FRANCHISE_OWNER = 'FRANCHISE_OWNER',
    STAFF = 'STAFF',
    CUSTOMER = 'CUSTOMER',
}

export interface UserPayload extends JWTPayload {
    sub?: string;
    email?: string;
    role?: Array<{ role: { role: string } }>;
}

export interface AuthMiddlewareOptions {
    allowedRoles?: Role[];
}

/**
 * Creates an authentication middleware with optional role-based access control.
 * @param options - Configuration options for the middleware
 * @param options.allowedRoles - Optional array of roles that are permitted access
 * @returns Elysia plugin with authentication
 */
export const createAuthMiddleware = (options: AuthMiddlewareOptions = {}) => {
    const { allowedRoles } = options;

    return new Elysia({ name: 'auth-middleware' })
        .derive({ as: 'global' }, async ({ headers }): Promise<{ user: UserPayload | null }> => {
            const authHeader = headers['authorization'];
            
            if (!authHeader?.startsWith('Bearer ')) {
                return { user: null };
            }

            const token = authHeader.split(' ')[1];
            if (!token) {
                return { user: null };
            }

            try {
                const publicKeyBase64 = process.env.JWT_PUBLIC_KEY_BASE64;
                if (!publicKeyBase64) {
                    console.error('auth-middleware: JWT_PUBLIC_KEY_BASE64 environment variable is not set');
                    return { user: null };
                }

                const publicKeyContent = Buffer.from(publicKeyBase64, 'base64').toString('utf-8');
                const publicKey = await importSPKI(publicKeyContent, 'RS256');
                const { payload } = await jwtVerify(token, publicKey);
                
                return { user: payload as UserPayload };
            } catch (error) {
                console.error('auth-middleware: Token verification failed', error);
                return { user: null };
            }
        })
        .onBeforeHandle({ as: 'global' }, async ({ headers, set }) => {
            const authHeader = headers['authorization'];

            if (!authHeader?.startsWith('Bearer ')) {
                set.status = 401;
                return { message: 'Unauthorized - No Token' };
            }

            const token = authHeader.split(' ')[1];

            if (!token) {
                set.status = 401;
                return { message: 'Unauthorized - Empty Token' };
            }

            try {
                const publicKeyBase64 = process.env.JWT_PUBLIC_KEY_BASE64;
                if (!publicKeyBase64) {
                    console.error('auth-middleware: JWT_PUBLIC_KEY_BASE64 environment variable is not set');
                    set.status = 500;
                    return { message: 'Internal Server Error - Missing configuration' };
                }

                const publicKeyContent = Buffer.from(publicKeyBase64, 'base64').toString('utf-8');
                const publicKey = await importSPKI(publicKeyContent, 'RS256');
                const { payload } = await jwtVerify(token, publicKey);

                // Check role if allowedRoles is specified
                if (allowedRoles && allowedRoles.length > 0) {
                    const roleEntries = (payload as UserPayload).role;
                    const userRoles = roleEntries
                        ?.map(entry => entry.role?.role as Role)
                        .filter(Boolean) ?? [];

                    const hasPermission = userRoles.some(role => allowedRoles.includes(role));

                    if (!hasPermission) {
                        console.warn('auth-middleware: Insufficient permissions. Required:', allowedRoles, 'Got:', userRoles);
                        set.status = 403;
                        return { message: 'Forbidden - Insufficient permissions' };
                    }
                }

                // Authentication successful, continue to handler
                return;
            } catch (error) {
                console.error('auth-middleware: Verification failed', error);
                set.status = 401;
                return { message: 'Unauthorized - Invalid Token' };
            }
        });
};

/**
 * Default authentication middleware without role restrictions.
 * Use this when you only need to verify that the user is authenticated.
 */
export const authMiddleware = createAuthMiddleware();

/**
 * Helper to extract user roles from the JWT payload.
 * @param user - The user payload from the JWT
 * @returns Array of Role enums
 */
export const extractRoles = (user: UserPayload | null): Role[] => {
    if (!user?.role) return [];
    return user.role
        .map(entry => entry.role?.role as Role)
        .filter(Boolean);
};
