import FungibleToken from 0x9a0766d93b6608b7
import Heart from 0x58f9e6153690c852

/// Get the current tax rate from the Heart Token contract
/// 
/// Returns the tax rate as a UFix64 value (e.g., 0.05 for 5%)
/// 
/// @return UFix64: The current tax rate as a decimal
access(all) fun main(): UFix64 {
    // Get the tax rate from the Heart contract
    let taxRate = Heart.getTaxRate()
    
    return taxRate
} 