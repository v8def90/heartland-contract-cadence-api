import "Heart"
import "FungibleToken"

/// Transaction to mint HEART tokens to a specified recipient
/// Requires the signer to have MINTER role capability
/// 
/// @param recipient: Address to receive the minted tokens
/// @param amount: Amount of HEART tokens to mint (as UFix64)
transaction(recipient: Address, amount: UFix64) {
    
    /// Reference to the minter resource
    let minterRef: &Heart.Minter

    prepare(acct: auth(BorrowValue) &Account) {
        // Borrow the minter resource from account storage
        self.minterRef = acct.storage.borrow<&Heart.Minter>(from: Heart.MinterStoragePath)
            ?? panic("Could not borrow minter resource. Account does not have MINTER role")
        
        // Verify recipient has a HEART vault set up
        let recipientAccount = getAccount(recipient)
        let receiverCap = recipientAccount.capabilities.get<&{FungibleToken.Receiver}>(Heart.VaultPublicPath)
        if !receiverCap.check() {
            panic("Recipient does not have a HEART vault configured")
        }
    }

    execute {
        // Mint tokens to the specified recipient
        self.minterRef.mintTokens(amount: amount, recipient: recipient)
        
        log("Successfully minted ".concat(amount.toString()).concat(" HEART tokens to ").concat(recipient.toString()))
    }

    post {
        // Verify the total supply increased by the minted amount
        Heart.totalSupply >= amount: "Total supply should have increased by minted amount"
    }
} 