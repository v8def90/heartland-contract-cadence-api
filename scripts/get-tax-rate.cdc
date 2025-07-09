import "Heart"

/// Get the current tax rate for HEART token transfers
access(all) fun main(): UFix64 {
    return Heart.getTaxRate()
} 