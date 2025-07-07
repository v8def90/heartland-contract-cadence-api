import FungibleToken from 0x9a0766d93b6608b7
import Heart from 0x58f9e6153690c852

/// Get the pause status of the Heart token contract
/// 
/// Returns the current pause status as a Bool value
/// 
/// @return Bool: True if the contract is paused, false otherwise
access(all) fun main(): Bool {
    // Get the pause status from the Heart contract
    // Try to access isPaused as a property instead of a function
    return Heart.isPaused
} 