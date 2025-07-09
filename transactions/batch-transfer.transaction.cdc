import "Heart"
import "FungibleToken"

/// Transaction to transfer HEART tokens to multiple recipients in a single transaction
/// Includes automatic tax calculation and collection for each transfer
/// 
/// @param recipients: Array of recipient addresses
/// @param amounts: Array of amounts to transfer (before tax) - must match recipients array length
transaction(recipients: [Address], amounts: [UFix64]) {
    
    /// Reference to sender's vault
    let senderVaultRef: auth(FungibleToken.Withdraw) &Heart.Vault
    
    /// Array of recipient receiver references
    let recipientRefs: [&{FungibleToken.Receiver}]
    
    /// Treasury receiver reference (if tax applies)
    let treasuryReceiverRef: &{FungibleToken.Receiver}?
    
    /// Calculated values
    let totalTransferAmount: UFix64
    let totalTaxAmount: UFix64
    let totalRequired: UFix64
    let taxRate: UFix64
    
    /// Sender address for logging
    let senderAddress: Address

    prepare(acct: auth(BorrowValue) &Account) {
        // Store sender address
        self.senderAddress = acct.address
        
        // Input validation
        if recipients.length != amounts.length {
            panic("Recipients and amounts arrays must have the same length")
        }
        
        if recipients.length == 0 {
            panic("Must specify at least one recipient")
        }
        
        if recipients.length > 50 {
            panic("Batch transfer limited to 50 recipients maximum")
        }
        
        // Verify all amounts are positive
        var i = 0
        while i < amounts.length {
            if amounts[i] <= 0.0 {
                panic("All transfer amounts must be positive. Amount at index ".concat(i.toString()).concat(" is ").concat(amounts[i].toString()))
            }
            i = i + 1
        }
        
        // Calculate total amounts
        self.taxRate = Heart.getTaxRate()
        var totalTransfer: UFix64 = 0.0
        var totalTax: UFix64 = 0.0
        
        i = 0
        while i < amounts.length {
            totalTransfer = totalTransfer + amounts[i]
            totalTax = totalTax + (amounts[i] * self.taxRate / 100.0)
            i = i + 1
        }
        
        self.totalTransferAmount = totalTransfer
        self.totalTaxAmount = totalTax
        self.totalRequired = totalTransfer + totalTax
        
        // Borrow sender's vault
        self.senderVaultRef = acct.storage.borrow<auth(FungibleToken.Withdraw) &Heart.Vault>(from: Heart.VaultStoragePath)
            ?? panic("Could not borrow sender's HEART vault")
        
        // Verify sufficient balance
        if self.senderVaultRef.balance < self.totalRequired {
            panic("Insufficient balance: available ".concat(self.senderVaultRef.balance.toString()).concat(", required ").concat(self.totalRequired.toString()).concat(" (transfer: ").concat(self.totalTransferAmount.toString()).concat(" + tax: ").concat(self.totalTaxAmount.toString()).concat(")"))
        }
        
        // Get all recipient receiver capabilities
        self.recipientRefs = []
        i = 0
        while i < recipients.length {
            let recipientAccount = getAccount(recipients[i])
            let receiverRef = recipientAccount.capabilities.borrow<&{FungibleToken.Receiver}>(Heart.VaultPublicPath)
                ?? panic("Recipient at index ".concat(i.toString()).concat(" (").concat(recipients[i].toString()).concat(") does not have HEART vault configured"))
            self.recipientRefs.append(receiverRef)
            i = i + 1
        }
        
        // Get treasury receiver if tax applies
        if self.totalTaxAmount > 0.0 && Heart.getTreasuryAccount() != nil {
            let treasuryAccount = getAccount(Heart.getTreasuryAccount()!)
            self.treasuryReceiverRef = treasuryAccount.capabilities.borrow<&{FungibleToken.Receiver}>(Heart.VaultPublicPath)
            if self.treasuryReceiverRef == nil {
                panic("Treasury account does not have HEART vault configured")
            }
        } else {
            self.treasuryReceiverRef = nil
        }
    }

    execute {
        log("Starting batch transfer to ".concat(recipients.length.toString()).concat(" recipients"))
        
        // Process each transfer
        var i = 0
        while i < recipients.length {
            let transferAmount = amounts[i]
            let taxAmount = transferAmount * self.taxRate / 100.0
            let netAmount = transferAmount - taxAmount
            
            // Withdraw the full amount for this transfer
            let transferVault <- self.senderVaultRef.withdraw(amount: transferAmount)
            
            // If tax applies, split the vault
            if taxAmount > 0.0 && self.treasuryReceiverRef != nil {
                let taxVault <- transferVault.withdraw(amount: taxAmount)
                self.treasuryReceiverRef!.deposit(from: <-taxVault)
            }
            
            // Transfer net amount to recipient
            self.recipientRefs[i].deposit(from: <-transferVault)
            
            log("Transfer ".concat((i + 1).toString()).concat("/").concat(recipients.length.toString()).concat(": ").concat(netAmount.toString()).concat(" HEART to ").concat(recipients[i].toString()).concat(" (tax: ").concat(taxAmount.toString()).concat(")"))
            
            i = i + 1
        }
        
        log("Batch transfer completed successfully")
        log("Total transferred: ".concat(self.totalTransferAmount.toString()).concat(" HEART"))
        log("Total tax collected: ".concat(self.totalTaxAmount.toString()).concat(" HEART"))
    }

    post {
        // Verify the batch transfer was successful
        self.senderVaultRef.balance >= 0.0: "Sender vault balance should be non-negative"
    }
} 