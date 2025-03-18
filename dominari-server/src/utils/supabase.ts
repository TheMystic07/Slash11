import { createClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL } from "../config";

// Initialize the client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export interface IAccountsTable {
  account_id: string;
  wallet_id: string;
  wallet_address: string;
  device_id: string;
}

// Function to store account information
export const storeAccountInfo = async (
  accountId: string,
  walletId: string,
  walletAddress: string,
  deviceId: string
) => {
  const { error } = await supabase.from("accounts").insert([
    {
      account_id: accountId,
      wallet_id: walletId,
      wallet_address: walletAddress,
      device_id: deviceId,
    },
  ]);

  if (error) {
    console.error("Error storing account info:", error);
  } else {
    console.log("Account info stored successfully");
  }
};
// Function to retrieve wallet address based on account ID
export const getWalletAddress = async (
  accountId: string
): Promise<IAccountsTable | null> => {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("account_id", accountId)
    .single();

  if (error) {
    console.error("Error retrieving wallet address:", error);
    return null;
  } else {
    return data as IAccountsTable;
  }

  return null;
};
