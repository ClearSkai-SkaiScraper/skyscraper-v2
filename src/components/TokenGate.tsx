"use client";

import { createContext, ReactNode,useContext, useState } from "react";

import AddTokensModal from "./AddTokensModal";

type TokenGateContextType = {
  showTopUpModal: (currentBalance?: number) => void;
  hideTopUpModal: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleTokenAction: (action: () => Promise<any>) => Promise<void>;
};

const TokenGateContext = createContext<TokenGateContextType | null>(null);

export function useTokenGate() {
  const context = useContext(TokenGateContext);
  if (!context) {
    throw new Error("useTokenGate must be used within a TokenGateProvider");
  }
  return context;
}

type TokenGateProviderProps = {
  orgId: string;
  children: ReactNode;
};

export function TokenGateProvider({ orgId, children }: TokenGateProviderProps) {
  const [needTopUp, setNeedTopUp] = useState(false);
  const [currentBalance, setCurrentBalance] = useState(0);

  const showTopUpModal = (balance = 0) => {
    setCurrentBalance(balance);
    setNeedTopUp(true);
  };

  const hideTopUpModal = () => {
    setNeedTopUp(false);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleTokenAction = async (action: () => Promise<any>) => {
    try {
      // Always allow actions since token costs are now 0
      const result = await action();
      return result;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      // Re-throw all errors (no token gating anymore)
      throw err;
    }
  };

  return (
    <TokenGateContext.Provider
      value={{
        showTopUpModal,
        hideTopUpModal,
        handleTokenAction,
      }}
    >
      {children}

      {needTopUp && (
        <AddTokensModal
          orgId={orgId}
          isOpen={needTopUp}
          onCloseAction={hideTopUpModal}
          currentBalance={currentBalance}
        />
      )}
    </TokenGateContext.Provider>
  );
}

// Convenience wrapper component
type TokenGateProps = {
  orgId: string;
  children: ReactNode;
};

export default function TokenGate({ orgId, children }: TokenGateProps) {
  return <TokenGateProvider orgId={orgId}>{children}</TokenGateProvider>;
}
