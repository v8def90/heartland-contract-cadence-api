import "Heart"

/// Get the treasury account address for HEART token tax collection
/// Returns the address where 5% tax from transfers is collected
/// Returns nil if no treasury account has been set
access(all) fun main(): Address? {
    return Heart.getTreasuryAccount()
} 