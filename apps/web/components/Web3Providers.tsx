"use client";

// Wagmi + ConnectKit provider stack. Wraps the entire app so any
// component (Bench page publish button, future wallet-gated UI) can
// use `useAccount`, `useWriteContract`, `useSwitchChain`, etc.

import { ConnectKitProvider, getDefaultConfig } from "connectkit";
import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { base, mainnet, optimism, sepolia } from "wagmi/chains";

const wagmiConfig = createConfig(
  getDefaultConfig({
    chains: [base, optimism, sepolia, mainnet],
    transports: {
      [base.id]: http(),
      [optimism.id]: http(),
      [sepolia.id]: http(),
      [mainnet.id]: http(),
    },
    walletConnectProjectId:
      process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "",
    appName: "Upgrade Siren Bench",
    appDescription:
      "ENS subject benchmark with EAS attestation publication.",
    appUrl: "https://upgrade-siren.vercel.app",
  }),
);

const queryClient = new QueryClient();

export function Web3Providers({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider
          theme="midnight"
          mode="dark"
          options={{
            initialChainId: 0,
            enforceSupportedChains: false,
          }}
        >
          {children}
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}