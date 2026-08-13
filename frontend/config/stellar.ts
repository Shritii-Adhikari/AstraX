// Stellar Network Configuration and Validation

const requiredEnv = {
  NEXT_PUBLIC_STELLAR_NETWORK: process.env.NEXT_PUBLIC_STELLAR_NETWORK,
  NEXT_PUBLIC_RPC_URL: process.env.NEXT_PUBLIC_RPC_URL,
  NEXT_PUBLIC_HORIZON_URL: process.env.NEXT_PUBLIC_HORIZON_URL,
  NEXT_PUBLIC_NETWORK_PASSPHRASE: process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE,
};

// Validate that all network environment variables are defined and non-empty
for (const [key, value] of Object.entries(requiredEnv)) {
  if (!value || value.trim() === "") {
    throw new Error(`Configuration Error: Missing required environment variable [${key}]. Please check your .env or .env.local file.`);
  }
}

export const STELLAR_NETWORK = requiredEnv.NEXT_PUBLIC_STELLAR_NETWORK as string;
export const RPC_URL = requiredEnv.NEXT_PUBLIC_RPC_URL as string;
export const HORIZON_URL = requiredEnv.NEXT_PUBLIC_HORIZON_URL as string;
export const NETWORK_PASSPHRASE = requiredEnv.NEXT_PUBLIC_NETWORK_PASSPHRASE as string;
