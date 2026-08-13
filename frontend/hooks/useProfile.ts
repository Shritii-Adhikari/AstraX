"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { simulateContractRead, addressToScVal, buildContractTx, submitTransaction } from "@/lib/stellar";
import { PROFILE_CONTRACT_ADDRESS } from "@/lib/stellar/contracts";
import { useWallet } from "@/hooks/useWallet";
import { useTxTracker } from "@/context/TxTrackerContext";
import { scValToNative, xdr } from "@stellar/stellar-sdk";

/** Read user profile from the deployed contract. */
async function fetchUserProfile(address: string): Promise<string> {
  try {
    const result = await simulateContractRead(PROFILE_CONTRACT_ADDRESS, "get_profile", [
      addressToScVal(address),
    ]);
    if (!result) return "";
    return String(scValToNative(result));
  } catch (err) {
    console.error("Failed to fetch on-chain profile:", err);
    return "";
  }
}

export function useProfile(address: string | null) {
  const queryClient = useQueryClient();
  const { sign } = useWallet();
  const { trackTx } = useTxTracker();

  const query = useQuery<string>({
    queryKey: ["user-profile", address],
    queryFn: () => fetchUserProfile(address!),
    enabled: !!address,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (nickname: string) => {
      if (!address) throw new Error("Wallet not connected");

      await trackTx(`Update On-Chain Profile to "${nickname}"`, async (updateStep) => {
        // Step 1: Simulate and build
        updateStep("preparing");
        const tx = await buildContractTx(
          PROFILE_CONTRACT_ADDRESS,
          "set_profile",
          [
            addressToScVal(address),
            xdr.ScVal.scvString(nickname),
          ],
          address
        );
        const xdrString = tx.toXDR();

        // Step 2: Request signature
        updateStep("waiting_signature");
        const signedXdr = await sign(xdrString);

        // Step 3: Submit to network
        updateStep("submitting");
        
        // Step 4: Track consensus (submitTransaction automatically waits/polls)
        updateStep("pending");
        const response = await submitTransaction(signedXdr);

        return {
          hash: response.hash,
          ledger: response.ledger,
        };
      });
    },
    onSuccess: () => {
      // Invalidate queries to trigger instant UI refresh
      queryClient.invalidateQueries({ queryKey: ["user-profile", address] });
    },
  });

  return {
    nickname: query.data ?? "",
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    error: query.error,
    refetch: query.refetch,
    updateProfile: updateProfileMutation.mutateAsync,
    isUpdating: updateProfileMutation.isPending,
    updateError: updateProfileMutation.error,
  };
}
