import * as StellarSdk from "@stellar/stellar-sdk";
import { RPC_URL, NETWORK_PASSPHRASE } from "./network";

/** Configured Soroban RPC server, shared across the app. */
export const server = new StellarSdk.rpc.Server(RPC_URL, {
  allowHttp: !RPC_URL.startsWith("https://"),
});

export { StellarSdk, NETWORK_PASSPHRASE };
export default StellarSdk;
