import "Heart"

/// Transaction to set the treasury account for HEART token tax collection
/// Requires the signer to have ADMIN role capability
/// Treasury account will receive 5% tax from all token transfers
transaction(newTreasuryAccount: Address) {
    
    /// Reference to the admin resource
    let adminRef: &Heart.Admin

    prepare(acct: auth(BorrowValue) &Account) {
        // Borrow the admin resource from account storage
        self.adminRef = acct.storage.borrow<&Heart.Admin>(from: Heart.AdminStoragePath)
            ?? panic("Could not borrow admin resource. Account does not have ADMIN role")
    }

    execute {
        // Set the new treasury account
        self.adminRef.setTreasuryAccount(newAccount: newTreasuryAccount)
        
        log("HEART token treasury account has been updated to: ".concat(newTreasuryAccount.toString()))
    }

    post {
        // Verify the treasury account has been updated
        Heart.getTreasuryAccount() == newTreasuryAccount: "Treasury account should be updated after execution"
    }
} 