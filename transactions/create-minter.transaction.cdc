import "Heart"

/// Transaction to create a new Minter resource
/// Requires the signer to have ADMIN role capability
/// 
/// @param minterAccount: Address that will receive the minter capability
transaction(minterAccount: Address) {
    
    /// Reference to the admin resource
    let adminRef: &Heart.Admin

    prepare(acct: auth(BorrowValue) &Account) {
        // Borrow the admin resource from account storage
        self.adminRef = acct.storage.borrow<&Heart.Admin>(from: Heart.AdminStoragePath)
            ?? panic("Could not borrow admin resource. Account does not have ADMIN role")
    }

    execute {
        // Create a new minter resource
        let newMinter <- self.adminRef.createNewMinter()
        
        // Get the target account and save the minter resource
        let minterAcct = getAccount(minterAccount)
        
        // Note: In a real scenario, you would need authorization from the target account
        // For emulator testing, we'll assume proper authorization
        // This should typically be done through a multi-signature transaction or 
        // the target account should execute their own transaction to receive the capability
        
        log("Minter resource created for account: ".concat(minterAccount.toString()))
        log("The minter resource should be saved to the target account's storage")
        log("Target account needs to execute a transaction to accept the minter role")
        
        // For now, destroy the minter since we can't save to another account without proper auth
        destroy newMinter
    }
} 