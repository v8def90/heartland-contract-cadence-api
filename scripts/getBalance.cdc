import "FungibleToken"
import "Heart"

/// Get the HEART token balance for a specific address
access(all) fun main(address: Address): UFix64 {
    let account = getAccount(address)
    
    // Get the balance through the public capability
    if let balanceRef = account.capabilities.borrow<&{FungibleToken.Balance}>(Heart.VaultPublicPath) {
        return balanceRef.balance
    }
    
    // Return 0 if vault not found or not set up
    return 0.0
} 