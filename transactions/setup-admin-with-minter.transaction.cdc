import "Heart"

/// Transaction to set up Minter resource in the admin account
/// Requires the signer to have ADMIN role capability
/// This transaction creates a Minter resource and saves it to the admin account's storage
transaction() {
    
    /// Reference to the admin resource
    let adminRef: &Heart.Admin

    prepare(acct: auth(BorrowValue, SaveValue) &Account) {
        // Borrow the admin resource from account storage
        self.adminRef = acct.storage.borrow<&Heart.Admin>(from: Heart.AdminStoragePath)
            ?? panic("Could not borrow admin resource. Account does not have ADMIN role")
    }

    execute {
        // Create a new minter resource
        let newMinter <- self.adminRef.createNewMinter()
        
        // Save the minter resource to the admin account's storage
        let adminAccount = self.adminRef.owner!
        adminAccount.storage.save(<-newMinter, to: Heart.MinterStoragePath)
        
        log("Minter resource created and saved to admin account storage")
        log("Admin account now has MINTER role capability")
    }
    
    post {
        // Verify that the minter resource was saved correctly
        let adminAccount = self.adminRef.owner!
        adminAccount.storage.check<@Heart.Minter>(from: Heart.MinterStoragePath):
            "Failed to save minter resource to admin account"
    }
} 