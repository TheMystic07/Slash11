import bodyParser from "body-parser";
import cors from "cors";
import express from "express";

import { ADMIN_ADDRESS, PORT } from "./config";
import { createServerWallet, signVersionedTransaction } from "./utils/privy";
import {
  airdropSol,
  getWalletBalance,
  prepareTransferSol,
} from "./utils/solana";
import {
  getWalletAddress,
  IAccountsTable,
  storeAccountInfo,
} from "./utils/supabase";

const app = express();

app.use(cors());
app.use(bodyParser.json());

// TODO - use redis or another in-memory store to track created wallets
const serverWallets: Record<string, IAccountsTable> = {};

// UTILS
const fetchWallet = async (
  accountId: string
): Promise<IAccountsTable | null> => {
  try {
    let wallet = serverWallets[accountId];

    if (!wallet) {
      const _wallet = await getWalletAddress(accountId);
      if (_wallet) {
        wallet = _wallet;
        // console.log("Fetched wallet from DB:", wallet);
        serverWallets[accountId] = wallet;
      }
    } else {
      // console.log("Fetched wallet from cache:", wallet);
    }

    return wallet;
  } catch (error) {
    console.error("Error fetching account details:", error);
    return null;
  }
};

/**
 * Get wallet details endpoint
 * GET /wallet/:accountId
 * Response: { id: string, address: string }
 */
// @ts-ignore
app.get("/wallet/:accountId", async (request, response) => {
  const { accountId } = request.params;

  if (!accountId) {
    return response.status(400).json({ error: "Missing `accountId`" });
  }

  const wallet = await fetchWallet(accountId);

  if (!wallet) {
    return response
      .status(404)
      .json({ error: "Wallet not found for account id" });
  }

  response.json({
    accountId: wallet.account_id,
    id: wallet.wallet_id,
    address: wallet.wallet_address,
  });
});

/**
 * Register user endpoint
 * POST /register
 * Request Body: { account_id: string, device_id: string }
 * Response: { id: string, address: string }
 */
