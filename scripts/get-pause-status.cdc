import "Heart"

/// Get the current pause status of HEART token contract
/// Returns true if the contract is paused (transfers disabled)
/// Returns false if the contract is active (transfers enabled)
access(all) fun main(): Bool {
    return Heart.getIsPaused()
} 