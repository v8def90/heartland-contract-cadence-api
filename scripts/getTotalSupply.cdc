import "Heart"

/// Get the total supply of HEART tokens
access(all) fun main(): UFix64 {
    return Heart.getTotalSupply()
} 