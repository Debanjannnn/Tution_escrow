// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockUSDC is ERC20, Ownable {
    constructor() ERC20("Mock USD Coin", "mUSDC") Ownable(msg.sender) {}

    function decimals() public view virtual override returns (uint8) {
        return 6; // Match USDC decimals
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
