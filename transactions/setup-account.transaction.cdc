import "Heart"
import "FungibleToken"

/// Transaction to set up an account with a HEART token vault
/// This transaction creates and configures the necessary storage and capabilities
/// for an account to hold and interact with HEART tokens
transaction() {
    
    prepare(acct: auth(SaveValue, Capabilities) &Account) {
        // Check if the account already has a HEART vault
        if acct.storage.type(at: Heart.VaultStoragePath) != nil {
            log("Account already has a HEART vault configured")
            return
        }

        // Create a new empty HEART vault and save it to account storage
        let vault <- Heart.createEmptyVault(vaultType: Type<@Heart.Vault>()) as! @Heart.Vault
        acct.storage.save(<-vault, to: Heart.VaultStoragePath)

        // Create a public capability for the vault that allows depositing and balance checking
        let publicCap = acct.capabilities.storage.issue<&{FungibleToken.Receiver, FungibleToken.Balance}>(Heart.VaultStoragePath)
        acct.capabilities.publish(publicCap, at: Heart.VaultPublicPath)

        log("HEART vault setup completed successfully")
    }

    execute {
        log("Account has been configured to hold HEART tokens")
    }
} 