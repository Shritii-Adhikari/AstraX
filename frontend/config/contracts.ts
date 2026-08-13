// Soroban Contract Address Configuration and Validation

const requiredEnv = {
  NEXT_PUBLIC_FACTORY_ADDRESS: process.env.NEXT_PUBLIC_FACTORY_ADDRESS,
  NEXT_PUBLIC_POOL_ADDRESS: process.env.NEXT_PUBLIC_POOL_ADDRESS,
  NEXT_PUBLIC_ROUTER_ADDRESS: process.env.NEXT_PUBLIC_ROUTER_ADDRESS,
  NEXT_PUBLIC_POSITION_MANAGER_ADDRESS: process.env.NEXT_PUBLIC_POSITION_MANAGER_ADDRESS,
  NEXT_PUBLIC_PROFILE_CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_PROFILE_CONTRACT_ADDRESS,
  NEXT_PUBLIC_XLM_ADDRESS: process.env.NEXT_PUBLIC_XLM_ADDRESS,
  NEXT_PUBLIC_USDC_ADDRESS: process.env.NEXT_PUBLIC_USDC_ADDRESS,
  NEXT_PUBLIC_USDC_ISSUER: process.env.NEXT_PUBLIC_USDC_ISSUER,
};

// Validate that all contract environment variables are defined and non-empty
for (const [key, value] of Object.entries(requiredEnv)) {
  if (!value || value.trim() === "") {
    throw new Error(`Configuration Error: Missing required environment variable [${key}]. Please check your .env or .env.local file.`);
  }
}

export const FACTORY_ADDRESS = requiredEnv.NEXT_PUBLIC_FACTORY_ADDRESS as string;
export const POOL_ADDRESS = requiredEnv.NEXT_PUBLIC_POOL_ADDRESS as string;
export const ROUTER_ADDRESS = requiredEnv.NEXT_PUBLIC_ROUTER_ADDRESS as string;
export const PM_ADDRESS = requiredEnv.NEXT_PUBLIC_POSITION_MANAGER_ADDRESS as string;
export const PROFILE_CONTRACT_ADDRESS = requiredEnv.NEXT_PUBLIC_PROFILE_CONTRACT_ADDRESS as string;
export const XLM_ADDRESS = requiredEnv.NEXT_PUBLIC_XLM_ADDRESS as string;
export const USDC_ADDRESS = requiredEnv.NEXT_PUBLIC_USDC_ADDRESS as string;
export const USDC_ISSUER = requiredEnv.NEXT_PUBLIC_USDC_ISSUER as string;
export const USDC_ASSET_CODE = (process.env.NEXT_PUBLIC_USDC_ASSET_CODE || "USDC") as string;
