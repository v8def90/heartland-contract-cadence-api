import "Heart"

/// Transaction to unpause HEART token transfers
/// Requires the signer to have PAUSER role capability
/// This will re-enable all token transfers
transaction() {
    
    /// Reference to the pauser resource
    let pauserRef: &Heart.Pauser

    prepare(acct: auth(BorrowValue) &Account) {
        // Borrow the pauser resource from account storage
        self.pauserRef = acct.storage.borrow<&Heart.Pauser>(from: Heart.PauserStoragePath)
            ?? panic("Could not borrow pauser resource. Account does not have PAUSER role")
    }

    execute {
        // Unpause the contract
        self.pauserRef.unpause()
        
        log("HEART contract has been unpaused. Token transfers are now enabled.")
    }

    post {
        // Verify the contract is no longer paused
        !Heart.isPaused: "Contract should not be paused after execution"
    }
} 