/**
 * tsoa Authentication Middleware
 *
 * @description Provides authentication functions for tsoa framework.
 * Implements expressAuthenticationRecasted function required by tsoa.
 *
 * @author Heart Token API Team
 * @since 1.0.0
 */

import type { Request, Response } from 'express';
import {
  jwtAuthMiddleware,
  getAuthenticatedUser,
  type PassportUser,
} from './passport';

/**
 * tsoa Authentication function
 *
 * @description This function is called by tsoa for authentication.
 * It implements the expressAuthenticationRecasted function that tsoa expects.
 *
 * @param request - Express request object
 * @param securityName - Security scheme name (e.g., 'jwt')
 * @param scopes - Security scopes (not used for JWT)
 * @param response - Express response object
 * @returns Promise resolving to user object
 */
export const expressAuthenticationRecasted = async (
  request: Request,
  securityName: string,
  scopes: string[] | undefined,
  response: Response,
): Promise<PassportUser> => {
  return new Promise((resolve, reject) => {
    // Handle JWT authentication
    if (securityName === 'jwt') {
      jwtAuthMiddleware(request, response, (err: any) => {
        if (err) {
          reject(err);
          return;
        }

        const user = getAuthenticatedUser(request);
        if (!user) {
          const error = new Error('Authentication failed');
          (error as any).status = 401;
          reject(error);
          return;
        }

        resolve(user);
      });
    } else {
      // Unsupported security scheme
      const error = new Error(`Unsupported security scheme: ${securityName}`);
      (error as any).status = 401;
      reject(error);
    }
  });
};

/**
 * Authentication middleware factory
 *
 * @description Creates authentication middleware for specific security schemes.
 *
 * @param securityName - Security scheme name
 * @param scopes - Required scopes
 * @returns Express middleware function
 */
export const createAuthMiddleware = (
  securityName: string,
  scopes: string[] = [],
) => {
  return async (request: Request, response: Response, next: any) => {
    try {
      await expressAuthenticationRecasted(
        request,
        securityName,
        scopes,
        response,
      );
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Role-based authorization middleware
 *
 * @description Middleware to check if user has required role.
 *
 * @param requiredRoles - Array of required roles
 * @returns Express middleware function
 */
export const requireRole = (requiredRoles: string[]) => {
  return (request: Request, response: Response, next: any) => {
    const user = getAuthenticatedUser(request);

    if (!user) {
      const error = new Error('Authentication required');
      (error as any).status = 401;
      return next(error);
    }

    if (!requiredRoles.includes(user.role)) {
      const error = new Error('Insufficient permissions');
      (error as any).status = 403;
      return next(error);
    }

    next();
  };
};

/**
 * Admin role authorization middleware
 *
 * @description Middleware to check if user has admin role.
 *
 * @returns Express middleware function
 */
export const requireAdmin = () => {
  return requireRole(['admin']);
};

/**
 * Minter role authorization middleware
 *
 * @description Middleware to check if user has minter role.
 *
 * @returns Express middleware function
 */
export const requireMinter = () => {
  return requireRole(['minter', 'admin']);
};

/**
 * Pauser role authorization middleware
 *
 * @description Middleware to check if user has pauser role.
 *
 * @returns Express middleware function
 */
export const requirePauser = () => {
  return requireRole(['pauser', 'admin']);
};

/**
 * tsoa Authentication function (alternative name)
 *
 * @description This is an alias for expressAuthenticationRecasted to support
 * different tsoa configuration approaches.
 */
export const expressAuthentication = expressAuthenticationRecasted;
