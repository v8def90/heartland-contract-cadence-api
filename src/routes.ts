/* tslint:disable */
/* eslint-disable */
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import type { TsoaRoute } from '@tsoa/runtime';
import {  fetchMiddlewares, ExpressTemplateService } from '@tsoa/runtime';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { UnpauseController } from './controllers/transactions/UnpauseController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { TransferController } from './controllers/transactions/TransferController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { SetupController } from './controllers/transactions/SetupController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { SetTreasuryController } from './controllers/transactions/SetTreasuryController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { SetTaxRateController } from './controllers/transactions/SetTaxRateController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { PauseController } from './controllers/transactions/PauseController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { MintController } from './controllers/transactions/MintController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { BurnController } from './controllers/transactions/BurnController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { BatchTransferController } from './controllers/transactions/BatchTransferController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { UsersController } from './controllers/sns/UsersController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { SearchController } from './controllers/sns/SearchController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { PostsController } from './controllers/sns/PostsController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { LikesController } from './controllers/sns/LikesController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { FollowsController } from './controllers/sns/FollowsController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { FeedController } from './controllers/sns/FeedController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { CommentsController } from './controllers/sns/CommentsController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { TokenInfoController } from './controllers/queries/TokenInfoController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { JobController } from './controllers/queries/JobController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { BalanceController } from './controllers/queries/BalanceController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { AdminController } from './controllers/queries/AdminController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { AuthController } from './controllers/auth/AuthController';
import { expressAuthentication } from './middleware/auth';
// @ts-ignore - no great way to install types from subpackage
import type { Request as ExRequest, Response as ExResponse, RequestHandler, Router } from 'express';

const expressAuthenticationRecasted = expressAuthentication as (req: ExRequest, securityName: string, scopes?: string[], res?: ExResponse) => Promise<any>;


// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

