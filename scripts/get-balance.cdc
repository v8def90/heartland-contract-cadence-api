import FungibleToken from 0x9a0766d93b6608b7
import Heart from 0x58f9e6153690c852

/// Get the HEART token balance for a specific address
/// 
/// @param address: The Flow address to check balance for
/// @return UFix64: The HEART token balance for the address
access(all) fun main(address: Address): UFix64 {
    // Get the account for the given address
    let account = getAccount(address)
    
    // Get the Heart token vault capability
    let vaultCapability = account.capabilities.get<&Heart.Vault>(/public/HeartVault)
    
    // Check if the vault capability is valid and linked
    if vaultCapability == nil || !vaultCapability!.check() {
        // Return 0 if vault is not set up or not accessible
        return 0.0
    }
    
    // Borrow the vault reference and get the balance
    let vaultRef = vaultCapability!.borrow()!
    return vaultRef.balance
} 