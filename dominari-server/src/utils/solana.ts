import {
  clusterApiUrl,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

import { CLUSTER } from "../config";

const connection = new Connection(clusterApiUrl(CLUSTER));

export const getWalletBalance = async (
  address: string
): Promise<{
  sol: number;
  lamports: number;
}> => {
  const walletPublicKey = new PublicKey(address);

  const walletBalanceInLamports = await connection.getBalance(walletPublicKey);
  const walletBalanceInSol = walletBalanceInLamports / LAMPORTS_PER_SOL;

  return {
    sol: walletBalanceInSol,
    lamports: walletBalanceInLamports,
  };
};

export const prepareTransferSol = async (
  senderAddress: string,
  recipientAddress: string,
  amount: number
): Promise<VersionedTransaction> => {
  console.log("connection", connection);

  const senderPublicKey = new PublicKey(senderAddress);
  const recipientPublicKey = new PublicKey(recipientAddress);

  console.log("senderPublicKey", senderPublicKey.toString());
  console.log("recipientPublicKey", recipientPublicKey.toString());
  console.log("amount", amount);

  // Create transfer instruction
  const instruction = SystemProgram.transfer({
    fromPubkey: senderPublicKey,
    toPubkey: recipientPublicKey,
    lamports: amount * LAMPORTS_PER_SOL,
  });

  console.log("instruction", instruction);

  // Get latest blockhash and create transaction message
  const { blockhash: recentBlockhash } = await connection.getLatestBlockhash();
  const message = new TransactionMessage({
    payerKey: senderPublicKey,
    instructions: [instruction],
    recentBlockhash,
  });

  // Create versioned transaction
  const transaction = new VersionedTransaction(message.compileToV0Message());

  console.log("transaction", transaction);

  return transaction;
};

export const airdropSol = async (
  address: string,
  amount: number = 1
): Promise<string> => {
  const walletPublicKey = new PublicKey(address);
  const airdropAmount = amount * LAMPORTS_PER_SOL;

  // Request airdrop with retry logic
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      // Request airdrop (amount in SOL)
      const signature = await connection.requestAirdrop(
        walletPublicKey,
        airdropAmount
      );

      // Wait for confirmation with a timeout
      const confirmation = await Promise.race([
        connection.confirmTransaction(signature),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Confirmation timeout")), 30_000)
        ),
      ]);

      return signature;
    } catch (error) {
      console.warn(
        `Airdrop attempt ${attempt} failed for address ${address}:`,
        error
      );

      if (attempt === 3) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }

  throw new Error("Airdrop failed");
};
