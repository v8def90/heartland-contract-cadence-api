/* tslint:disable */
/* eslint-disable */
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import type { TsoaRoute } from '@tsoa/runtime';
import {  fetchMiddlewares, ExpressTemplateService } from '@tsoa/runtime';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { SetupController } from './controllers/transactions/SetupController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { MintController } from './controllers/transactions/MintController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { TokenInfoController } from './controllers/queries/TokenInfoController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { JobController } from './controllers/queries/JobController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { BalanceController } from './controllers/queries/BalanceController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { AdminController } from './controllers/queries/AdminController';
import type { Request as ExRequest, Response as ExResponse, RequestHandler, Router } from 'express';



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
    "SetupAccountRequest": {
        "dataType": "refObject",
        "properties": {
            "address": {"dataType":"string","required":true},
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
};
const templateService = new ExpressTemplateService(models, {"noImplicitAdditionalProperties":"throw-on-extras","bodyCoercion":true});

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa




export function RegisterRoutes(app: Router) {

    // ###########################################################################################################
    //  NOTE: If you do not see routes for all of your controllers in this file, then you might not have informed tsoa of where to look
    //      Please look into the "controllerPathGlobs" config option described in the readme: https://github.com/lukeautry/tsoa
    // ###########################################################################################################


    
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
        const argsTokenInfoController_getTaxRate: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/tax-rate',
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
        app.get('/pause-status',
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
        app.get('/tax-calculation/:amount',
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
        app.get('/total-supply',
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
        app.get('/treasury-account',
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
        app.get('/admin-capabilities/:address',
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

    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa


    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
}

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
