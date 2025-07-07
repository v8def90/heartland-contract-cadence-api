import FungibleToken from 0x9a0766d93b6608b7
import Heart from 0x58f9e6153690c852

/// Check admin capabilities for a specific address
/// 
/// @param address: The Flow address to check capabilities for
/// @return {String: Bool}: A dictionary of capabilities and their status
access(all) fun main(address: Address): {String: Bool} {
    // Get the account for the given address
    let account = getAccount(address)
    
    // Check if this is the contract address (always has admin rights)
    let isContractAddress = address == 0x58f9e6153690c852
    
    // In a real implementation, you would check for specific capabilities:
    // - AdminCapability resource in account storage
    // - Specific capability links for minting, pausing, etc.
    // For now, we'll use the contract address as the primary admin
    
    // Additional logic could include:
    // let hasAdminResource = account.storage.borrow<&AdminResource>(from: /storage/AdminResource) != nil
    // let hasMintCap = account.capabilities.borrow<&MinterCapability>(/public/Minter) != nil
    
    let isAdmin = isContractAddress
    
    return {
        "canMint": isAdmin,
        "canBurn": isAdmin,
        "canPause": isAdmin,
        "canSetTaxRate": isAdmin,
        "canSetTreasury": isAdmin,
        "isAdmin": isAdmin,
        "isContractOwner": isContractAddress
    }
} 