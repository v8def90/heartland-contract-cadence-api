import "Heart"

/// Check admin capabilities for a given account address
/// Returns which administrative roles the account has access to
/// 
/// @param accountAddress: Address to check for admin capabilities
/// @return: Dictionary containing boolean flags for each admin role
access(all) fun main(accountAddress: Address): {String: AnyStruct} {
    
    let account = getAccount(accountAddress)
    
    // Check each administrative role capability
    let hasAdmin = account.storage.type(at: Heart.AdminStoragePath) != nil
    let hasMinter = account.storage.type(at: Heart.MinterStoragePath) != nil  
    let hasPauser = account.storage.type(at: Heart.PauserStoragePath) != nil
    let hasTaxManager = account.storage.type(at: Heart.TaxManagerStoragePath) != nil
    
    // Count total administrative roles
    let totalRoles = (hasAdmin ? 1 : 0) + (hasMinter ? 1 : 0) + (hasPauser ? 1 : 0) + (hasTaxManager ? 1 : 0)
    
    // Return comprehensive capability information
    return {
        "accountAddress": accountAddress,
        "hasAdmin": hasAdmin,
        "hasMinter": hasMinter,
        "hasPauser": hasPauser,
        "hasTaxManager": hasTaxManager,
        "totalAdminRoles": totalRoles,
        "isFullAdmin": hasAdmin,
        "hasAnyAdminRole": totalRoles > 0,
        "adminLevel": totalRoles == 4 ? "SUPER_ADMIN" : 
                     totalRoles >= 2 ? "MULTI_ROLE" : 
                     totalRoles == 1 ? "SINGLE_ROLE" : "NO_ADMIN"
    }
} 