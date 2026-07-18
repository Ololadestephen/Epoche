// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Epoché — suspension before finality
/// @notice First-contact native transfers are held for a short cool-off so the
///         sender can cancel. Trusted recipients receive funds instantly.
/// @dev Not a commerce escrow. One-sided cancel exists only before unlock.
contract Epoche {
    // ─────────────────────────────────────────────────────────────────────
    // Types
    // ─────────────────────────────────────────────────────────────────────

    enum Status {
        None,
        Pending,
        Canceled,
        Claimed
    }

    struct Transfer {
        address from;
        address to;
        uint128 amount;
        uint64 unlockAt;
        Status status;
    }

    // ─────────────────────────────────────────────────────────────────────
    // Immutables / config
    // ─────────────────────────────────────────────────────────────────────

    /// @notice Hard cap on cool-off (kills long “goods escrow” cosplay).
    uint64 public immutable maxCoolOff;

    /// @notice Default cool-off when caller passes 0.
    uint64 public immutable defaultCoolOff;

    // ─────────────────────────────────────────────────────────────────────
    // Storage
    // ─────────────────────────────────────────────────────────────────────

    uint256 public nextId = 1;

    /// @notice owner => recipient => trusted (instant sends).
    mapping(address => mapping(address => bool)) public trusted;

    mapping(uint256 => Transfer) public transfers;

    // ─────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────

    event InstantSent(address indexed from, address indexed to, uint256 amount);

    event TransferCreated(
        uint256 indexed id,
        address indexed from,
        address indexed to,
        uint256 amount,
        uint64 unlockAt
    );

    event TransferCanceled(uint256 indexed id);
    event TransferClaimed(uint256 indexed id);
    event TrustedUpdated(address indexed owner, address indexed to, bool isTrusted);

    // ─────────────────────────────────────────────────────────────────────
    // Errors
    // ─────────────────────────────────────────────────────────────────────

    error ZeroAddress();
    error ZeroAmount();
    error SelfTransfer();
    error CoolOffTooLong();
    error NotPending();
    error NotSender();
    error StillLocked();
    error UnlockPassed();
    error TransferFailed();

    // ─────────────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────────────

    /// @param defaultCoolOff_ Default hold window (e.g. 15 minutes).
    /// @param maxCoolOff_     Maximum allowed hold (e.g. 30 minutes). Must be >= default.
    constructor(uint64 defaultCoolOff_, uint64 maxCoolOff_) {
        if (defaultCoolOff_ == 0 || maxCoolOff_ == 0) revert CoolOffTooLong();
        if (defaultCoolOff_ > maxCoolOff_) revert CoolOffTooLong();
        defaultCoolOff = defaultCoolOff_;
        maxCoolOff = maxCoolOff_;
    }

    // ─────────────────────────────────────────────────────────────────────
    // Trust
    // ─────────────────────────────────────────────────────────────────────

    /// @notice Mark a recipient as trusted (instant path) or revoke trust.
    function setTrusted(address to, bool trusted_) external {
        if (to == address(0)) revert ZeroAddress();
        if (to == msg.sender) revert SelfTransfer();
        trusted[msg.sender][to] = trusted_;
        emit TrustedUpdated(msg.sender, to, trusted_);
    }

    function isTrusted(address owner, address to) external view returns (bool) {
        return trusted[owner][to];
    }

    // ─────────────────────────────────────────────────────────────────────
    // Send
    // ─────────────────────────────────────────────────────────────────────

    /// @notice Send native MON. Trusted recipients get instant transfer;
    ///         everyone else enters a cancelable cool-off hold.
    /// @param to      Recipient.
    /// @param coolOff Cool-off in seconds. Pass 0 to use `defaultCoolOff`.
    ///                Ignored for trusted instant sends. Capped by `maxCoolOff`.
    function send(address to, uint64 coolOff) external payable returns (uint256 id) {
        if (to == address(0)) revert ZeroAddress();
        if (to == msg.sender) revert SelfTransfer();
        if (msg.value == 0) revert ZeroAmount();
        if (msg.value > type(uint128).max) revert ZeroAmount();

        // Instant path — no undo.
        if (trusted[msg.sender][to]) {
            _transfer(to, msg.value);
            emit InstantSent(msg.sender, to, msg.value);
            return 0;
        }

        uint64 resolved = coolOff == 0 ? defaultCoolOff : coolOff;
        if (resolved == 0 || resolved > maxCoolOff) revert CoolOffTooLong();

        id = nextId++;
        uint64 unlockAt = uint64(block.timestamp) + resolved;

        transfers[id] = Transfer({
            from: msg.sender,
            to: to,
            amount: uint128(msg.value),
            unlockAt: unlockAt,
            status: Status.Pending
        });

        emit TransferCreated(id, msg.sender, to, msg.value, unlockAt);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Cancel / Claim
    // ─────────────────────────────────────────────────────────────────────

    /// @notice Sender reclaims funds before unlock. Fails after unlock.
    function cancel(uint256 id) external {
        Transfer storage t = transfers[id];
        if (t.status != Status.Pending) revert NotPending();
        if (t.from != msg.sender) revert NotSender();
        if (block.timestamp >= t.unlockAt) revert UnlockPassed();

        t.status = Status.Canceled;
        uint256 amount = t.amount;

        emit TransferCanceled(id);
        _transfer(t.from, amount);
    }

    /// @notice After unlock, move funds to the recipient. Anyone may call.
    function claim(uint256 id) external {
        Transfer storage t = transfers[id];
        if (t.status != Status.Pending) revert NotPending();
        if (block.timestamp < t.unlockAt) revert StillLocked();

        t.status = Status.Claimed;
        uint256 amount = t.amount;
        address to = t.to;

        emit TransferClaimed(id);
        _transfer(to, amount);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Views
    // ─────────────────────────────────────────────────────────────────────

    function getTransfer(uint256 id)
        external
        view
        returns (
            address from,
            address to,
            uint128 amount,
            uint64 unlockAt,
            Status status
        )
    {
        Transfer storage t = transfers[id];
        return (t.from, t.to, t.amount, t.unlockAt, t.status);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Internal
    // ─────────────────────────────────────────────────────────────────────

    function _transfer(address to, uint256 amount) internal {
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }
}
