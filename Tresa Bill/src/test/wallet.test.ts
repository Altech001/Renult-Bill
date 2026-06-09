import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renultApi } from "../api/foreform";

describe("renultApi.wallets", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    // Mock localstorage to return token if needed
    localStorage.setItem("renult:auth-token", "test-token");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("myWallets calls GET /wallets/my-wallets", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => [{ id: "wallet-1", balance: 5000 }],
    });

    const res = await renultApi.wallets.myWallets();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/wallets/my-wallets"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      })
    );
    expect(res).toEqual([{ id: "wallet-1", balance: 5000 }]);
  });

  it("getBranchWallet calls GET /wallets/branch/{branchId}", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => ({ id: "wallet-1", branch_id: "branch-a", balance: 12000 }),
    });

    const res = await renultApi.wallets.getBranchWallet("branch-a");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/wallets/branch/branch-a"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      })
    );
    expect(res).toEqual({ id: "wallet-1", branch_id: "branch-a", balance: 12000 });
  });

  it("branchTransactions calls GET /wallets/branch/{branchId}/transactions with query params", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => [{ id: "tx-1", amount: 100 }],
    });

    const res = await renultApi.wallets.branchTransactions("branch-a", { limit: 10, offset: 0 });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/wallets/branch/branch-a/transactions?limit=10&offset=0"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      })
    );
    expect(res).toEqual([{ id: "tx-1", amount: 100 }]);
  });

  it("deposit calls POST /wallets/branch/{branchId}/deposit with payload", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => ({ transaction: { id: "tx-1" }, wallet: { balance: 1000 } }),
    });

    const res = await renultApi.wallets.deposit("branch-a", { amount: 500, reference: "REF1" });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/wallets/branch/branch-a/deposit"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ amount: 500, reference: "REF1" }),
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
          "Content-Type": "application/json",
        }),
      })
    );
    expect(res).toEqual({ transaction: { id: "tx-1" }, wallet: { balance: 1000 } });
  });

  it("requests and confirms a withdrawal using email verification", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => ({ challenge_id: "challenge-1", expires_at: "2026-06-08T10:10:00Z", email_hint: "al***@example.com" }),
    });

    await renultApi.wallets.requestWithdrawal("branch-a", {
      amount: 200,
      recipient_phone: "+256772000000",
      recipient_name: "Alice",
      provider: "MTN Mobile Money",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/wallets/branch/branch-a/withdrawal-challenges"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          amount: 200,
          recipient_phone: "+256772000000",
          recipient_name: "Alice",
          provider: "MTN Mobile Money",
        }),
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
          "Content-Type": "application/json",
        }),
      })
    );

    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => ({ transaction: { id: "tx-2" }, wallet: { balance: 500 }, receipt_email_sent: true }),
    });
    const result = await renultApi.wallets.confirmWithdrawal("branch-a", { challenge_id: "challenge-1", code: "123456" });
    expect(mockFetch).toHaveBeenLastCalledWith(
      expect.stringContaining("/wallets/branch/branch-a/withdrawal-confirmations"),
      expect.objectContaining({ method: "POST", body: JSON.stringify({ challenge_id: "challenge-1", code: "123456" }) })
    );
    expect(result.receipt_email_sent).toBe(true);
  });

  it("verifies a phone identity without sending the Renult auth token", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => ({
        identityname: "JALAL ELACHKAR",
        message: "Msisdn +256700000000 successfully validated.",
        success: true,
      }),
    });

    const result = await renultApi.identity.verifyPhone("+256700000000");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://lucopay-backend.vercel.app/identity/msisdn",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ msisdn: "+256700000000" }),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      })
    );
    expect(result.identityname).toBe("JALAL ELACHKAR");
  });

  it("platformSummary calls GET /wallets/platform/summary", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => ({ total_balance: 100000 }),
    });

    const res = await renultApi.wallets.platformSummary();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/wallets/platform/summary"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      })
    );
    expect(res).toEqual({ total_balance: 100000 });
  });

  it("freezeWallet calls POST /wallets/platform/freeze/{walletId}", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => ({ message: "frozen" }),
    });

    const res = await renultApi.wallets.freezeWallet("wallet-a");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/wallets/platform/freeze/wallet-a"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      })
    );
    expect(res).toEqual({ message: "frozen" });
  });
});
