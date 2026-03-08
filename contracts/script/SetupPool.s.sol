// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {Currency} from "v4-core/types/Currency.sol";
import {LPFeeLibrary} from "v4-core/libraries/LPFeeLibrary.sol";
import {TickMath} from "v4-core/libraries/TickMath.sol";
import {PoolSwapTest} from "v4-core/test/PoolSwapTest.sol";
import {PoolModifyLiquidityTest} from "v4-core/test/PoolModifyLiquidityTest.sol";
import {ModifyLiquidityParams} from "v4-core/types/PoolOperation.sol";
import {MockERC20} from "../src/MockERC20.sol";

interface AggregatorV3Interface {
    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);
    function decimals() external view returns (uint8);
}

/// @title SetupPool
/// @notice One-shot: deploy 6-decimal MockUSDC + routers, create ETH/USDC pool at live Chainlink price, seed liquidity
contract SetupPoolScript is Script {
    address constant SEPOLIA_POOL_MANAGER = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;
    address constant CHAINLINK_ETH_USD = 0x694AA1769357215DE4FAC081bf1f309aDC325306;
    int24 constant TICK_SPACING = 60;
    uint8 constant USDC_DECIMALS = 6;

    function run() external {
        uint256 deployerPrivateKey = vm.envOr("PRIVATE_KEY", uint256(0));
        if (deployerPrivateKey == 0) revert("Set PRIVATE_KEY in env");

        address hookAddress = vm.envAddress("VITE_VOLSWAP_HOOK_ADDRESS");
        IPoolManager poolManager = IPoolManager(SEPOLIA_POOL_MANAGER);

        // ── Read live ETH/USD price from Chainlink ──────────────────────────
        AggregatorV3Interface feed = AggregatorV3Interface(CHAINLINK_ETH_USD);
        (, int256 answer,,,) = feed.latestRoundData();
        uint8 feedDecimals = feed.decimals(); // 8
        require(answer > 0, "Chainlink: negative or zero price");
        console.log("Chainlink ETH/USD price (raw):", uint256(answer));
        console.log("Chainlink decimals:", feedDecimals);

        // ── Compute sqrtPriceX96 from Chainlink price ───────────────────────
        // Uniswap v4 price = token1_raw / token0_raw
        // For ETH (18 dec) → USDC (6 dec) at $P:
        //   price = P * 10^6 / 10^18 = P * 10^-12
        //   where P = answer / 10^feedDecimals
        //   so price = answer / 10^(feedDecimals + 18 - 6) = answer / 10^20
        //
        // sqrtPriceX96 = sqrt(price) * 2^96 = sqrt(answer * 2^192 / 10^20)
        uint256 divisor = 10 ** (uint256(feedDecimals) + 18 - USDC_DECIMALS);
        uint256 priceX192 = uint256(answer) * (uint256(1) << 192) / divisor;
        uint160 sqrtPriceX96 = uint160(_sqrt(priceX192));

        // Round to valid tick for this spacing
        int24 rawTick = TickMath.getTickAtSqrtPrice(sqrtPriceX96);
        int24 initTick = (rawTick / TICK_SPACING) * TICK_SPACING;
        sqrtPriceX96 = TickMath.getSqrtPriceAtTick(initTick);

        console.log("Init tick:");
        console.logInt(initTick);

        // ── Deploy & setup ──────────────────────────────────────────────────
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy MockUSDC with 6 decimals
        MockERC20 mockUSDC = new MockERC20("Mock USDC", "USDC", USDC_DECIMALS);
        console.log("MockERC20 (VITE_TOKEN1_ADDRESS):", address(mockUSDC));

        // 2. Mint 100k USDC to deployer
        address deployer = vm.addr(deployerPrivateKey);
        mockUSDC.mint(deployer, 100_000 * (10 ** USDC_DECIMALS));

        // 3. Deploy routers
        PoolSwapTest swapRouter = new PoolSwapTest(poolManager);
        console.log("PoolSwapTest (VITE_SWAP_ROUTER_ADDRESS):", address(swapRouter));

        PoolModifyLiquidityTest liquidityRouter = new PoolModifyLiquidityTest(poolManager);
        console.log("PoolModifyLiquidityTest (VITE_LIQUIDITY_ROUTER_ADDRESS):", address(liquidityRouter));

        // 4. Approve MockUSDC to both routers
        mockUSDC.approve(address(swapRouter), type(uint256).max);
        mockUSDC.approve(address(liquidityRouter), type(uint256).max);

        // 5. Build pool key
        PoolKey memory poolKey = PoolKey({
            currency0: Currency.wrap(address(0)),
            currency1: Currency.wrap(address(mockUSDC)),
            fee: LPFeeLibrary.DYNAMIC_FEE_FLAG,
            tickSpacing: TICK_SPACING,
            hooks: IHooks(hookAddress)
        });

        // 6. Initialize pool at live Chainlink price
        int24 tick = poolManager.initialize(poolKey, sqrtPriceX96);
        console.log("Pool initialized at tick:");
        console.logInt(tick);

        // 7. Seed full-range liquidity
        ModifyLiquidityParams memory params = ModifyLiquidityParams({
            tickLower: -887220,
            tickUpper: 887220,
            liquidityDelta: 1e12,
            salt: bytes32(0)
        });
        liquidityRouter.modifyLiquidity{value: 0.05 ether}(poolKey, params, "");
        console.log("Liquidity seeded successfully");

        vm.stopBroadcast();

        console.log("");
        console.log("=== Add these to your .env ===");
        console.log("VITE_TOKEN1_ADDRESS=", address(mockUSDC));
        console.log("VITE_SWAP_ROUTER_ADDRESS=", address(swapRouter));
        console.log("VITE_LIQUIDITY_ROUTER_ADDRESS=", address(liquidityRouter));
    }

    /// @dev Babylonian square root (integer)
    function _sqrt(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }
}
