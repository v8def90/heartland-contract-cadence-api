import FungibleToken from 0x9a0766d93b6608b7
import Heart from 0x58f9e6153690c852

/// Get the treasury account address from the Heart token contract
/// 
/// Returns the treasury account address as an Address value
/// Returns the contract address as default if treasury account is not set
/// 
/// @return Address: The treasury account address or contract address as fallback
access(all) fun main(): Address {
    // Get the treasury account address from the Heart contract
    // Use contract address as fallback if treasury account is not set
    return Heart.treasuryAccount ?? 0x58f9e6153690c852
} 