// @ts-ignore
app.post("/register", async (request, response) => {
  const { account_id, device_id } = request.body;

  if (!account_id) {
    return response.status(400).json({ error: "Missing `account_id`" });
  }

  const wallet = await fetchWallet(account_id);

  if (wallet) {
    console.log("Wallet already exists for account:", account_id);
    return response.json({
      id: wallet.wallet_id,
      address: wallet.wallet_address,
    });
  }

  console.log("Creating wallet for account:", account_id);

  try {
    // Create a new wallet using Privy's server wallet functionality
    const { address, id } = await createServerWallet();

    console.log("Created wallet:", { id, address });

    // Save the wallet info
    await storeAccountInfo(account_id, id, address, device_id);

    // Use the serverWallet object as a temp cache
    serverWallets[account_id.toString()] = {
      account_id,
      device_id,
      wallet_address: address,
      wallet_id: id,
    };

    response.json({ id, address });
  } catch (error) {
    console.error("Error creating wallet:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return response.status(500).json({ error: errorMessage });
  }
});

/**
 * Get SOL balance endpoint
 * GET /balance/:accountId
 * Response: { balance: number }
 */
// @ts-ignore
app.get("/balance/:accountId", async (request, response) => {
  const { accountId } = request.params;

  const wallet = await fetchWallet(accountId);

  if (!wallet) {
    return response
      .status(404)
      .json({ error: "Wallet not found for account id" });
  }

  try {
    const balance = await getWalletBalance(wallet.wallet_address);

    response.json({
      id: wallet.wallet_id,
      address: wallet.wallet_address,
      balanceLamports: balance.lamports,
      balanceSol: balance.sol,
    });
  } catch (error) {
    console.error("Error fetching balance:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return response.status(500).json({ error: errorMessage });
  }
});

/**
 * Deduct and send SOL to a hardcoded admin account.
 * POST /deduct
 * Request Body: { account_id: string, amount: number }
 * Response: { transactionHash: string }
 */
// @ts-ignore
app.post("/deduct", async (request, response) => {
  const { account_id, amount } = request.body;

  if (!account_id || amount === undefined) {
    return response.status(400).json({ error: "Missing account_id or amount" });
  }

  const wallet = await fetchWallet(account_id);

  if (!wallet || !wallet.wallet_id) {
    return response
      .status(404)
      .json({ error: "Wallet not found for account id" });
  }

  console.log("Deducting funds from wallet:", wallet.wallet_id);

  // Check balance
  try {
    const balance = await getWalletBalance(wallet.wallet_address);
    if (balance.sol < amount) {
      return response.status(400).json({
        error: `Insufficient balance. Available: ${balance.sol} SOL, Required: ${amount} SOL`,
      });
    }
  } catch (error) {
    console.error("Error fetching balance:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return response.status(500).json({ error: errorMessage });
  }

  console.log(`Sending ${amount} SOL to admin`);

  // Prepare the transaction
  try {
    const txn = await prepareTransferSol(
      wallet.wallet_address,
      ADMIN_ADDRESS,
      amount
    );

    // Sign and send the transaction
    const txnHash = await signVersionedTransaction(wallet.wallet_id, txn);

    console.log("Transaction sent:", txnHash);

    response.json({ transactionHash: txnHash });
  } catch (error) {
    console.error("Error sending transaction:", error);

    // Extract meaningful errors
    let userFriendlyError = "Transaction failed";
    const errorString =
      error instanceof Error ? error.toString() : String(error);

    if (errorString.includes("insufficient lamports")) {
      userFriendlyError =
        "Not enough SOL in wallet to complete this transaction";
    } else if (errorString.includes("invalid address")) {
      userFriendlyError = "Invalid recipient address";
    } else if (
      errorString.includes(
        "Attempt to debit an account but found no record of a prior credit"
      )
    ) {
      userFriendlyError =
        "This wallet has not received any funds yet. Request an airdrop before sending.";
    } else if (errorString.includes("blockhash not found")) {
      userFriendlyError = "Network timing error - please try again";
    }

    response.status(500).json({
      error: userFriendlyError,
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * Send SOL from one user wallet to another.
 * POST /send
 * Request Body: { from_account_id: string, to_account_id: string, amount: number }
 * Response: { transactionHash: string }
 */
// @ts-ignore
app.post("/transfer", async (request, response) => {
  const { from_account_id, to_account_id, amount } = request.body;

  if (!from_account_id || !to_account_id || amount === undefined) {
    return response.status(400).json({
      error: "Missing `from_account_id`, `to_account_id`, or `amount`",
    });
  }

  const fromWallet = await fetchWallet(from_account_id);
  const toWallet = await fetchWallet(to_account_id);

  if (!fromWallet) {
    return response.status(404).json({ error: "Sender wallet not found" });
  }

  if (!toWallet) {
    return response.status(404).json({ error: "Recipient wallet not found" });
  }

  // Check balance
  try {
    const balance = await getWalletBalance(fromWallet.wallet_address);
    if (balance.sol < amount) {
      return response.status(400).json({
        error: `Insufficient balance. Available: ${balance.sol} SOL, Required: ${amount} SOL`,
      });
    }
  } catch (error) {
    console.error("Error fetching balance:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return response.status(500).json({ error: errorMessage });
  }

  // Transfer SOL from sender's wallet to recipient's wallet
  // Prepare the transaction
  try {
    const txn = await prepareTransferSol(
      fromWallet.wallet_address,
      toWallet.wallet_address,
      amount
    );

    // Sign and send the transaction
    const txnHash = signVersionedTransaction(fromWallet.wallet_id, txn);

    response.json({ transactionHash: txnHash });
  } catch (error) {
    console.error("Error sending transaction:", error);

    // Extract meaningful errors
    let userFriendlyError = "Transaction failed";
    const errorString =
      error instanceof Error ? error.toString() : String(error);

    if (errorString.includes("insufficient lamports")) {
      userFriendlyError =
        "Not enough SOL in wallet to complete this transaction";
    } else if (errorString.includes("invalid address")) {
      userFriendlyError = "Invalid recipient address";
    } else if (
      errorString.includes(
        "Attempt to debit an account but found no record of a prior credit"
      )
    ) {
      userFriendlyError =
        "This wallet has not received any funds yet. Request an airdrop before sending.";
    } else if (errorString.includes("blockhash not found")) {
      userFriendlyError = "Network timing error - please try again";
    }

    response.status(500).json({
      error: userFriendlyError,
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * Request airdrop for a wallet
 * POST /airdrop
 * Request Body: { account_id: string } or { address: string }
 * Response: { transactionHash: string }
 */
// @ts-ignore
app.post("/airdrop", async (request, response) => {
  const { account_id, address } = request.body;

  if (!account_id && !address) {
    return response.status(400).json({
      error: "Missing `account_id` or `address`",
    });
  }

  let receiverAddress = address;

  if (!receiverAddress) {
    const wallet = await fetchWallet(account_id);

    if (!wallet) {
      return response.status(404).json({ error: "Wallet not found" });
    }

    receiverAddress = wallet.wallet_address;
  }

  if (!receiverAddress) {
    return response.status(400).json({
      error: "Missing `address` in request body or wallet not found",
    });
  }

  try {
    const txnHash = await airdropSol(receiverAddress);
    response.json({ transactionHash: txnHash });
  } catch (error) {
    console.error("Error requesting airdrop:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return response.status(500).json({ error: errorMessage });
  }
});

const calculateRewardBasedOnDamagePercent = (
  defenderBalance: number,
  damage_percent: number
) => {
  if (damage_percent < 0 || damage_percent > 100) {
    throw new Error("Damage percent must be between 0 and 100");
  }

  // Transfer 25% of the defender's balance to the attacker in case of 100% damage
  // Otherwise scale amount down based on damage_percent
  const maxReward = defenderBalance * 0.25;
  const reward = (damage_percent / 100) * maxReward;

  return reward;
};

/**
 * A player attacks another player
 * POST /attack
 * Request Body: { attacker: string, defender: string, damage_percent: number }
 * Response: { transactionHash: string }
 */
// @ts-ignore
app.post("/attack", async (request, response) => {
  const { attacker, defender, damage_percent } = request.body;

  if (!attacker || !defender || damage_percent === undefined) {
    return response.status(400).json({
      error: "Missing `attacker`, `defender`, or `damage_percent`",
    });
  }

  const attackerWallet = await fetchWallet(attacker);
  const defenderWallet = await fetchWallet(defender);

  if (!attackerWallet) {
    return response.status(404).json({ error: "Attacker wallet not found" });
  }

  if (!defenderWallet) {
    return response.status(404).json({ error: "Defender wallet not found" });
  }

  // Check balance
  let defenderBalance = 0;
  try {
    const _defenderBalance = await getWalletBalance(
      defenderWallet.wallet_address
    );
    defenderBalance = _defenderBalance.sol;

    if (defenderBalance <= 0) {
      return response.status(400).json({
        error: `Defender has no balance left`,
      });
    }
  } catch (error) {
    console.error("Error fetching balance:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return response.status(500).json({ error: errorMessage });
  }

  // Calculate reward for attacker
  const reward = calculateRewardBasedOnDamagePercent(
    defenderBalance,
    damage_percent
  );

  // Prepare the transaction
  const txn = await prepareTransferSol(
    defenderWallet.wallet_address,
    attackerWallet.wallet_address,
    reward
  );

  // Sign and send the transaction
  try {
    const txnHash = await signVersionedTransaction(
      attackerWallet.wallet_id,
      txn
    );

    response.json({ transactionHash: txnHash });
  } catch (error) {
    console.error("Error sending transaction:", error);

    // Extract meaningful errors
    let userFriendlyError = "Transaction failed";
    const errorString =
      error instanceof Error ? error.toString() : String(error);

    if (errorString.includes("insufficient lamports")) {
      userFriendlyError =
        "Not enough SOL in wallet to complete this transaction";
    } else if (errorString.includes("invalid address")) {
      userFriendlyError = "Invalid recipient address";
    } else if (
      errorString.includes(
        "Attempt to debit an account but found no record of a prior credit"
      )
    ) {
      userFriendlyError =
        "This wallet has not received any funds yet. Request an airdrop before sending.";
    } else if (errorString.includes("blockhash not found")) {
      userFriendlyError = "Network timing error - please try again";
    }

    response.status(500).json({
      error: userFriendlyError,
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
