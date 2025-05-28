# Tuition Escrow Smart Contract

A secure and transparent smart contract system for managing tuition payments using ERC20 stablecoins on the Ethereum blockchain.

## Overview

The Tuition Escrow contract provides a secure way to handle tuition payments between students (payers) and educational institutions (universities) using ERC20 stablecoins. The contract acts as an escrow service, holding funds until the conditions for release are met.

## Key Features

- Secure escrow management for tuition payments
- Support for any ERC20 stablecoin (e.g., USDC, DAI)
- Clear separation of roles (payer, university, admin)
- Transparent payment tracking with invoice references
- Automated fund release and refund mechanisms
- Event logging for all important transactions

# contract address
- https://edu-chain-testnet.blockscout.com/token/0x9E61854E7202eC8DA2973b15577dA930c98eD6a0
-https://edu-chain-testnet.blockscout.com/address/0xaEeb5901Df2072E72301d09998063Db9c59d8bcd

## Contract Functions

1. **Initialize**: Set up a new escrow with payer, university, amount, and invoice reference
2. **Deposit**: Payer deposits the agreed amount of stablecoins
3. **Release**: Admin releases funds to the university
4. **Refund**: Admin refunds funds to the payer if needed

## Technical Details

- Built with Solidity ^0.8.28
- Uses OpenZeppelin contracts for security
- Implements Ownable pattern for admin controls
- Emits events for all state changes

## Development

```shell
# Install dependencies
npm install

# Run tests
npx hardhat test

# Set your private ket
hardhat.config

# Deploy to testnet
npx hardhat run .\scripts\deploy.js --network  educhainTestnet 
```

## Security

- All critical functions are protected by access controls
- State changes are tracked and verified
- Double-spend prevention mechanisms
- Input validation for all parameters

## License

MIT License
