import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import StellarWalletPanel from "./StellarWalletPanel";
import type { UseStellarWallet } from "@/hooks/use-stellar-wallet";

// Mock the wallet hook so the component renders deterministically without
// touching Freighter or the network.
vi.mock("@/hooks/use-stellar-wallet", () => ({
  useStellarWallet: vi.fn(),
}));
import { useStellarWallet } from "@/hooks/use-stellar-wallet";

const mockedHook = vi.mocked(useStellarWallet);

function buildState(overrides: Partial<UseStellarWallet>): UseStellarWallet {
  return {
    address: null,
    balance: null,
    isConnected: false,
    isLoading: false,
    error: null,
    hasFreighter: true,
    walletId: null,
    isModalOpen: false,
    setIsModalOpen: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    refreshBalance: vi.fn(),
    sendXlm: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  mockedHook.mockReset();
});

describe("StellarWalletPanel", () => {
  it("shows an Install Freighter link when the extension is missing", () => {
    mockedHook.mockReturnValue(buildState({ hasFreighter: false }));
    render(<StellarWalletPanel />);

    const link = screen.getByRole("link", { name: /install freighter/i });
    expect(link).toHaveAttribute("href", "https://freighter.app");
  });

  it("shows a Connect Wallet button when detected but not connected", () => {
    mockedHook.mockReturnValue(buildState({ hasFreighter: true, isConnected: false }));
    render(<StellarWalletPanel />);

    expect(
      screen.getByRole("button", { name: /connect wallet/i })
    ).toBeInTheDocument();
  });

  it("shows the address, balance and Send XLM form once connected", () => {
    mockedHook.mockReturnValue(
      buildState({
        isConnected: true,
        address: "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUV",
        balance: "12.5",
      })
    );
    render(<StellarWalletPanel />);

    expect(screen.getByText(/12\.5/)).toBeInTheDocument();
    expect(screen.getByText(/Connected Address/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /send xlm/i })
    ).toBeInTheDocument();
  });
});
