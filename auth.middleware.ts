import { Elysia } from 'elysia';
import { importSPKI, jwtVerify } from 'jose';

export enum Role {
    ADMIN = 'ADMIN',
    FRANCHISE_OWNER = 'FRANCHISE_OWNER',
    STAFF = 'STAFF',
    CUSTOMER = 'CUSTOMER',
}

interface AuthMiddlewareOptions {
    allowedRoles?: Role[];
    env?: any;
}

export const createAuthMiddleware = (options: AuthMiddlewareOptions = {}) => {
    const { allowedRoles } = options;
    const env = options.env || process.env;

    return new Elysia({ name: 'auth-middleware' })
        .derive({ as: 'global' }, async ({ headers }) => {
            const authHeader = headers['authorization'];
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.split(' ')[1];
                if (!token) return { user: null };
                try {
                    const publicKeyContent = Buffer.from(env.JWT_PUBLIC_KEY_BASE64, 'base64').toString('utf-8');
                    const publicKey = await importSPKI(publicKeyContent, 'RS256');
                    const { payload } = await jwtVerify(token, publicKey);
                    return { user: payload };
                } catch {
                    return { user: null };
                }
            }
            return { user: null };
        })
        .onBeforeHandle({ as: 'global' }, async ({ headers, set, user }) => {
            console.log("authMiddleware: onBeforeHandle executing");
            const authHeader = headers['authorization'];

            if (!authHeader?.startsWith('Bearer ')) {
                console.log("authMiddleware: No Bearer token found");
                set.status = 401;
                return { message: 'Unauthorized - No Token' };
            }

            const token = authHeader.split(' ')[1];

            if (!token) {
                set.status = 401;
                return { message: 'Unauthorized - Empty Token' };
            }

            try {
                const publicKeyContent = Buffer.from(env.JWT_PUBLIC_KEY_BASE64, 'base64').toString('utf-8');
                const publicKey = await importSPKI(publicKeyContent, 'RS256');
                const { payload } = await jwtVerify(token, publicKey);

                console.log("authMiddleware: Token verified for user", payload);

                // Check role if allowedRoles is specified
                if (allowedRoles && allowedRoles.length > 0) {
                    // Extract roles from nested structure: payload.role[].role.role
                    const roleEntries = payload.role as Array<{ role: { role: string } }> | undefined;
                    const userRoles = roleEntries?.map(entry => entry.role?.role as Role).filter(Boolean) ?? [];
                    
                    const hasPermission = userRoles.some(role => allowedRoles.includes(role));
                    
                    if (!hasPermission) {
                        console.log("authMiddleware: Insufficient permissions. Required:", allowedRoles, "Got:", userRoles);
                        set.status = 403;
                        return { message: 'Forbidden - Insufficient permissions' };
                    }
                }
            } catch (error) {
                console.error("authMiddleware: Verification failed", error);
                set.status = 401;
                return { message: 'Unauthorized - Invalid Token' };
            }
        });
};

// Default middleware without role restrictions (backwards compatible)
export const authMiddleware = createAuthMiddleware();
