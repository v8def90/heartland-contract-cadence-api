// Get Account Information Script
// Retrieves detailed account information including public keys

import "FlowToken" from 0x7e60df042a9c0868

access(all) fun main(address: Address): {String: AnyStruct} {
    let account = getAccount(address)
    
    // Get basic account info
    let accountInfo: {String: AnyStruct} = {}
    
    // Account address
    accountInfo["address"] = address.toString()
    
    // Storage info
    accountInfo["storageUsed"] = account.storage.used
    accountInfo["storageCapacity"] = account.storage.capacity
    
    // Balance info
    let flowTokenBalance = account.balance
    accountInfo["flowBalance"] = flowTokenBalance
    
    // Keys information
    let keysInfo: [AnyStruct] = []
    let keyCount = Int(account.keys.count)
    accountInfo["keyCount"] = keyCount
    
    var i = 0
    while i < keyCount {
        if let key = account.keys.get(keyIndex: i) {
            let keyInfo: {String: AnyStruct} = {}
            keyInfo["keyIndex"] = i
            keyInfo["publicKey"] = key.publicKey.publicKey
            keyInfo["signAlgo"] = key.publicKey.signatureAlgorithm.rawValue
            keyInfo["hashAlgo"] = key.hashAlgorithm.rawValue
            keyInfo["weight"] = key.weight
            keyInfo["isRevoked"] = key.isRevoked
            keysInfo.append(keyInfo)
        }
        i = i + 1
    }
    
    accountInfo["keys"] = keysInfo
    
    // Contracts deployed
    let contractNames = account.contracts.names
    accountInfo["contracts"] = contractNames
    
    return accountInfo
} 