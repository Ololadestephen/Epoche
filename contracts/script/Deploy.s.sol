// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {Epoche} from "../src/Epoche.sol";

/// @notice Deploy Epoché to Monad (or any EVM).
/// @dev Default production cool-offs: 15 min / max 30 min.
///      For easier live demos, set DEMO=true to use 120s / max 30 min.
contract DeployScript is Script {
    function run() external {
        uint64 defaultCoolOff = 15 minutes;
        uint64 maxCoolOff = 30 minutes;

        // forge script ... --sig "run()" with env DEMO=true for short cool-off
        try vm.envBool("DEMO") returns (bool demo) {
            if (demo) {
                defaultCoolOff = 2 minutes;
                console2.log("DEMO mode: defaultCoolOff = 2 minutes");
            }
        } catch {}

        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);

        Epoche epoche = new Epoche(defaultCoolOff, maxCoolOff);

        vm.stopBroadcast();

        console2.log("Epoche deployed at:", address(epoche));
        console2.log("defaultCoolOff:", defaultCoolOff);
        console2.log("maxCoolOff:", maxCoolOff);
    }
}
