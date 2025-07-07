import FungibleToken from 0x9a0766d93b6608b7
import Heart from 0x58f9e6153690c852

/// Get the total supply of Heart tokens
/// 
/// Returns the total supply as a UFix64 value
/// 
/// @return UFix64: The total supply of Heart tokens
access(all) fun main(): UFix64 {
    // Get the total supply from the Heart contract
    let totalSupply = Heart.totalSupply
    
    return totalSupply
} 