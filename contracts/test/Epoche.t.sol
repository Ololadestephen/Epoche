// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Epoche} from "../src/Epoche.sol";

contract EpocheTest is Test {
    Epoche internal epoche;

    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal carol = makeAddr("carol");

    uint64 internal constant DEFAULT_COOLOFF = 15 minutes;
    uint64 internal constant MAX_COOLOFF = 30 minutes;

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

    function setUp() public {
        epoche = new Epoche(DEFAULT_COOLOFF, MAX_COOLOFF);
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
        vm.deal(carol, 100 ether);
    }

    // ─── Constructor ─────────────────────────────────────────────────────

    function test_ConstructorSetsCoolOffs() public view {
        assertEq(epoche.defaultCoolOff(), DEFAULT_COOLOFF);
        assertEq(epoche.maxCoolOff(), MAX_COOLOFF);
    }

    function test_ConstructorRevertsIfDefaultExceedsMax() public {
        vm.expectRevert(Epoche.CoolOffTooLong.selector);
        new Epoche(1 hours, 30 minutes);
    }

    function test_ConstructorRevertsIfZero() public {
        vm.expectRevert(Epoche.CoolOffTooLong.selector);
        new Epoche(0, MAX_COOLOFF);
    }

    // ─── Protected send ──────────────────────────────────────────────────

    function test_SendCreatesPendingTransfer() public {
        uint256 id;
        vm.prank(alice);
        vm.expectEmit(true, true, true, true);
        emit TransferCreated(1, alice, bob, 1 ether, uint64(block.timestamp + DEFAULT_COOLOFF));
        id = epoche.send{value: 1 ether}(bob, 0);

        assertEq(id, 1);
        (
            address from,
            address to,
            uint128 amount,
            uint64 unlockAt,
            Epoche.Status status
        ) = epoche.getTransfer(1);

        assertEq(from, alice);
        assertEq(to, bob);
        assertEq(amount, 1 ether);
        assertEq(unlockAt, uint64(block.timestamp + DEFAULT_COOLOFF));
        assertEq(uint8(status), uint8(Epoche.Status.Pending));
        assertEq(address(epoche).balance, 1 ether);
    }

    function test_SendWithCustomCoolOff() public {
        vm.prank(alice);
        uint256 id = epoche.send{value: 1 ether}(bob, 5 minutes);
        (,,, uint64 unlockAt,) = epoche.getTransfer(id);
        assertEq(unlockAt, uint64(block.timestamp + 5 minutes));
    }

    function test_SendRevertsCoolOffTooLong() public {
        vm.prank(alice);
        vm.expectRevert(Epoche.CoolOffTooLong.selector);
        epoche.send{value: 1 ether}(bob, 31 minutes);
    }

    function test_SendRevertsZeroAmount() public {
        vm.prank(alice);
        vm.expectRevert(Epoche.ZeroAmount.selector);
        epoche.send{value: 0}(bob, 0);
    }

    function test_SendRevertsZeroAddress() public {
        vm.prank(alice);
        vm.expectRevert(Epoche.ZeroAddress.selector);
        epoche.send{value: 1 ether}(address(0), 0);
    }

    function test_SendRevertsSelfTransfer() public {
        vm.prank(alice);
        vm.expectRevert(Epoche.SelfTransfer.selector);
        epoche.send{value: 1 ether}(alice, 0);
    }

    // ─── Cancel ──────────────────────────────────────────────────────────

    function test_CancelRefundsSender() public {
        vm.prank(alice);
        uint256 id = epoche.send{value: 2 ether}(bob, 0);

        uint256 beforeBal = alice.balance;
        vm.prank(alice);
        vm.expectEmit(true, false, false, false);
        emit TransferCanceled(id);
        epoche.cancel(id);

        assertEq(alice.balance, beforeBal + 2 ether);
        assertEq(address(epoche).balance, 0);
        (,,,, Epoche.Status status) = epoche.getTransfer(id);
        assertEq(uint8(status), uint8(Epoche.Status.Canceled));
    }

    function test_CancelRevertsAfterUnlock() public {
        vm.prank(alice);
        uint256 id = epoche.send{value: 1 ether}(bob, 0);

        vm.warp(block.timestamp + DEFAULT_COOLOFF);
        vm.prank(alice);
        vm.expectRevert(Epoche.UnlockPassed.selector);
        epoche.cancel(id);
    }

    function test_CancelRevertsIfNotSender() public {
        vm.prank(alice);
        uint256 id = epoche.send{value: 1 ether}(bob, 0);

        vm.prank(bob);
        vm.expectRevert(Epoche.NotSender.selector);
        epoche.cancel(id);
    }

    function test_CancelRevertsIfAlreadyCanceled() public {
        vm.prank(alice);
        uint256 id = epoche.send{value: 1 ether}(bob, 0);
        vm.prank(alice);
        epoche.cancel(id);

        vm.prank(alice);
        vm.expectRevert(Epoche.NotPending.selector);
        epoche.cancel(id);
    }

    // ─── Claim ───────────────────────────────────────────────────────────

    function test_ClaimPaysRecipient() public {
        vm.prank(alice);
        uint256 id = epoche.send{value: 3 ether}(bob, 0);

        vm.warp(block.timestamp + DEFAULT_COOLOFF);
        uint256 beforeBal = bob.balance;

        vm.prank(carol); // anyone may claim
        vm.expectEmit(true, false, false, false);
        emit TransferClaimed(id);
        epoche.claim(id);

        assertEq(bob.balance, beforeBal + 3 ether);
        assertEq(address(epoche).balance, 0);
        (,,,, Epoche.Status status) = epoche.getTransfer(id);
        assertEq(uint8(status), uint8(Epoche.Status.Claimed));
    }

    function test_ClaimRevertsBeforeUnlock() public {
        vm.prank(alice);
        uint256 id = epoche.send{value: 1 ether}(bob, 0);

        vm.prank(bob);
        vm.expectRevert(Epoche.StillLocked.selector);
        epoche.claim(id);
    }

    function test_ClaimRevertsIfAlreadyClaimed() public {
        vm.prank(alice);
        uint256 id = epoche.send{value: 1 ether}(bob, 0);
        vm.warp(block.timestamp + DEFAULT_COOLOFF);
        epoche.claim(id);

        vm.expectRevert(Epoche.NotPending.selector);
        epoche.claim(id);
    }

    function test_CannotCancelAfterClaim() public {
        vm.prank(alice);
        uint256 id = epoche.send{value: 1 ether}(bob, 0);
        vm.warp(block.timestamp + DEFAULT_COOLOFF);
        epoche.claim(id);

        vm.prank(alice);
        vm.expectRevert(Epoche.NotPending.selector);
        epoche.cancel(id);
    }

    // ─── Trust / Instant ─────────────────────────────────────────────────

    function test_SetTrusted() public {
        vm.prank(alice);
        vm.expectEmit(true, true, false, true);
        emit TrustedUpdated(alice, bob, true);
        epoche.setTrusted(bob, true);
        assertTrue(epoche.isTrusted(alice, bob));

        vm.prank(alice);
        epoche.setTrusted(bob, false);
        assertFalse(epoche.isTrusted(alice, bob));
    }

    function test_TrustedSendIsInstant() public {
        vm.prank(alice);
        epoche.setTrusted(bob, true);

        uint256 beforeBob = bob.balance;
        uint256 beforeAlice = alice.balance;

        vm.prank(alice);
        vm.expectEmit(true, true, false, true);
        emit InstantSent(alice, bob, 1 ether);
        uint256 id = epoche.send{value: 1 ether}(bob, 0);

        assertEq(id, 0);
        assertEq(bob.balance, beforeBob + 1 ether);
        assertEq(alice.balance, beforeAlice - 1 ether);
        assertEq(address(epoche).balance, 0);
        // no pending transfer stored
        (,,,, Epoche.Status status) = epoche.getTransfer(1);
        assertEq(uint8(status), uint8(Epoche.Status.None));
    }

    function test_UntrustRestoresProtection() public {
        vm.prank(alice);
        epoche.setTrusted(bob, true);
        vm.prank(alice);
        epoche.setTrusted(bob, false);

        vm.prank(alice);
        uint256 id = epoche.send{value: 1 ether}(bob, 0);
        assertEq(id, 1);
        (,,,, Epoche.Status status) = epoche.getTransfer(id);
        assertEq(uint8(status), uint8(Epoche.Status.Pending));
    }

    function test_TrustIsPerOwner() public {
        vm.prank(alice);
        epoche.setTrusted(bob, true);

        // carol has not trusted bob — her send is protected
        vm.prank(carol);
        uint256 id = epoche.send{value: 1 ether}(bob, 0);
        assertEq(id, 1);
        (,,,, Epoche.Status status) = epoche.getTransfer(id);
        assertEq(uint8(status), uint8(Epoche.Status.Pending));
    }

    // ─── Accounting ──────────────────────────────────────────────────────

    function test_PendingBalanceMatchesSum() public {
        vm.prank(alice);
        epoche.send{value: 1 ether}(bob, 0);
        vm.prank(alice);
        epoche.send{value: 2 ether}(carol, 0);
        assertEq(address(epoche).balance, 3 ether);

        vm.prank(alice);
        epoche.cancel(1);
        assertEq(address(epoche).balance, 2 ether);

        vm.warp(block.timestamp + DEFAULT_COOLOFF);
        epoche.claim(2);
        assertEq(address(epoche).balance, 0);
    }

    // ─── Fuzz ────────────────────────────────────────────────────────────

    function testFuzz_CoolOffBounded(uint64 coolOff) public {
        coolOff = uint64(bound(coolOff, 1, MAX_COOLOFF));
        vm.prank(alice);
        uint256 id = epoche.send{value: 1 ether}(bob, coolOff);
        (,,, uint64 unlockAt,) = epoche.getTransfer(id);
        assertEq(unlockAt, uint64(block.timestamp + coolOff));
    }

    function testFuzz_CoolOffOverMaxReverts(uint64 coolOff) public {
        coolOff = uint64(bound(coolOff, MAX_COOLOFF + 1, type(uint64).max));
        vm.prank(alice);
        vm.expectRevert(Epoche.CoolOffTooLong.selector);
        epoche.send{value: 1 ether}(bob, coolOff);
    }

    function testFuzz_CancelRefundsExact(uint96 amount) public {
        amount = uint96(bound(amount, 1, 50 ether));
        vm.deal(alice, uint256(amount) + 10 ether);

        vm.prank(alice);
        uint256 id = epoche.send{value: amount}(bob, 0);

        uint256 before = alice.balance;
        vm.prank(alice);
        epoche.cancel(id);
        assertEq(alice.balance, before + amount);
    }
}
