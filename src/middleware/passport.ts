/**
 * Passport.js Configuration for JWT Authentication
 *
 * @description Configures Passport.js with JWT strategy for authentication.
 * Handles JWT token verification and user extraction.
 *
 * @author Heart Token API Team
 * @since 1.0.0
 */

import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import jwt from 'jsonwebtoken';
import type { Request } from 'express';

// Note: Using global namespace extension causes conflicts with @types/passport
// Instead, we'll use type assertions when accessing req.user

/**
 * JWT Payload interface
 *
 * @description Defines the structure of JWT token payload.
 */
export interface JwtPayload {
  /** User ID (primaryDid) */
  sub: string;
  /** User address (Flow address, optional for email auth) */
  address?: string;
  /** User email (optional for Flow wallet auth) */
  email?: string;
  /** Authentication method */
  authMethod: 'flow' | 'email' | 'did';
  /** User role */
  role: 'user' | 'admin' | 'minter' | 'pauser';
  /** Token issued timestamp */
  iat: number;
  /** Token expiration timestamp */
  exp: number;
}

/**
 * User interface for Passport
 *
 * @description Defines the user object structure for Passport.js.
 */
export interface PassportUser {
  /** User ID (primaryDid) */
  id: string;
  /** User address (Flow address, optional for email auth) */
  address?: string;
  /** User email (optional for Flow wallet auth) */
  email?: string;
  /** Authentication method */
  authMethod: 'flow' | 'email' | 'did';
  /** User role */
  role: 'user' | 'admin' | 'minter' | 'pauser';
}

/**
 * JWT Secret from environment variables
 */
const JWT_SECRET =
  process.env.JWT_SECRET ||
  'your-super-secret-jwt-key-change-this-in-production';

/**
 * JWT Strategy configuration
 *
 * @description Configures JWT strategy for Passport.js authentication.
 * Extracts JWT token from Authorization header and verifies it.
 */
const jwtStrategy = new JwtStrategy(
  {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: JWT_SECRET,
    algorithms: ['HS256'],
  },
  async (payload: JwtPayload, done) => {
    try {
      // Verify token is not expired
      if (payload.exp < Date.now() / 1000) {
        return done(null, false, { message: 'Token expired' });
      }

      // Create user object
      const user: PassportUser = {
        id: payload.sub,
        authMethod: payload.authMethod,
        role: payload.role,
        ...(payload.address && { address: payload.address }),
        ...(payload.email && { email: payload.email }),
      };

      return done(null, user);
    } catch (error) {
      return done(error, false);
    }
  }
);

/**
 * Initialize Passport.js
 *
 * @description Initializes Passport.js with JWT strategy.
 * This function should be called during application startup.
 */
export const initializePassport = (): void => {
  // Use JWT strategy
  passport.use('jwt', jwtStrategy);

  // Serialize user for session (not used in stateless JWT)
  passport.serializeUser((user: any, done) => {
    done(null, user);
  });

  // Deserialize user from session (not used in stateless JWT)
  passport.deserializeUser((user: any, done) => {
    done(null, user);
  });
};

/**
 * JWT Authentication middleware
 *
 * @description Express middleware for JWT authentication using Passport.js.
 * This middleware should be used with tsoa authentication.
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const jwtAuthMiddleware = (req: Request, res: any, next: any): void => {
  passport.authenticate(
    'jwt',
    { session: false },
    (err: any, user: PassportUser | false, info: any) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        const error = new Error('Unauthorized');
        (error as any).status = 401;
        (error as any).message = info?.message || 'Invalid or missing token';
        return next(error);
      }

      // Add user to request object
      (req as any).user = user;
      console.log('Passport middleware - User set to request:', user);
      console.log(
        'Passport middleware - Request user property:',
        (req as any).user
      );
      next();
    }
  )(req, res, next);
};

/**
 * Generate JWT token
 *
 * @description Generates a JWT token for authenticated user.
 *
 * @param userId - User ID (primaryDid)
 * @param authMethod - Authentication method
 * @param role - User role
 * @param address - User address (for Flow wallet auth)
 * @param email - User email (for email/password auth)
 * @returns JWT token string
 */
export const generateJwtToken = (
  userId: string,
  authMethod: 'flow' | 'email' | 'did',
  role: 'user' | 'admin' | 'minter' | 'pauser' = 'user',
  address?: string,
  email?: string
): string => {
  const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
    sub: userId,
    authMethod,
    role,
    ...(address && { address }),
    ...(email && { email }),
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '24h',
  });
};

/**
 * Verify JWT token
 *
 * @description Verifies a JWT token and returns the payload.
 *
 * @param token - JWT token string
 * @returns JWT payload or null if invalid
 */
export const verifyJwtToken = (token: string): JwtPayload | null => {
  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
    }) as JwtPayload;
    return payload;
  } catch {
    return null;
  }
};

/**
 * Extract user from request
 *
 * @description Extracts user information from authenticated request.
 *
 * @param req - Express request object
 * @returns User information or null if not authenticated
 */
export const getAuthenticatedUser = (req: Request): PassportUser | null => {
  return (req as any).user || null;
};

// Export Passport instance
export { passport };
