import "Heart"
import "FungibleToken"

/// Transaction to burn (destroy) HEART tokens from the signer's vault
/// This permanently removes tokens from circulation by withdrawing and destroying them
/// 
/// @param amount: Amount of HEART tokens to burn (as UFix64)
transaction(amount: UFix64) {
    
    /// Reference to the signer's vault
    let vaultRef: auth(FungibleToken.Withdraw) &Heart.Vault
    
    /// Original total supply before burning
    let originalTotalSupply: UFix64
    
    /// Signer's balance before burning
    let originalBalance: UFix64

    prepare(acct: auth(BorrowValue) &Account) {
        // Record original state
        self.originalTotalSupply = Heart.getTotalSupply()
        
        // Borrow the signer's vault
        self.vaultRef = acct.storage.borrow<auth(FungibleToken.Withdraw) &Heart.Vault>(from: Heart.VaultStoragePath)
            ?? panic("Could not borrow HEART vault from signer")
        
        self.originalBalance = self.vaultRef.balance
        
        // Verify sufficient balance
        if self.vaultRef.balance < amount {
            panic("Insufficient balance for burn: available ".concat(self.vaultRef.balance.toString()).concat(", requested ").concat(amount.toString()))
        }
        
        // Verify positive amount
        if amount <= 0.0 {
            panic("Burn amount must be positive")
        }
        
        // Verify contract is not paused
        if Heart.getIsPaused() {
            panic("Cannot burn tokens while contract is paused")
        }
    }

    execute {
        // Withdraw tokens from the signer's vault
        let burnVault <- self.vaultRef.withdraw(amount: amount)
        
        // Log burn action before destroying
        log("Burning ".concat(amount.toString()).concat(" HEART tokens from ").concat(self.vaultRef.owner!.address.toString()))
        
        // Destroy the vault (this burns the tokens)
        destroy burnVault
        
        log("Successfully burned ".concat(amount.toString()).concat(" HEART tokens"))
    }

    post {
        // Verify the tokens were actually removed from the signer's balance
        self.vaultRef.balance == self.originalBalance - amount: "Burn amount should be deducted from signer's balance"
        
        // Note: totalSupply is NOT automatically reduced in this implementation
        // This is because the Heart contract doesn't have a built-in burn mechanism that updates totalSupply
        // The tokens are effectively removed from circulation but totalSupply remains unchanged
        Heart.getTotalSupply() == self.originalTotalSupply: "Total supply remains unchanged (tokens destroyed but not decremented)"
    }
} 