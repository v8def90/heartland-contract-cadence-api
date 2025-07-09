import "Heart"

/// HEART token tax calculation script with detailed breakdown
/// Calculates tax amount, net amount, and provides configuration details
/// for a given transfer amount
///
/// @param transferAmount: Amount of HEART tokens to transfer (before tax)
/// @return: Dictionary containing detailed tax calculation results
access(all) fun main(transferAmount: UFix64): {String: AnyStruct} {
    
    // Input validation
    if transferAmount <= 0.0 {
        panic("Transfer amount must be positive")
    }
    
    // Get current contract configuration
    let taxRate = Heart.getTaxRate()
    let treasuryAccount = Heart.getTreasuryAccount()
    let isPaused = Heart.getIsPaused()
    
    // Calculate tax and net amounts
    let taxAmount = transferAmount * taxRate / 100.0
    let netAmount = transferAmount - taxAmount
    
    // Return detailed calculation results
    return {
        "transferAmount": transferAmount,
        "taxAmount": taxAmount,
        "netAmount": netAmount,
        "taxRate": taxRate,
        "treasuryAccount": treasuryAccount,
        "hasTreasuryConfigured": treasuryAccount != nil,
        "isPaused": isPaused,
        "canTransfer": !isPaused && treasuryAccount != nil
    }
} 