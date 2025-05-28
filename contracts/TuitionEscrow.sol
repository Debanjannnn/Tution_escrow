// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title TuitionEscrow
/// @notice Escrow contract for tuition payments or donations using an ERC20 stablecoin
/// @dev Manages deposits, releases, and refunds for payments to universities, with admin control
contract TuitionEscrow is Ownable {
    IERC20 public stablecoin; // ERC20 stablecoin (e.g., USDC)
    address public payer; // Address of the user making the payment
    address public university; // Address of the recipient institution
    uint256 public amount; // Payment amount in stablecoin
    string public invoiceRef; // Reference for the payment (e.g., invoice ID)
    bool public isDeposited; // Tracks if funds are deposited
    bool public isReleased; // Tracks if funds are released
    bool public isRefunded; // Tracks if funds are refunded

    /// @notice Emitted when funds are deposited
    event Deposited(address indexed payer, address indexed university, uint256 amount, string invoiceRef);
    /// @notice Emitted when funds are released to the university
    event Released(address indexed university, uint256 amount);
    /// @notice Emitted when funds are refunded to the payer
    event Refunded(address indexed payer, uint256 amount);

    /// @notice Constructor to set the stablecoin address
    /// @param _stablecoin Address of the ERC20 stablecoin contract
    constructor(address _stablecoin) Ownable(msg.sender) {
        stablecoin = IERC20(_stablecoin);
    }

    /// @notice Initializes the escrow with payment details
    /// @param _payer Address of the user making the payment
    /// @param _university Address of the recipient institution
    /// @param _amount Amount of stablecoin to be transferred
    /// @param _invoiceRef Reference string for the payment
    function initialize(
        address _payer,
        address _university,
        uint256 _amount,
        string calldata _invoiceRef
    ) external onlyOwner {
        require(_payer != address(0) && _university != address(0), "Invalid address");
        require(_amount > 0, "Amount must be greater than 0");
        require(payer == address(0), "Escrow already initialized");

        payer = _payer;
        university = _university;
        amount = _amount;
        invoiceRef = _invoiceRef;
    }

    /// @notice Deposits the stablecoin amount from the payer to the contract
    /// @dev Requires the payer to have approved the contract to spend the amount
    function deposit() external {
        require(msg.sender == payer, "Only payer can deposit");
        require(!isDeposited, "Funds already deposited");
        require(amount > 0, "Amount not initialized");

        isDeposited = true;
        require(stablecoin.transferFrom(payer, address(this), amount), "Transfer failed");
        emit Deposited(payer, university, amount, invoiceRef);
    }

    /// @notice Releases the deposited funds to the university
    /// @dev Only callable by the owner, prevents double release
    function release() external onlyOwner {
        require(isDeposited, "Funds not deposited");
        require(!isReleased, "Funds already released");
        require(!isRefunded, "Funds already refunded");

        isReleased = true;
        require(stablecoin.transfer(university, amount), "Transfer failed");
        emit Released(university, amount);
    }

    /// @notice Refunds the deposited funds to the payer
    /// @dev Only callable by the owner, prevents double refund
    function refund() external onlyOwner {
        require(isDeposited, "Funds not deposited");
        require(!isReleased, "Funds already released");
        require(!isRefunded, "Funds already refunded");

        isRefunded = true;
        require(stablecoin.transfer(payer, amount), "Transfer failed");
        emit Refunded(payer, amount);
    }
}