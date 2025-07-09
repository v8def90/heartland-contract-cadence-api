import "Heart"

/// Transaction to set up admin roles (Minter, Pauser, TaxManager) in the admin account
/// Requires the signer to have ADMIN role capability
/// This creates and stores all administrative resources in the same account
transaction() {
    
    /// Reference to the admin resource
    let adminRef: &Heart.Admin

    prepare(acct: auth(SaveValue, BorrowValue) &Account) {
        // Borrow the admin resource from account storage
        self.adminRef = acct.storage.borrow<&Heart.Admin>(from: Heart.AdminStoragePath)
            ?? panic("Could not borrow admin resource. Account does not have ADMIN role")

        // Check if minter already exists
        if acct.storage.type(at: Heart.MinterStoragePath) == nil {
            // Create and save minter resource
            let minter <- self.adminRef.createNewMinter()
            acct.storage.save(<-minter, to: Heart.MinterStoragePath)
            log("Minter resource created and saved")
        } else {
            log("Minter resource already exists")
        }

        // Check if pauser already exists
        if acct.storage.type(at: Heart.PauserStoragePath) == nil {
            // Create and save pauser resource
            let pauser <- self.adminRef.createNewPauser()
            acct.storage.save(<-pauser, to: Heart.PauserStoragePath)
            log("Pauser resource created and saved")
        } else {
            log("Pauser resource already exists")
        }

        // Check if tax manager already exists
        if acct.storage.type(at: Heart.TaxManagerStoragePath) == nil {
            // Create and save tax manager resource
            let taxManager <- self.adminRef.createNewTaxManager()
            acct.storage.save(<-taxManager, to: Heart.TaxManagerStoragePath)
            log("TaxManager resource created and saved")
        } else {
            log("TaxManager resource already exists")
        }
    }

    execute {
        log("All administrative roles have been set up successfully")
    }

    post {
        // Post-conditions verified through transaction success
        // Individual resource creation is logged during execution
    }
} 