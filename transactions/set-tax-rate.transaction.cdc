import "Heart"

/// Transaction to set the tax rate for HEART token transfers
/// Requires the signer to have ADMIN role capability
/// Tax rate must be between 0.0 and 100.0 percent
transaction(newTaxRate: UFix64) {
    
    /// Reference to the admin resource
    let adminRef: &Heart.Admin

    prepare(acct: auth(BorrowValue) &Account) {
        // Borrow the admin resource from account storage
        self.adminRef = acct.storage.borrow<&Heart.Admin>(from: Heart.AdminStoragePath)
            ?? panic("Could not borrow admin resource. Account does not have ADMIN role")
    }

    execute {
        // Set the new tax rate
        self.adminRef.setTaxRate(newRate: newTaxRate)
        
        log("HEART token tax rate has been updated to: ".concat(newTaxRate.toString()).concat("%"))
    }

    post {
        // Verify the tax rate has been updated
        Heart.getTaxRate() == newTaxRate: "Tax rate should be updated after execution"
    }
} 