import FungibleToken from 0x9a0766d93b6608b7
import Heart from 0x58f9e6153690c852

/// Transaction to set up a Heart token vault for an account
/// 
/// This transaction creates a new Heart Vault resource and saves it to the signer's account storage.
/// It also creates a public capability to the vault so others can deposit tokens.
///
/// @param None - Uses the transaction signer as the account to set up
transaction() {
    prepare(signer: auth(Storage, Capabilities) &Account) {
        // Check if vault already exists to avoid overwriting
        if signer.storage.borrow<&Heart.Vault>(from: /storage/HeartVault) != nil {
            log("Heart Vault already exists for this account")
            return
        }

        // Create a new Heart Vault resource
        let vault <- Heart.createEmptyVault(vaultType: Type<@Heart.Vault>())

        // Save the vault to the account's storage
        signer.storage.save(<-vault, to: /storage/HeartVault)

        // Create a public capability for the vault that allows deposits
        let vaultCapability = signer.capabilities.storage.issue<&Heart.Vault>(/storage/HeartVault)
        signer.capabilities.publish(vaultCapability, at: /public/HeartVault)

        log("Heart Vault successfully set up for account")
    }

    execute {
        log("Setup account transaction completed successfully")
    }
} 