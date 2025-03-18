import { PrivyClient } from "@privy-io/server-auth";

import { PRIVY_APP_ID, PRIVY_APP_SECRET } from "../config";
import { VersionedTransaction } from "@solana/web3.js";

const privy = new PrivyClient(PRIVY_APP_ID, PRIVY_APP_SECRET);

export const createServerWallet = async (): Promise<IWallet> => {
  const { id, address, chainType } = await privy.walletApi.create({
    chainType: "solana",
  });

  return { id, address };
};

export const getWallet = async (id: string): Promise<IWallet> => {
  const wallet = await privy.walletApi.getWallet({ id });
  return {
    id: wallet.id,
    address: wallet.address,
  };
};

export const signVersionedTransaction = async (
  id: string,
  transaction: VersionedTransaction
): Promise<string> => {
  console.log("signVersionedTransaction", id, transaction);

  const txResult = await privy.walletApi.solana.signAndSendTransaction({
    walletId: id,
    caip2: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
    transaction,
  });

  console.log("txResult", txResult);

  return txResult.hash;
};
