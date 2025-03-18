import { Cluster } from "@solana/web3.js";
import { config } from "dotenv";

config();

export const PORT = process.env.PORT ?? 3000;
export const ADMIN_ADDRESS = "DYkyiPrYojVHHuqWw4QZDnviGK5FZpzqS974BJX3aH7u";

export const PRIVY_APP_ID = "cm7zdm4b400s7mp80asxtvgpq";
export const PRIVY_APP_SECRET =
  "37E5xQDd1JQmJgeS3mhwGTvj1DThmEnc3mPPdfZHfLdTnKK68Zs2meDJ5g8zujCj7Ld2AdLtpymvwPzjUUCrp7Mu";

export const SUPABASE_URL =
  process.env.SUPABASE_URL ?? "https://osdbrefywvyhslapzmpu.supabase.co";
export const SUPABASE_KEY =
  process.env.SUPABASE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zZGJyZWZ5d3Z5aHNsYXB6bXB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE4OTkzMTgsImV4cCI6MjA1NzQ3NTMxOH0.HwKqGh8h1KNPi56WC_Kk_0FtlNfdGW1hjH9KtAa_GrU";

export const CLUSTER = (process.env.CLUSTER ?? "devnet") as Cluster;