const models: TsoaRoute.Models = {
    "TransactionJobData": {
        "dataType": "refObject",
        "properties": {
            "jobId": {"dataType":"string","required":true},
            "status": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["queued"]},{"dataType":"enum","enums":["processing"]},{"dataType":"enum","enums":["completed"]},{"dataType":"enum","enums":["failed"]},{"dataType":"enum","enums":["cancelled"]}],"required":true},
            "type": {"dataType":"string","required":true},
            "estimatedCompletionTime": {"dataType":"string"},
            "trackingUrl": {"dataType":"string","required":true},
            "queuePosition": {"dataType":"double"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SuccessResponse_TransactionJobData_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"ref":"TransactionJobData","required":true},
            "timestamp": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiError": {
        "dataType": "refObject",
        "properties": {
            "code": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "details": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ErrorResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[false],"required":true},
            "error": {"ref":"ApiError","required":true},
            "timestamp": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_TransactionJobData_": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"ref":"SuccessResponse_TransactionJobData_"},{"ref":"ErrorResponse"}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TransferRequest": {
        "dataType": "refObject",
        "properties": {
            "recipient": {"dataType":"string","required":true},
            "amount": {"dataType":"string","required":true},
            "memo": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SetupAccountRequest": {
        "dataType": "refObject",
        "properties": {
            "address": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SetTreasuryRequest": {
        "dataType": "refObject",
        "properties": {
            "newTreasuryAccount": {"dataType":"string","required":true},
            "memo": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SetTaxRateRequest": {
        "dataType": "refObject",
        "properties": {
            "newTaxRate": {"dataType":"string","required":true},
            "memo": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "MintRequest": {
        "dataType": "refObject",
        "properties": {
            "recipient": {"dataType":"string","required":true},
            "amount": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "BurnRequest": {
        "dataType": "refObject",
        "properties": {
            "amount": {"dataType":"string","required":true},
            "memo": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "BatchTransferItem": {
        "dataType": "refObject",
        "properties": {
            "recipient": {"dataType":"string","required":true},
            "amount": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "BatchTransferRequest": {
        "dataType": "refObject",
        "properties": {
            "transfers": {"dataType":"array","array":{"dataType":"refObject","ref":"BatchTransferItem"},"required":true},
            "memo": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UserProfile": {
        "dataType": "refObject",
        "properties": {
            "userId": {"dataType":"string","required":true},
            "displayName": {"dataType":"string","required":true},
            "username": {"dataType":"string","required":true},
            "bio": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"undefined"}]},
            "avatarUrl": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"undefined"}]},
            "backgroundImageUrl": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"undefined"}]},
            "email": {"dataType":"string","required":true},
            "walletAddress": {"dataType":"string","required":true},
            "followerCount": {"dataType":"double","required":true},
            "followingCount": {"dataType":"double","required":true},
            "postCount": {"dataType":"double","required":true},
            "createdAt": {"dataType":"string","required":true},
            "updatedAt": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SuccessResponse_UserProfile_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"ref":"UserProfile","required":true},
            "timestamp": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_UserProfile_": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"ref":"SuccessResponse_UserProfile_"},{"ref":"ErrorResponse"}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SuccessResponse_unknown_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"dataType":"any","required":true},
            "timestamp": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"ref":"SuccessResponse_unknown_"},{"ref":"ErrorResponse"}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateUserProfileRequest": {
        "dataType": "refObject",
        "properties": {
            "displayName": {"dataType":"string","required":true},
            "username": {"dataType":"string","required":true},
            "bio": {"dataType":"string"},
            "avatarUrl": {"dataType":"string"},
            "backgroundImageUrl": {"dataType":"string"},
            "email": {"dataType":"string","required":true},
            "walletAddress": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateUserProfileRequest": {
        "dataType": "refObject",
        "properties": {
            "displayName": {"dataType":"string"},
            "username": {"dataType":"string"},
            "bio": {"dataType":"string"},
            "avatarUrl": {"dataType":"string"},
            "backgroundImageUrl": {"dataType":"string"},
            "email": {"dataType":"string"},
            "walletAddress": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SuccessResponse_null_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"dataType":"enum","enums":[null],"required":true},
            "timestamp": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_null_": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"ref":"SuccessResponse_null_"},{"ref":"ErrorResponse"}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PostData": {
        "dataType": "refObject",
        "properties": {
            "postId": {"dataType":"string","required":true},
            "authorId": {"dataType":"string","required":true},
            "authorName": {"dataType":"string","required":true},
            "authorUsername": {"dataType":"string","required":true},
            "content": {"dataType":"string","required":true},
            "images": {"dataType":"union","subSchemas":[{"dataType":"array","array":{"dataType":"string"}},{"dataType":"undefined"}]},
            "tags": {"dataType":"union","subSchemas":[{"dataType":"array","array":{"dataType":"string"}},{"dataType":"undefined"}]},
            "likeCount": {"dataType":"double","required":true},
            "commentCount": {"dataType":"double","required":true},
            "isLiked": {"dataType":"boolean","required":true},
            "createdAt": {"dataType":"string","required":true},
            "updatedAt": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PaginatedData_PostData_": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refObject","ref":"PostData"},"required":true},
            "nextCursor": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"undefined"}]},
            "hasMore": {"dataType":"boolean","required":true},
            "totalCount": {"dataType":"double"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SuccessResponse_PaginatedData_PostData__": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"ref":"PaginatedData_PostData_","required":true},
            "timestamp": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_PaginatedData_PostData__": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"ref":"SuccessResponse_PaginatedData_PostData__"},{"ref":"ErrorResponse"}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PostListResponse": {
        "dataType": "refAlias",
        "type": {"ref":"ApiResponse_PaginatedData_PostData__","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SearchUserData": {
        "dataType": "refObject",
        "properties": {
            "userId": {"dataType":"string","required":true},
            "displayName": {"dataType":"string","required":true},
            "username": {"dataType":"string","required":true},
            "bio": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"undefined"}]},
            "avatarUrl": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"undefined"}]},
            "backgroundImageUrl": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"undefined"}]},
            "email": {"dataType":"string","required":true},
            "walletAddress": {"dataType":"string","required":true},
            "followerCount": {"dataType":"double","required":true},
            "followingCount": {"dataType":"double","required":true},
            "postCount": {"dataType":"double","required":true},
            "createdAt": {"dataType":"string","required":true},
            "updatedAt": {"dataType":"string","required":true},
            "isFollowing": {"dataType":"boolean"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PaginatedData_SearchUserData_": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refObject","ref":"SearchUserData"},"required":true},
            "nextCursor": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"undefined"}]},
            "hasMore": {"dataType":"boolean","required":true},
            "totalCount": {"dataType":"double"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SuccessResponse_PaginatedData_SearchUserData__": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"ref":"PaginatedData_SearchUserData_","required":true},
            "timestamp": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_PaginatedData_SearchUserData__": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"ref":"SuccessResponse_PaginatedData_SearchUserData__"},{"ref":"ErrorResponse"}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SearchUsersResponse": {
        "dataType": "refAlias",
        "type": {"ref":"ApiResponse_PaginatedData_SearchUserData__","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SearchUsersRequest": {
        "dataType": "refObject",
        "properties": {
            "query": {"dataType":"string","required":true},
            "limit": {"dataType":"double"},
            "cursor": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SuccessResponse_PostData_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"ref":"PostData","required":true},
            "timestamp": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_PostData_": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"ref":"SuccessResponse_PostData_"},{"ref":"ErrorResponse"}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PostResponse": {
        "dataType": "refAlias",
        "type": {"ref":"ApiResponse_PostData_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreatePostRequest": {
        "dataType": "refObject",
        "properties": {
            "content": {"dataType":"string","required":true},
            "images": {"dataType":"array","array":{"dataType":"string"}},
            "tags": {"dataType":"array","array":{"dataType":"string"}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "EmptyResponse": {
        "dataType": "refAlias",
        "type": {"ref":"ApiResponse_null_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "LikePostRequest": {
        "dataType": "refObject",
        "properties": {
            "postId": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "LikeData": {
        "dataType": "refObject",
        "properties": {
            "userId": {"dataType":"string","required":true},
            "displayName": {"dataType":"string","required":true},
            "username": {"dataType":"string","required":true},
            "avatarUrl": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"undefined"}]},
            "likedAt": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PaginatedData_LikeData_": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refObject","ref":"LikeData"},"required":true},
            "nextCursor": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"undefined"}]},
            "hasMore": {"dataType":"boolean","required":true},
            "totalCount": {"dataType":"double"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SuccessResponse_PaginatedData_LikeData__": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"ref":"PaginatedData_LikeData_","required":true},
            "timestamp": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_PaginatedData_LikeData__": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"ref":"SuccessResponse_PaginatedData_LikeData__"},{"ref":"ErrorResponse"}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "LikeListResponse": {
        "dataType": "refAlias",
        "type": {"ref":"ApiResponse_PaginatedData_LikeData__","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FollowUserRequest": {
        "dataType": "refObject",
        "properties": {
            "targetUserId": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FollowData": {
        "dataType": "refObject",
        "properties": {
            "userId": {"dataType":"string","required":true},
            "displayName": {"dataType":"string","required":true},
            "username": {"dataType":"string","required":true},
            "avatarUrl": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"undefined"}]},
            "bio": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"undefined"}]},
            "isFollowingBack": {"dataType":"boolean","required":true},
            "followedAt": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PaginatedData_FollowData_": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refObject","ref":"FollowData"},"required":true},
            "nextCursor": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"undefined"}]},
            "hasMore": {"dataType":"boolean","required":true},
            "totalCount": {"dataType":"double"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SuccessResponse_PaginatedData_FollowData__": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"ref":"PaginatedData_FollowData_","required":true},
            "timestamp": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_PaginatedData_FollowData__": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"ref":"SuccessResponse_PaginatedData_FollowData__"},{"ref":"ErrorResponse"}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FollowListResponse": {
        "dataType": "refAlias",
        "type": {"ref":"ApiResponse_PaginatedData_FollowData__","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CommentData": {
        "dataType": "refObject",
        "properties": {
            "commentId": {"dataType":"string","required":true},
            "postId": {"dataType":"string","required":true},
            "authorId": {"dataType":"string","required":true},
            "authorName": {"dataType":"string","required":true},
            "authorUsername": {"dataType":"string","required":true},
            "content": {"dataType":"string","required":true},
            "likeCount": {"dataType":"double","required":true},
            "isLiked": {"dataType":"boolean","required":true},
            "createdAt": {"dataType":"string","required":true},
            "updatedAt": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SuccessResponse_CommentData_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"ref":"CommentData","required":true},
            "timestamp": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_CommentData_": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"ref":"SuccessResponse_CommentData_"},{"ref":"ErrorResponse"}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CommentResponse": {
        "dataType": "refAlias",
        "type": {"ref":"ApiResponse_CommentData_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateCommentRequest": {
        "dataType": "refObject",
        "properties": {
            "content": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PaginatedData_CommentData_": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refObject","ref":"CommentData"},"required":true},
            "nextCursor": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"undefined"}]},
            "hasMore": {"dataType":"boolean","required":true},
            "totalCount": {"dataType":"double"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SuccessResponse_PaginatedData_CommentData__": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"ref":"PaginatedData_CommentData_","required":true},
            "timestamp": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_PaginatedData_CommentData__": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"ref":"SuccessResponse_PaginatedData_CommentData__"},{"ref":"ErrorResponse"}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CommentListResponse": {
        "dataType": "refAlias",
        "type": {"ref":"ApiResponse_PaginatedData_CommentData__","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TaxRateData": {
        "dataType": "refObject",
        "properties": {
            "taxRate": {"dataType":"double","required":true},
            "taxRateDecimal": {"dataType":"double","required":true},
            "formatted": {"dataType":"string","required":true},
            "lastUpdated": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SuccessResponse_TaxRateData_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"ref":"TaxRateData","required":true},
            "timestamp": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_TaxRateData_": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"ref":"SuccessResponse_TaxRateData_"},{"ref":"ErrorResponse"}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PauseStatusData": {
        "dataType": "refObject",
        "properties": {
            "isPaused": {"dataType":"boolean","required":true},
            "pausedAt": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "pausedBy": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SuccessResponse_PauseStatusData_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"ref":"PauseStatusData","required":true},
            "timestamp": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_PauseStatusData_": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"ref":"SuccessResponse_PauseStatusData_"},{"ref":"ErrorResponse"}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TaxCalculationData": {
        "dataType": "refObject",
        "properties": {
            "originalAmount": {"dataType":"string","required":true},
            "taxAmount": {"dataType":"string","required":true},
            "netAmount": {"dataType":"string","required":true},
            "taxRate": {"dataType":"double","required":true},
            "formattedOriginal": {"dataType":"string","required":true},
            "formattedTax": {"dataType":"string","required":true},
            "formattedNet": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SuccessResponse_TaxCalculationData_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"ref":"TaxCalculationData","required":true},
            "timestamp": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_TaxCalculationData_": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"ref":"SuccessResponse_TaxCalculationData_"},{"ref":"ErrorResponse"}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TotalSupplyData": {
        "dataType": "refObject",
        "properties": {
            "totalSupply": {"dataType":"string","required":true},
            "decimals": {"dataType":"double","required":true},
            "formatted": {"dataType":"string","required":true},
            "maxSupply": {"dataType":"string"},
            "circulatingSupply": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SuccessResponse_TotalSupplyData_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"ref":"TotalSupplyData","required":true},
            "timestamp": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_TotalSupplyData_": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"ref":"SuccessResponse_TotalSupplyData_"},{"ref":"ErrorResponse"}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TreasuryAccountData": {
        "dataType": "refObject",
        "properties": {
            "treasuryAddress": {"dataType":"string","required":true},
            "treasuryBalance": {"dataType":"string","required":true},
            "formattedBalance": {"dataType":"string","required":true},
            "lastUpdated": {"dataType":"string"},
            "capabilities": {"dataType":"array","array":{"dataType":"string"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SuccessResponse_TreasuryAccountData_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"ref":"TreasuryAccountData","required":true},
            "timestamp": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_TreasuryAccountData_": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"ref":"SuccessResponse_TreasuryAccountData_"},{"ref":"ErrorResponse"}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "JobStatusData": {
        "dataType": "refObject",
        "properties": {
            "jobId": {"dataType":"string","required":true},
            "status": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["queued"]},{"dataType":"enum","enums":["processing"]},{"dataType":"enum","enums":["completed"]},{"dataType":"enum","enums":["failed"]},{"dataType":"enum","enums":["cancelled"]}],"required":true},
            "type": {"dataType":"string","required":true},
            "createdAt": {"dataType":"string","required":true},
            "startedAt": {"dataType":"string"},
            "completedAt": {"dataType":"string"},
            "result": {"dataType":"nestedObjectLiteral","nestedProperties":{"events":{"dataType":"array","array":{"dataType":"any"}},"blockHeight":{"dataType":"double"},"status":{"dataType":"string"},"txId":{"dataType":"string"}}},
            "error": {"dataType":"nestedObjectLiteral","nestedProperties":{"details":{"dataType":"string"},"message":{"dataType":"string","required":true},"code":{"dataType":"string","required":true}}},
            "logs": {"dataType":"array","array":{"dataType":"string"}},
            "progress": {"dataType":"double"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SuccessResponse_JobStatusData_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"ref":"JobStatusData","required":true},
            "timestamp": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_JobStatusData_": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"ref":"SuccessResponse_JobStatusData_"},{"ref":"ErrorResponse"}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "BalanceData": {
        "dataType": "refObject",
        "properties": {
            "balance": {"dataType":"string","required":true},
            "address": {"dataType":"string","required":true},
            "decimals": {"dataType":"double","required":true},
            "formatted": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SuccessResponse_BalanceData-Array_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"dataType":"array","array":{"dataType":"refObject","ref":"BalanceData"},"required":true},
            "timestamp": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_BalanceData-Array_": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"ref":"SuccessResponse_BalanceData-Array_"},{"ref":"ErrorResponse"}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SuccessResponse_BalanceData_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"ref":"BalanceData","required":true},
            "timestamp": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_BalanceData_": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"ref":"SuccessResponse_BalanceData_"},{"ref":"ErrorResponse"}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SuccessResponse__isSetUp-boolean--hasVault-boolean__": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"dataType":"nestedObjectLiteral","nestedProperties":{"hasVault":{"dataType":"boolean","required":true},"isSetUp":{"dataType":"boolean","required":true}},"required":true},
            "timestamp": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse__isSetUp-boolean--hasVault-boolean__": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"ref":"SuccessResponse__isSetUp-boolean--hasVault-boolean__"},{"ref":"ErrorResponse"}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AdminCapabilitiesData": {
        "dataType": "refObject",
        "properties": {
            "address": {"dataType":"string","required":true},
            "isAdmin": {"dataType":"boolean","required":true},
            "canMint": {"dataType":"boolean","required":true},
            "canPause": {"dataType":"boolean","required":true},
            "canSetTaxRate": {"dataType":"boolean","required":true},
            "canSetTreasury": {"dataType":"boolean","required":true},
            "canBurn": {"dataType":"boolean","required":true},
            "capabilities": {"dataType":"array","array":{"dataType":"string"},"required":true},
            "role": {"dataType":"string"},
            "lastUpdated": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SuccessResponse_AdminCapabilitiesData_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"ref":"AdminCapabilitiesData","required":true},
            "timestamp": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_AdminCapabilitiesData_": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"ref":"SuccessResponse_AdminCapabilitiesData_"},{"ref":"ErrorResponse"}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AuthData": {
        "dataType": "refObject",
        "properties": {
            "token": {"dataType":"string","required":true},
            "expiresIn": {"dataType":"double","required":true},
            "address": {"dataType":"string","required":true},
            "role": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["user"]},{"dataType":"enum","enums":["admin"]},{"dataType":"enum","enums":["minter"]},{"dataType":"enum","enums":["pauser"]}],"required":true},
            "issuedAt": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SuccessResponse_AuthData_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"ref":"AuthData","required":true},
            "timestamp": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_AuthData_": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"ref":"SuccessResponse_AuthData_"},{"ref":"ErrorResponse"}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "LoginRequest": {
        "dataType": "refObject",
        "properties": {
            "address": {"dataType":"string","required":true},
            "signature": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TokenVerificationData": {
        "dataType": "refObject",
        "properties": {
            "valid": {"dataType":"boolean","required":true},
            "address": {"dataType":"string"},
            "role": {"dataType":"string"},
            "expiresAt": {"dataType":"string"},
            "issuedAt": {"dataType":"string"},
            "error": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SuccessResponse_TokenVerificationData_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"ref":"TokenVerificationData","required":true},
            "timestamp": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_TokenVerificationData_": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"ref":"SuccessResponse_TokenVerificationData_"},{"ref":"ErrorResponse"}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "VerifyTokenRequest": {
        "dataType": "refObject",
        "properties": {
            "token": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
};
const templateService = new ExpressTemplateService(models, {"noImplicitAdditionalProperties":"throw-on-extras","bodyCoercion":true});

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa




export function RegisterRoutes(app: Router) {

    // ###########################################################################################################
    //  NOTE: If you do not see routes for all of your controllers in this file, then you might not have informed tsoa of where to look
    //      Please look into the "controllerPathGlobs" config option described in the readme: https://github.com/lukeautry/tsoa
    // ###########################################################################################################


    
        const argsUnpauseController_unpauseContract: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.post('/unpause',
            ...(fetchMiddlewares<RequestHandler>(UnpauseController)),
            ...(fetchMiddlewares<RequestHandler>(UnpauseController.prototype.unpauseContract)),

            async function UnpauseController_unpauseContract(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUnpauseController_unpauseContract, request, response });

                const controller = new UnpauseController();

              await templateService.apiHandler({
                methodName: 'unpauseContract',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsTransferController_transferTokens: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"body","name":"request","required":true,"ref":"TransferRequest"},
        };
        app.post('/transfer',
            ...(fetchMiddlewares<RequestHandler>(TransferController)),
            ...(fetchMiddlewares<RequestHandler>(TransferController.prototype.transferTokens)),

            async function TransferController_transferTokens(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTransferController_transferTokens, request, response });

                const controller = new TransferController();

              await templateService.apiHandler({
                methodName: 'transferTokens',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSetupController_setupAccount: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"body","name":"request","required":true,"ref":"SetupAccountRequest"},
        };
        app.post('/setup/account',
            ...(fetchMiddlewares<RequestHandler>(SetupController)),
            ...(fetchMiddlewares<RequestHandler>(SetupController.prototype.setupAccount)),

            async function SetupController_setupAccount(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSetupController_setupAccount, request, response });

                const controller = new SetupController();

              await templateService.apiHandler({
                methodName: 'setupAccount',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSetupController_setupAdminWithMinter: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.post('/setup/admin-minter',
            ...(fetchMiddlewares<RequestHandler>(SetupController)),
            ...(fetchMiddlewares<RequestHandler>(SetupController.prototype.setupAdminWithMinter)),

            async function SetupController_setupAdminWithMinter(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSetupController_setupAdminWithMinter, request, response });

                const controller = new SetupController();

              await templateService.apiHandler({
                methodName: 'setupAdminWithMinter',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSetupController_setupAdminRoles: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.post('/setup/admin-roles',
            ...(fetchMiddlewares<RequestHandler>(SetupController)),
            ...(fetchMiddlewares<RequestHandler>(SetupController.prototype.setupAdminRoles)),

            async function SetupController_setupAdminRoles(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSetupController_setupAdminRoles, request, response });

                const controller = new SetupController();

              await templateService.apiHandler({
                methodName: 'setupAdminRoles',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSetTreasuryController_setTreasury: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"body","name":"request","required":true,"ref":"SetTreasuryRequest"},
        };
        app.post('/set-treasury',
            ...(fetchMiddlewares<RequestHandler>(SetTreasuryController)),
            ...(fetchMiddlewares<RequestHandler>(SetTreasuryController.prototype.setTreasury)),

            async function SetTreasuryController_setTreasury(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSetTreasuryController_setTreasury, request, response });

                const controller = new SetTreasuryController();

              await templateService.apiHandler({
                methodName: 'setTreasury',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSetTaxRateController_setTaxRate: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"body","name":"request","required":true,"ref":"SetTaxRateRequest"},
        };
        app.post('/set-tax-rate',
            ...(fetchMiddlewares<RequestHandler>(SetTaxRateController)),
            ...(fetchMiddlewares<RequestHandler>(SetTaxRateController.prototype.setTaxRate)),

            async function SetTaxRateController_setTaxRate(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSetTaxRateController_setTaxRate, request, response });

                const controller = new SetTaxRateController();

              await templateService.apiHandler({
                methodName: 'setTaxRate',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsPauseController_pauseContract: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.post('/pause',
            ...(fetchMiddlewares<RequestHandler>(PauseController)),
            ...(fetchMiddlewares<RequestHandler>(PauseController.prototype.pauseContract)),

            async function PauseController_pauseContract(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPauseController_pauseContract, request, response });

                const controller = new PauseController();

              await templateService.apiHandler({
                methodName: 'pauseContract',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsMintController_mintTokens: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"body","name":"request","required":true,"ref":"MintRequest"},
        };
        app.post('/mint',
            ...(fetchMiddlewares<RequestHandler>(MintController)),
            ...(fetchMiddlewares<RequestHandler>(MintController.prototype.mintTokens)),

            async function MintController_mintTokens(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMintController_mintTokens, request, response });

                const controller = new MintController();

              await templateService.apiHandler({
                methodName: 'mintTokens',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsBurnController_burnTokens: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"body","name":"request","required":true,"ref":"BurnRequest"},
        };
        app.post('/burn',
            ...(fetchMiddlewares<RequestHandler>(BurnController)),
            ...(fetchMiddlewares<RequestHandler>(BurnController.prototype.burnTokens)),

            async function BurnController_burnTokens(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsBurnController_burnTokens, request, response });

                const controller = new BurnController();

              await templateService.apiHandler({
                methodName: 'burnTokens',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsBatchTransferController_batchTransferTokens: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"body","name":"request","required":true,"ref":"BatchTransferRequest"},
        };
        app.post('/batch-transfer',
            ...(fetchMiddlewares<RequestHandler>(BatchTransferController)),
            ...(fetchMiddlewares<RequestHandler>(BatchTransferController.prototype.batchTransferTokens)),

            async function BatchTransferController_batchTransferTokens(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsBatchTransferController_batchTransferTokens, request, response });

                const controller = new BatchTransferController();

              await templateService.apiHandler({
                methodName: 'batchTransferTokens',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUsersController_getUserProfile: Record<string, TsoaRoute.ParameterSchema> = {
                userId: {"in":"path","name":"userId","required":true,"dataType":"string"},
        };
        app.get('/sns/users/:userId/profile',
            ...(fetchMiddlewares<RequestHandler>(UsersController)),
            ...(fetchMiddlewares<RequestHandler>(UsersController.prototype.getUserProfile)),

            async function UsersController_getUserProfile(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUsersController_getUserProfile, request, response });

                const controller = new UsersController();

              await templateService.apiHandler({
                methodName: 'getUserProfile',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUsersController_createUserProfile: Record<string, TsoaRoute.ParameterSchema> = {
                userId: {"in":"path","name":"userId","required":true,"dataType":"string"},
                request: {"in":"body","name":"request","required":true,"ref":"CreateUserProfileRequest"},
                requestObj: {"in":"request","name":"requestObj","required":true,"dataType":"object"},
        };
        app.post('/sns/users/:userId/profile',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(UsersController)),
            ...(fetchMiddlewares<RequestHandler>(UsersController.prototype.createUserProfile)),

            async function UsersController_createUserProfile(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUsersController_createUserProfile, request, response });

                const controller = new UsersController();

              await templateService.apiHandler({
                methodName: 'createUserProfile',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUsersController_updateUserProfile: Record<string, TsoaRoute.ParameterSchema> = {
                userId: {"in":"path","name":"userId","required":true,"dataType":"string"},
                request: {"in":"body","name":"request","required":true,"ref":"UpdateUserProfileRequest"},
                requestObj: {"in":"request","name":"requestObj","required":true,"dataType":"object"},
        };
        app.put('/sns/users/:userId/profile',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(UsersController)),
            ...(fetchMiddlewares<RequestHandler>(UsersController.prototype.updateUserProfile)),

            async function UsersController_updateUserProfile(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUsersController_updateUserProfile, request, response });

                const controller = new UsersController();

              await templateService.apiHandler({
                methodName: 'updateUserProfile',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUsersController_deleteUserProfile: Record<string, TsoaRoute.ParameterSchema> = {
                userId: {"in":"path","name":"userId","required":true,"dataType":"string"},
                requestObj: {"in":"request","name":"requestObj","required":true,"dataType":"object"},
        };
        app.delete('/sns/users/:userId/profile',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(UsersController)),
            ...(fetchMiddlewares<RequestHandler>(UsersController.prototype.deleteUserProfile)),

            async function UsersController_deleteUserProfile(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUsersController_deleteUserProfile, request, response });

                const controller = new UsersController();

              await templateService.apiHandler({
                methodName: 'deleteUserProfile',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUsersController_getUserPosts: Record<string, TsoaRoute.ParameterSchema> = {
                userId: {"in":"path","name":"userId","required":true,"dataType":"string"},
                limit: {"default":20,"in":"query","name":"limit","dataType":"double"},
                cursor: {"in":"query","name":"cursor","dataType":"string"},
        };
        app.get('/sns/users/:userId/posts',
            ...(fetchMiddlewares<RequestHandler>(UsersController)),
            ...(fetchMiddlewares<RequestHandler>(UsersController.prototype.getUserPosts)),

            async function UsersController_getUserPosts(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUsersController_getUserPosts, request, response });

                const controller = new UsersController();

              await templateService.apiHandler({
                methodName: 'getUserPosts',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSearchController_searchUsers: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"body","name":"request","required":true,"ref":"SearchUsersRequest"},
                requestObj: {"in":"request","name":"requestObj","dataType":"object"},
        };
        app.post('/sns/search/users',
            ...(fetchMiddlewares<RequestHandler>(SearchController)),
            ...(fetchMiddlewares<RequestHandler>(SearchController.prototype.searchUsers)),

            async function SearchController_searchUsers(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSearchController_searchUsers, request, response });

                const controller = new SearchController();

              await templateService.apiHandler({
                methodName: 'searchUsers',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSearchController_searchUsersGet: Record<string, TsoaRoute.ParameterSchema> = {
                query: {"in":"query","name":"query","required":true,"dataType":"string"},
                limit: {"default":20,"in":"query","name":"limit","dataType":"double"},
                cursor: {"in":"query","name":"cursor","dataType":"string"},
                requestObj: {"in":"request","name":"requestObj","dataType":"object"},
        };
        app.get('/sns/search/users',
            ...(fetchMiddlewares<RequestHandler>(SearchController)),
            ...(fetchMiddlewares<RequestHandler>(SearchController.prototype.searchUsersGet)),

            async function SearchController_searchUsersGet(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSearchController_searchUsersGet, request, response });

                const controller = new SearchController();

              await templateService.apiHandler({
                methodName: 'searchUsersGet',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsPostsController_getPosts: Record<string, TsoaRoute.ParameterSchema> = {
                limit: {"in":"query","name":"limit","dataType":"double"},
                cursor: {"in":"query","name":"cursor","dataType":"string"},
        };
        app.get('/sns/posts',
            ...(fetchMiddlewares<RequestHandler>(PostsController)),
            ...(fetchMiddlewares<RequestHandler>(PostsController.prototype.getPosts)),

            async function PostsController_getPosts(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPostsController_getPosts, request, response });

                const controller = new PostsController();

              await templateService.apiHandler({
                methodName: 'getPosts',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsPostsController_createPost: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"body","name":"request","required":true,"ref":"CreatePostRequest"},
                requestObj: {"in":"request","name":"requestObj","required":true,"dataType":"object"},
        };
        app.post('/sns/posts',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PostsController)),
            ...(fetchMiddlewares<RequestHandler>(PostsController.prototype.createPost)),

            async function PostsController_createPost(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPostsController_createPost, request, response });

                const controller = new PostsController();

              await templateService.apiHandler({
                methodName: 'createPost',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsPostsController_getPost: Record<string, TsoaRoute.ParameterSchema> = {
                postId: {"in":"path","name":"postId","required":true,"dataType":"string"},
        };
        app.get('/sns/posts/:postId',
            ...(fetchMiddlewares<RequestHandler>(PostsController)),
            ...(fetchMiddlewares<RequestHandler>(PostsController.prototype.getPost)),

            async function PostsController_getPost(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPostsController_getPost, request, response });

                const controller = new PostsController();

              await templateService.apiHandler({
                methodName: 'getPost',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsPostsController_deletePost: Record<string, TsoaRoute.ParameterSchema> = {
                postId: {"in":"path","name":"postId","required":true,"dataType":"string"},
                requestObj: {"in":"request","name":"requestObj","required":true,"dataType":"object"},
        };
        app.delete('/sns/posts/:postId',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PostsController)),
            ...(fetchMiddlewares<RequestHandler>(PostsController.prototype.deletePost)),

            async function PostsController_deletePost(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPostsController_deletePost, request, response });

                const controller = new PostsController();

              await templateService.apiHandler({
                methodName: 'deletePost',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsPostsController_getUserPosts: Record<string, TsoaRoute.ParameterSchema> = {
                userId: {"in":"path","name":"userId","required":true,"dataType":"string"},
                limit: {"default":20,"in":"query","name":"limit","dataType":"double"},
                cursor: {"in":"query","name":"cursor","dataType":"string"},
        };
        app.get('/sns/posts/users/:userId',
            ...(fetchMiddlewares<RequestHandler>(PostsController)),
            ...(fetchMiddlewares<RequestHandler>(PostsController.prototype.getUserPosts)),

            async function PostsController_getUserPosts(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPostsController_getUserPosts, request, response });

                const controller = new PostsController();

              await templateService.apiHandler({
                methodName: 'getUserPosts',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsLikesController_likePost: Record<string, TsoaRoute.ParameterSchema> = {
                postId: {"in":"path","name":"postId","required":true,"dataType":"string"},
                request: {"in":"body","name":"request","required":true,"ref":"LikePostRequest"},
                requestObj: {"in":"request","name":"requestObj","required":true,"dataType":"object"},
        };
        app.post('/sns/posts/:postId/likes',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(LikesController)),
            ...(fetchMiddlewares<RequestHandler>(LikesController.prototype.likePost)),

            async function LikesController_likePost(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsLikesController_likePost, request, response });

                const controller = new LikesController();

              await templateService.apiHandler({
                methodName: 'likePost',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsLikesController_unlikePost: Record<string, TsoaRoute.ParameterSchema> = {
                postId: {"in":"path","name":"postId","required":true,"dataType":"string"},
                requestObj: {"in":"request","name":"requestObj","required":true,"dataType":"object"},
        };
        app.delete('/sns/posts/:postId/likes',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(LikesController)),
            ...(fetchMiddlewares<RequestHandler>(LikesController.prototype.unlikePost)),

            async function LikesController_unlikePost(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsLikesController_unlikePost, request, response });

                const controller = new LikesController();

              await templateService.apiHandler({
                methodName: 'unlikePost',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsLikesController_getPostLikes: Record<string, TsoaRoute.ParameterSchema> = {
                postId: {"in":"path","name":"postId","required":true,"dataType":"string"},
                limit: {"default":20,"in":"query","name":"limit","dataType":"double"},
                cursor: {"in":"query","name":"cursor","dataType":"string"},
        };
        app.get('/sns/posts/:postId/likes',
            ...(fetchMiddlewares<RequestHandler>(LikesController)),
            ...(fetchMiddlewares<RequestHandler>(LikesController.prototype.getPostLikes)),

            async function LikesController_getPostLikes(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsLikesController_getPostLikes, request, response });

                const controller = new LikesController();

              await templateService.apiHandler({
                methodName: 'getPostLikes',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsFollowsController_followUser: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"body","name":"request","required":true,"ref":"FollowUserRequest"},
                requestObj: {"in":"request","name":"requestObj","required":true,"dataType":"object"},
        };
        app.post('/sns/users/follow',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(FollowsController)),
            ...(fetchMiddlewares<RequestHandler>(FollowsController.prototype.followUser)),

            async function FollowsController_followUser(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFollowsController_followUser, request, response });

                const controller = new FollowsController();

              await templateService.apiHandler({
                methodName: 'followUser',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsFollowsController_unfollowUser: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"body","name":"request","required":true,"ref":"FollowUserRequest"},
                requestObj: {"in":"request","name":"requestObj","required":true,"dataType":"object"},
        };
        app.post('/sns/users/unfollow',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(FollowsController)),
            ...(fetchMiddlewares<RequestHandler>(FollowsController.prototype.unfollowUser)),

            async function FollowsController_unfollowUser(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFollowsController_unfollowUser, request, response });

                const controller = new FollowsController();

              await templateService.apiHandler({
                methodName: 'unfollowUser',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsFollowsController_getUserFollowers: Record<string, TsoaRoute.ParameterSchema> = {
                userId: {"in":"path","name":"userId","required":true,"dataType":"string"},
                limit: {"default":20,"in":"query","name":"limit","dataType":"double"},
                cursor: {"in":"query","name":"cursor","dataType":"string"},
        };
        app.get('/sns/users/:userId/followers',
            ...(fetchMiddlewares<RequestHandler>(FollowsController)),
            ...(fetchMiddlewares<RequestHandler>(FollowsController.prototype.getUserFollowers)),

            async function FollowsController_getUserFollowers(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFollowsController_getUserFollowers, request, response });

                const controller = new FollowsController();

              await templateService.apiHandler({
                methodName: 'getUserFollowers',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsFollowsController_getUserFollowing: Record<string, TsoaRoute.ParameterSchema> = {
                userId: {"in":"path","name":"userId","required":true,"dataType":"string"},
                limit: {"default":20,"in":"query","name":"limit","dataType":"double"},
                cursor: {"in":"query","name":"cursor","dataType":"string"},
        };
        app.get('/sns/users/:userId/following',
            ...(fetchMiddlewares<RequestHandler>(FollowsController)),
            ...(fetchMiddlewares<RequestHandler>(FollowsController.prototype.getUserFollowing)),

            async function FollowsController_getUserFollowing(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFollowsController_getUserFollowing, request, response });

                const controller = new FollowsController();

              await templateService.apiHandler({
                methodName: 'getUserFollowing',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsFeedController_getFeed: Record<string, TsoaRoute.ParameterSchema> = {
                limit: {"default":20,"in":"query","name":"limit","dataType":"double"},
                cursor: {"in":"query","name":"cursor","dataType":"string"},
        };
        app.get('/sns/feed',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(FeedController)),
            ...(fetchMiddlewares<RequestHandler>(FeedController.prototype.getFeed)),

            async function FeedController_getFeed(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFeedController_getFeed, request, response });

                const controller = new FeedController();

              await templateService.apiHandler({
                methodName: 'getFeed',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsFeedController_getGlobalFeed: Record<string, TsoaRoute.ParameterSchema> = {
                limit: {"default":20,"in":"query","name":"limit","dataType":"double"},
                cursor: {"in":"query","name":"cursor","dataType":"string"},
        };
        app.get('/sns/feed/global',
            ...(fetchMiddlewares<RequestHandler>(FeedController)),
            ...(fetchMiddlewares<RequestHandler>(FeedController.prototype.getGlobalFeed)),

            async function FeedController_getGlobalFeed(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFeedController_getGlobalFeed, request, response });

                const controller = new FeedController();

              await templateService.apiHandler({
                methodName: 'getGlobalFeed',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCommentsController_createComment: Record<string, TsoaRoute.ParameterSchema> = {
                postId: {"in":"path","name":"postId","required":true,"dataType":"string"},
                request: {"in":"body","name":"request","required":true,"ref":"CreateCommentRequest"},
                requestObj: {"in":"request","name":"requestObj","required":true,"dataType":"object"},
        };
        app.post('/sns/posts/:postId/comments',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CommentsController)),
            ...(fetchMiddlewares<RequestHandler>(CommentsController.prototype.createComment)),

            async function CommentsController_createComment(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCommentsController_createComment, request, response });

                const controller = new CommentsController();

              await templateService.apiHandler({
                methodName: 'createComment',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCommentsController_getPostComments: Record<string, TsoaRoute.ParameterSchema> = {
                postId: {"in":"path","name":"postId","required":true,"dataType":"string"},
                limit: {"default":20,"in":"query","name":"limit","dataType":"double"},
                cursor: {"in":"query","name":"cursor","dataType":"string"},
        };
        app.get('/sns/posts/:postId/comments',
            ...(fetchMiddlewares<RequestHandler>(CommentsController)),
            ...(fetchMiddlewares<RequestHandler>(CommentsController.prototype.getPostComments)),

            async function CommentsController_getPostComments(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCommentsController_getPostComments, request, response });

                const controller = new CommentsController();

              await templateService.apiHandler({
                methodName: 'getPostComments',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCommentsController_deleteComment: Record<string, TsoaRoute.ParameterSchema> = {
                postId: {"in":"path","name":"postId","required":true,"dataType":"string"},
                commentId: {"in":"path","name":"commentId","required":true,"dataType":"string"},
                requestObj: {"in":"request","name":"requestObj","required":true,"dataType":"object"},
        };
        app.delete('/sns/posts/:postId/comments/:commentId',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CommentsController)),
            ...(fetchMiddlewares<RequestHandler>(CommentsController.prototype.deleteComment)),

            async function CommentsController_deleteComment(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCommentsController_deleteComment, request, response });

                const controller = new CommentsController();

              await templateService.apiHandler({
                methodName: 'deleteComment',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsTokenInfoController_getTaxRate: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/heart-tokens/tax-rate',
            ...(fetchMiddlewares<RequestHandler>(TokenInfoController)),
            ...(fetchMiddlewares<RequestHandler>(TokenInfoController.prototype.getTaxRate)),

            async function TokenInfoController_getTaxRate(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTokenInfoController_getTaxRate, request, response });

                const controller = new TokenInfoController();

              await templateService.apiHandler({
                methodName: 'getTaxRate',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsTokenInfoController_getPauseStatus: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/heart-tokens/pause-status',
            ...(fetchMiddlewares<RequestHandler>(TokenInfoController)),
            ...(fetchMiddlewares<RequestHandler>(TokenInfoController.prototype.getPauseStatus)),

            async function TokenInfoController_getPauseStatus(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTokenInfoController_getPauseStatus, request, response });

                const controller = new TokenInfoController();

              await templateService.apiHandler({
                methodName: 'getPauseStatus',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsTokenInfoController_calculateTax: Record<string, TsoaRoute.ParameterSchema> = {
                amount: {"in":"path","name":"amount","required":true,"dataType":"string"},
        };
        app.get('/heart-tokens/tax-calculation/:amount',
            ...(fetchMiddlewares<RequestHandler>(TokenInfoController)),
            ...(fetchMiddlewares<RequestHandler>(TokenInfoController.prototype.calculateTax)),

            async function TokenInfoController_calculateTax(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTokenInfoController_calculateTax, request, response });

                const controller = new TokenInfoController();

              await templateService.apiHandler({
                methodName: 'calculateTax',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsTokenInfoController_getTotalSupply: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/heart-tokens/total-supply',
            ...(fetchMiddlewares<RequestHandler>(TokenInfoController)),
            ...(fetchMiddlewares<RequestHandler>(TokenInfoController.prototype.getTotalSupply)),

            async function TokenInfoController_getTotalSupply(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTokenInfoController_getTotalSupply, request, response });

                const controller = new TokenInfoController();

              await templateService.apiHandler({
                methodName: 'getTotalSupply',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsTokenInfoController_getTreasuryAccount: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/heart-tokens/treasury-account',
            ...(fetchMiddlewares<RequestHandler>(TokenInfoController)),
            ...(fetchMiddlewares<RequestHandler>(TokenInfoController.prototype.getTreasuryAccount)),

            async function TokenInfoController_getTreasuryAccount(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTokenInfoController_getTreasuryAccount, request, response });

                const controller = new TokenInfoController();

              await templateService.apiHandler({
                methodName: 'getTreasuryAccount',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsJobController_getJobStatus: Record<string, TsoaRoute.ParameterSchema> = {
                jobId: {"in":"path","name":"jobId","required":true,"dataType":"string"},
        };
        app.get('/jobs/:jobId',
            ...(fetchMiddlewares<RequestHandler>(JobController)),
            ...(fetchMiddlewares<RequestHandler>(JobController.prototype.getJobStatus)),

            async function JobController_getJobStatus(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsJobController_getJobStatus, request, response });

                const controller = new JobController();

              await templateService.apiHandler({
                methodName: 'getJobStatus',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsBalanceController_getBatchBalance: Record<string, TsoaRoute.ParameterSchema> = {
                addresses: {"in":"query","name":"addresses","required":true,"dataType":"string"},
        };
        app.get('/balance/batch',
            ...(fetchMiddlewares<RequestHandler>(BalanceController)),
            ...(fetchMiddlewares<RequestHandler>(BalanceController.prototype.getBatchBalance)),

            async function BalanceController_getBatchBalance(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsBalanceController_getBatchBalance, request, response });

                const controller = new BalanceController();

              await templateService.apiHandler({
                methodName: 'getBatchBalance',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsBalanceController_getBalance: Record<string, TsoaRoute.ParameterSchema> = {
                address: {"in":"path","name":"address","required":true,"dataType":"string"},
        };
        app.get('/balance/:address',
            ...(fetchMiddlewares<RequestHandler>(BalanceController)),
            ...(fetchMiddlewares<RequestHandler>(BalanceController.prototype.getBalance)),

            async function BalanceController_getBalance(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsBalanceController_getBalance, request, response });

                const controller = new BalanceController();

              await templateService.apiHandler({
                methodName: 'getBalance',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsBalanceController_getSetupStatus: Record<string, TsoaRoute.ParameterSchema> = {
                address: {"in":"path","name":"address","required":true,"dataType":"string"},
        };
        app.get('/balance/:address/setup-status',
            ...(fetchMiddlewares<RequestHandler>(BalanceController)),
            ...(fetchMiddlewares<RequestHandler>(BalanceController.prototype.getSetupStatus)),

            async function BalanceController_getSetupStatus(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsBalanceController_getSetupStatus, request, response });

                const controller = new BalanceController();

              await templateService.apiHandler({
                methodName: 'getSetupStatus',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsBalanceController_debugBatchAddresses: Record<string, TsoaRoute.ParameterSchema> = {
                addresses: {"in":"query","name":"addresses","required":true,"dataType":"string"},
        };
        app.get('/balance/debug-batch',
            ...(fetchMiddlewares<RequestHandler>(BalanceController)),
            ...(fetchMiddlewares<RequestHandler>(BalanceController.prototype.debugBatchAddresses)),

            async function BalanceController_debugBatchAddresses(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsBalanceController_debugBatchAddresses, request, response });

                const controller = new BalanceController();

              await templateService.apiHandler({
                methodName: 'debugBatchAddresses',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAdminController_getAdminCapabilities: Record<string, TsoaRoute.ParameterSchema> = {
                address: {"in":"path","name":"address","required":true,"dataType":"string"},
        };
        app.get('/heart-tokens/admin-capabilities/:address',
            ...(fetchMiddlewares<RequestHandler>(AdminController)),
            ...(fetchMiddlewares<RequestHandler>(AdminController.prototype.getAdminCapabilities)),

            async function AdminController_getAdminCapabilities(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAdminController_getAdminCapabilities, request, response });

                const controller = new AdminController();

              await templateService.apiHandler({
                methodName: 'getAdminCapabilities',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAuthController_login: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"body","name":"request","required":true,"ref":"LoginRequest"},
        };
        app.post('/auth/login',
            ...(fetchMiddlewares<RequestHandler>(AuthController)),
            ...(fetchMiddlewares<RequestHandler>(AuthController.prototype.login)),

            async function AuthController_login(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAuthController_login, request, response });

                const controller = new AuthController();

              await templateService.apiHandler({
                methodName: 'login',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAuthController_verifyToken: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"body","name":"request","required":true,"ref":"VerifyTokenRequest"},
        };
        app.post('/auth/verify',
            ...(fetchMiddlewares<RequestHandler>(AuthController)),
            ...(fetchMiddlewares<RequestHandler>(AuthController.prototype.verifyToken)),

            async function AuthController_verifyToken(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAuthController_verifyToken, request, response });

                const controller = new AuthController();

              await templateService.apiHandler({
                methodName: 'verifyToken',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAuthController_refreshToken: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.post('/auth/refresh',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(AuthController)),
            ...(fetchMiddlewares<RequestHandler>(AuthController.prototype.refreshToken)),

            async function AuthController_refreshToken(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAuthController_refreshToken, request, response });

                const controller = new AuthController();

              await templateService.apiHandler({
                methodName: 'refreshToken',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa


    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

    function authenticateMiddleware(security: TsoaRoute.Security[] = []) {
        return async function runAuthenticationMiddleware(request: any, response: any, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            // keep track of failed auth attempts so we can hand back the most
            // recent one.  This behavior was previously existing so preserving it
            // here
            const failedAttempts: any[] = [];
            const pushAndRethrow = (error: any) => {
                failedAttempts.push(error);
                throw error;
            };

            const secMethodOrPromises: Promise<any>[] = [];
            for (const secMethod of security) {
                if (Object.keys(secMethod).length > 1) {
                    const secMethodAndPromises: Promise<any>[] = [];

                    for (const name in secMethod) {
                        secMethodAndPromises.push(
                            expressAuthenticationRecasted(request, name, secMethod[name], response)
                                .catch(pushAndRethrow)
                        );
                    }

                    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

                    secMethodOrPromises.push(Promise.all(secMethodAndPromises)
                        .then(users => { return users[0]; }));
                } else {
                    for (const name in secMethod) {
                        secMethodOrPromises.push(
                            expressAuthenticationRecasted(request, name, secMethod[name], response)
                                .catch(pushAndRethrow)
                        );
                    }
                }
            }

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            try {
                request['user'] = await Promise.any(secMethodOrPromises);

                // Response was sent in middleware, abort
                if (response.writableEnded) {
                    return;
                }

                next();
            }
            catch(err) {
                // Show most recent error as response
                const error = failedAttempts.pop();
                error.status = error.status || 401;

                // Response was sent in middleware, abort
                if (response.writableEnded) {
                    return;
                }
                next(error);
            }

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        }
    }

    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
}

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
