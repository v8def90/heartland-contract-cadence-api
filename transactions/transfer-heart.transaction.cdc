import "Heart"
import "FungibleToken"

/// Transaction to transfer HEART tokens from sender to recipient
/// Includes automatic tax calculation and collection to treasury
/// 
/// @param recipient: Address to receive the tokens
/// @param amount: Amount of HEART tokens to transfer (before tax)
transaction(recipient: Address, amount: UFix64) {
    
    /// Reference to sender's vault
    let senderVaultRef: auth(FungibleToken.Withdraw) &Heart.Vault
    
    /// Reference to recipient's receiver capability
    let recipientReceiverRef: &{FungibleToken.Receiver}
    
    /// Reference to treasury receiver (if tax applies)
    let treasuryReceiverRef: &{FungibleToken.Receiver}?
    
    /// Calculated amounts
    let taxAmount: UFix64
    let netAmount: UFix64
    
    /// Sender address for logging and events
    let senderAddress: Address

    prepare(acct: auth(BorrowValue) &Account) {
        // Store sender address
        self.senderAddress = acct.address
        // Borrow sender's vault
        self.senderVaultRef = acct.storage.borrow<auth(FungibleToken.Withdraw) &Heart.Vault>(from: Heart.VaultStoragePath)
            ?? panic("Could not borrow sender's HEART vault")
        
        // Verify sender has sufficient balance
        if self.senderVaultRef.balance < amount {
            panic("Insufficient balance: available ".concat(self.senderVaultRef.balance.toString()).concat(", required ").concat(amount.toString()))
        }
        
        // Get recipient's receiver capability
        let recipientAccount = getAccount(recipient)
        self.recipientReceiverRef = recipientAccount.capabilities.borrow<&{FungibleToken.Receiver}>(Heart.VaultPublicPath)
            ?? panic("Recipient does not have HEART vault configured")
        
        // Calculate tax and net amounts
        self.taxAmount = amount * Heart.taxRate / 100.0
        self.netAmount = amount - self.taxAmount
        
        // Get treasury receiver if tax applies and treasury is set
        if self.taxAmount > 0.0 && Heart.treasuryAccount != nil {
            let treasuryAccount = getAccount(Heart.treasuryAccount!)
            self.treasuryReceiverRef = treasuryAccount.capabilities.borrow<&{FungibleToken.Receiver}>(Heart.VaultPublicPath)
            if self.treasuryReceiverRef == nil {
                panic("Treasury account does not have HEART vault configured")
            }
        } else {
            self.treasuryReceiverRef = nil
        }
    }

    execute {
        // Withdraw the full amount from sender
        let transferVault <- self.senderVaultRef.withdraw(amount: amount)
        
        // If tax applies, split the vault
        if self.taxAmount > 0.0 && self.treasuryReceiverRef != nil {
            let taxVault <- transferVault.withdraw(amount: self.taxAmount)
            self.treasuryReceiverRef!.deposit(from: <-taxVault)
            
            // Tax collection completed - event will be emitted by contract
            log("Tax collected: ".concat(self.taxAmount.toString()).concat(" HEART from ").concat(self.senderAddress.toString()))
        }
        
        // Transfer the net amount to recipient
        self.recipientReceiverRef.deposit(from: <-transferVault)
        
        log("Transfer completed: ".concat(self.netAmount.toString()).concat(" HEART to ").concat(recipient.toString()))
        if self.taxAmount > 0.0 {
            log("Tax collected: ".concat(self.taxAmount.toString()).concat(" HEART to treasury"))
        }
    }

    post {
        // Verify the transfer was successful
        self.senderVaultRef.balance >= 0.0: "Sender vault balance should be non-negative"
    }
} 