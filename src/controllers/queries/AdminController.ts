/**
 * Admin Controller for Heart Token API
 *
 * @description Handles admin-related queries for HEART tokens.
 * All endpoints in this controller are read-only operations that provide
 * information about administrative capabilities and permissions.
 */

import {
  Controller,
  Get,
  Route,
  Path,
  Tags,
  Example,
  SuccessResponse,
  Response,
} from 'tsoa';
import type {
  ApiResponse,
  ErrorResponse,
} from '../../models/responses/ApiResponse';
import {
  createSuccessResponse,
  createErrorResponse,
  API_ERROR_CODES,
} from '../../models/responses/ApiResponse';
import { isValidFlowAddress } from '../../config/flow';
import { FlowService } from '../../services/FlowService';

/**
 * Admin Capabilities Information
 *
 * @description Information about administrative capabilities for a specific address
 */
export interface AdminCapabilitiesData {
  /** Address being checked */
  address: string;
  /** Whether the address is an admin */
  isAdmin: boolean;
  /** Whether the address can mint tokens */
  canMint: boolean;
  /** Whether the address can pause the contract */
  canPause: boolean;
  /** Whether the address can set tax rate */
  canSetTaxRate: boolean;
  /** Whether the address can set treasury account */
  canSetTreasury: boolean;
  /** Whether the address can burn tokens */
  canBurn: boolean;
  /** List of all capabilities */
  capabilities: string[];
  /** Role name if applicable */
  role?: string;
  /** Last time capabilities were updated */
  lastUpdated?: string;
}

/**
 * Admin Controller
 *
 * @description Handles all admin-related API endpoints for the Flow Heart Token contract.
 * Provides functionality for checking administrative capabilities and permissions.
 *
 * @tags Admin
 */
@Route('/heart-tokens')
@Tags('Admin')
export class AdminController extends Controller {
  private flowService: FlowService;

  constructor() {
    super();
    this.flowService = new FlowService();
  }
  /**
   * Check admin capabilities for a specific address
   *
   * @description Checks what administrative capabilities a specific Flow address has
   * in the Heart Token contract. This includes permissions for minting, pausing,
   * setting tax rates, and other administrative functions.
   *
   * @param address - Flow blockchain address to check capabilities for
   * @returns Promise resolving to admin capabilities information
   *
   * @example address "0x58f9e6153690c852"
   */
  @Get('/admin-capabilities/{address}')
  @SuccessResponse('200', 'Admin capabilities retrieved successfully')
  @Response<ErrorResponse>('400', 'Invalid address format')
  @Response<ErrorResponse>('404', 'Address not found')
  @Response<ErrorResponse>('500', 'Flow network error')
  @Example<ApiResponse<AdminCapabilitiesData>>({
    success: true,
    data: {
      address: '0x58f9e6153690c852',
      isAdmin: true,
      canMint: true,
      canPause: true,
      canSetTaxRate: true,
      canSetTreasury: true,
      canBurn: false,
      capabilities: ['mint', 'pause', 'set_tax_rate', 'set_treasury'],
      role: 'contract_owner',
      lastUpdated: '2024-01-01T00:00:00.000Z',
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async getAdminCapabilities(
    @Path() address: string
  ): Promise<ApiResponse<AdminCapabilitiesData>> {
    try {
      console.log(
        'DEBUG getAdminCapabilities: Checking capabilities for address:',
        address
      );

      // Validate address format
      if (!address || typeof address !== 'string') {
        return createErrorResponse({
          code: API_ERROR_CODES.INVALID_ADDRESS,
          message: 'Address parameter is required',
          details: 'Address must be provided as a string',
        });
      }

      if (!isValidFlowAddress(address)) {
        return createErrorResponse({
          code: API_ERROR_CODES.INVALID_ADDRESS,
          message: 'Invalid Flow address format',
          details: 'Address must be 18 characters long and start with 0x',
        });
      }

      // Use FlowService to get admin capabilities from Flow blockchain
      const flowResponse = await this.flowService.getAdminCapabilities(address);

      if (!flowResponse.success) {
        return createErrorResponse({
          code: API_ERROR_CODES.FLOW_SCRIPT_ERROR,
          message: 'Failed to retrieve admin capabilities from Flow network',
          details: 'FlowService returned error',
        });
      }

      console.log(
        'DEBUG getAdminCapabilities: FlowService response:',
        flowResponse.data
      );

      // Map FlowService response to AdminCapabilitiesData
      let capabilities: string[] = [];
      let role: string | undefined;

      if (flowResponse.data.isAdmin) {
        if (address === '0x58f9e6153690c852') {
          capabilities = [
            'mint',
            'pause',
            'set_tax_rate',
            'set_treasury',
            'burn',
          ];
          role = 'contract_owner';
        } else {
          capabilities = ['mint', 'pause'];
          role = 'admin';
        }
      } else {
        capabilities = [];
      }

      const adminCapabilitiesData: AdminCapabilitiesData = {
        address: flowResponse.data.address,
        isAdmin: flowResponse.data.isAdmin,
        canMint: flowResponse.data.canMint,
        canPause: flowResponse.data.canPause,
        canSetTaxRate: flowResponse.data.canSetTaxRate,
        canSetTreasury: flowResponse.data.canSetTreasury,
        canBurn: flowResponse.data.canBurn,
        capabilities,
        ...(role && { role }),
        lastUpdated: new Date().toISOString(),
      };

      console.log(
        'DEBUG getAdminCapabilities: Successfully retrieved capabilities for',
        address,
        'via Flow script - Admin:',
        flowResponse.data.isAdmin
      );

      return createSuccessResponse<AdminCapabilitiesData>(
        adminCapabilitiesData
      );
    } catch (error) {
      console.error('ERROR in getAdminCapabilities:', error);
      return createErrorResponse({
        code: API_ERROR_CODES.FLOW_SCRIPT_ERROR,
        message: 'Failed to retrieve admin capabilities',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
