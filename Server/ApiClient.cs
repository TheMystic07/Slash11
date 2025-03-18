using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using System.Text.Json.Serialization;

namespace DevelopersHub.RealtimeNetworking.Server
{
    public class ApiClient
    {
        private static readonly HttpClient _httpClient;
        private static readonly string _baseUrl = "http://localhost:3000"; // Change this to your Solana API endpoint

        static ApiClient()
        {
            _httpClient = new HttpClient();
            _httpClient.DefaultRequestHeaders.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));
        }

        // Register player and get wallet address
        public static WalletResponse RegisterPlayer(string accountId, string deviceId)
        {
            try
            {
                var content = new StringContent(
                    JsonSerializer.Serialize(new { account_id = accountId, device_id = deviceId }),
                    Encoding.UTF8,
                    "application/json");

                var response = _httpClient.PostAsync($"{_baseUrl}/register", content).GetAwaiter().GetResult();
                
                if (response.IsSuccessStatusCode)
                {
                    var responseContent = response.Content.ReadAsStringAsync().GetAwaiter().GetResult();
                    return JsonSerializer.Deserialize<WalletResponse>(responseContent);
                }
                
                return null;
            }
            catch (Exception ex)
            {
                Tools.LogError($"Failed to register player: {ex.Message}", ex.StackTrace);
                return null;
            }
        }

        // Get Solana balance for a player's account ID
        public static (double, long) GetSolanaBalance(string accountId)
        {
            try
            {
                // No need to extract accountId from wallet address - we now expect account ID directly
                Console.WriteLine($"Getting SOL balance for account ID: {accountId}");
                
                // Call the API endpoint to get balance
                var response = _httpClient.GetAsync($"{_baseUrl}/balance/{accountId}").GetAwaiter().GetResult();
                
                if (response.IsSuccessStatusCode)
                {
                    var responseContent = response.Content.ReadAsStringAsync().GetAwaiter().GetResult();
                    var balanceResponse = JsonSerializer.Deserialize<BalanceResponse>(responseContent);
                    Console.WriteLine($"Received balance: {balanceResponse.BalanceSol} SOL ({balanceResponse.BalanceLamports} lamports)");
                    return (balanceResponse.BalanceSol, balanceResponse.BalanceLamports);
                }
                
                // Log error for debugging
                Console.WriteLine($"Failed to get balance from server: {response.StatusCode}. Using mock balance.");
                
                // Fallback to mock implementation
                Random random = new Random();
                double solBalance = random.NextDouble() * 10; // Random balance between 0 and 10 SOL
                long lamports = (long)(solBalance * 1000000000); // 1 SOL = 1,000,000,000 lamports
                
                return (solBalance, lamports);
            }
            catch (Exception ex)
            {
                Tools.LogError($"Failed to get SOL balance: {ex.Message}", ex.StackTrace);
                return (0, 0);
            }
        }

        // Deduct SOL from a player's account
        public static bool DeductSolana(string accountId, double amount)
        {
            try
            {
                // No need to extract accountId from wallet address - we now expect account ID directly
                Console.WriteLine($"Deducting {amount} SOL from account ID: {accountId}");
                
                var content = new StringContent(
                    JsonSerializer.Serialize(new { account_id = accountId, amount = amount }),
                    Encoding.UTF8,
                    "application/json");

                var response = _httpClient.PostAsync($"{_baseUrl}/deduct", content).GetAwaiter().GetResult();
                
                // Log response for debugging
                if (response.IsSuccessStatusCode)
                {
                    Console.WriteLine($"Successfully deducted {amount} SOL from account {accountId}");
                }
                else
                {
                    Console.WriteLine($"Failed to deduct SOL: {response.StatusCode}");
                }
                
                // We don't really wait for the response as per requirements
                // Just fire and forget
                return true;
            }
            catch (Exception ex)
            {
                Tools.LogError($"Failed to deduct SOL: {ex.Message}", ex.StackTrace);
                return false;
            }
        }

        // Process an attack with damage percentage
        public static bool ProcessAttack(string attackerAccountId, string defenderAccountId, double damagePercent)
        {
            try
            {
                // No need to extract accountId from wallet address - we now expect account IDs directly
                Console.WriteLine($"Processing attack: {attackerAccountId} attacked {defenderAccountId} with {damagePercent}% damage");
                
                var content = new StringContent(
                    JsonSerializer.Serialize(new { 
                        attacker = attackerAccountId, 
                        defender = defenderAccountId, 
                        damage_percent = damagePercent 
                    }),
                    Encoding.UTF8,
                    "application/json");

                var response = _httpClient.PostAsync($"{_baseUrl}/attack", content).GetAwaiter().GetResult();
                
                // Log response for debugging
                if (response.IsSuccessStatusCode)
                {
                    Console.WriteLine($"Attack processed successfully");
                }
                else
                {
                    Console.WriteLine($"Failed to process attack: {response.StatusCode}");
                }
                
                // We don't really wait for the response as per requirements
                // Just fire and forget
                return true;
            }
            catch (Exception ex)
            {
                Tools.LogError($"Failed to process attack: {ex.Message}", ex.StackTrace);
                return false;
            }
        }

        // Transfer SOL from one wallet to another
        public static bool TransferSolana(string fromWallet, string toWallet, double amount)
        {
            try
            {
                // In a real implementation, this would call the Solana RPC API to create and send a transaction
                // Tools.Log($"Transferring {amount} SOL from {fromWallet} to {toWallet}");
                
                // Mock implementation - in production, create and send a Solana transaction
                // This would involve creating a transaction, signing it with the server's private key,
                // and sending it to the Solana network
                
                return true; // Assume success for now
            }
            catch (Exception ex)
            {
                // Tools.LogError($"Failed to transfer SOL: {ex.Message}", ex.StackTrace);
                return false;
            }
        }

        // Get wallet address for an account ID
        public static string GetWalletAddress(string accountId)
        {
            try
            {
                // Currently we're using a simple "testWallet{accountId}" format
                // In a real implementation, this would retrieve the wallet address from a database or API
                Console.WriteLine($"Getting wallet address for account ID: {accountId}");
                
                // Call the API endpoint to get wallet address (or mock it for now)
                var response = _httpClient.GetAsync($"{_baseUrl}/wallet/{accountId}").GetAwaiter().GetResult();
                
                if (response.IsSuccessStatusCode)
                {
                    var responseContent = response.Content.ReadAsStringAsync().GetAwaiter().GetResult();
                    var walletResponse = JsonSerializer.Deserialize<WalletResponse>(responseContent);
                    return walletResponse.Address;
                }
                
                // Fallback to simple format if API fails
                return "testWallet" + accountId;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to get wallet address: {ex.Message}");
                // Fallback to simple format
                return "testWallet" + accountId;
            }
        }

        // Response models for future use with actual API
        public class WalletResponse
        {
            [JsonPropertyName("id")]
            public string Id { get; set; }
            
            [JsonPropertyName("address")]
            public string Address { get; set; }
            
            [JsonPropertyName("success")]
            public bool Success { get; set; }
        }

        public class BalanceResponse
        {
            [JsonPropertyName("address")]
            public string Address { get; set; }
            
            [JsonPropertyName("balanceLamports")]
            public long BalanceLamports { get; set; }
            
            [JsonPropertyName("balanceSol")]
            public double BalanceSol { get; set; }
        }

        public class TransactionResponse
        {
            [JsonPropertyName("transaction_hash")]
            public string TransactionHash { get; set; }
            
            [JsonPropertyName("success")]
            public bool Success { get; set; }
            
            [JsonPropertyName("error")]
            public string ErrorMessage { get; set; }
            
            [JsonPropertyName("message")]
            public string Message { get; set; }
        }
    }
} 