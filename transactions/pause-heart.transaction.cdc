import "Heart"

/// Transaction to pause HEART token transfers
/// Requires the signer to have PAUSER role capability
/// This will prevent all token transfers until unpaused
transaction() {
    
    /// Reference to the pauser resource
    let pauserRef: &Heart.Pauser

    prepare(acct: auth(BorrowValue) &Account) {
        // Borrow the pauser resource from account storage
        self.pauserRef = acct.storage.borrow<&Heart.Pauser>(from: Heart.PauserStoragePath)
            ?? panic("Could not borrow pauser resource. Account does not have PAUSER role")
    }

    execute {
        // Pause the contract
        self.pauserRef.pause()
        
        log("HEART contract has been paused. All token transfers are now disabled.")
    }

    post {
        // Verify the contract is now paused
        Heart.isPaused: "Contract should be paused after execution"
    }
} 