/**
 * E2E integration test: reads from the deployed VolSwapHook on Sepolia.
 * Confirms UI ↔ contract integration (no mocks). Run: npm run test
 */
import { describe, it, expect } from "vitest";

const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
const DEPLOYED_HOOK_ADDRESS = "0x81EBC62b9E3052d0B9Dfd4394f262250315e40C0";

// cachedFee() selector (first 4 bytes of keccak256("cachedFee()"))
const CACHED_FEE_SELECTOR = "0xe75a34c9";
// lastFeeUpdate() selector
const LAST_FEE_UPDATE_SELECTOR = "0xb96bedb2";

async function ethCall(to: string, data: string): Promise<string> {
  const res = await fetch(SEPOLIA_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to, data }, "latest"],
    }),
  });
  const json = (await res.json()) as { result?: string; error?: { message: string } };
  if (json.error) throw new Error(json.error.message);
  if (typeof json.result !== "string") throw new Error("Unexpected eth_call response");
  return json.result;
}

describe("VolSwap hook E2E (Sepolia)", () => {
  it("reads cachedFee and lastFeeUpdate from deployed hook", async () => {
    const [cachedFeeHex, lastFeeUpdateHex] = await Promise.all([
      ethCall(DEPLOYED_HOOK_ADDRESS, CACHED_FEE_SELECTOR),
      ethCall(DEPLOYED_HOOK_ADDRESS, LAST_FEE_UPDATE_SELECTOR),
    ]);

    const cachedFee = parseInt(cachedFeeHex, 16);
    const lastFeeUpdate = parseInt(lastFeeUpdateHex, 16);

    expect(cachedFee).toBeGreaterThanOrEqual(100);
    expect(cachedFee).toBeLessThanOrEqual(10000);
    expect(lastFeeUpdate).toBeGreaterThan(0);
  }, 20_000);
});
