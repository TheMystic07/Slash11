using System;
using System.IO;
using System.Text.RegularExpressions;
using MySql.Data.MySqlClient;

namespace DatabaseFixer
{
    class Program
    {
        static void Main(string[] args)
        {
            string databasePath = @"C:\Users\gursh\Desktop\coc\Slash\Server\Scripts\Database.cs";
            Console.WriteLine("Fixing Database.cs...");
            
            try 
            {
                // Read the content of the original file
                string content = File.ReadAllText(databasePath);
                
                // Check if we need to add war method stubs
                if (!content.Contains("public static void WarUpdate()"))
                {
                    // Add stub methods at a better location - after the ObsticlesCreation region
                    int obsticlesPos = content.IndexOf("public static void ObsticlesCreation()");
                    
                    if (obsticlesPos > 0)
                    {
                        // Find the end of the ObsticlesCreation region
                        int obsticlesEndPos = content.IndexOf("}", obsticlesPos);
                        // Find the next line after that closing brace
                        int nextLinePos = content.IndexOf('\n', obsticlesEndPos);
                        
                        if (nextLinePos > 0) 
                        {
                            // Add our stubs here
                            string warMethodStubs = @"
        // Added stub methods for war-related functionality
        // These methods are kept as placeholders but don't do anything since we're using SOL integration
        public static void WarUpdate()
        {
            // Stub method - war functionality not needed with SOL integration
            warUpdating = false;
        }
        
        public static void GeneralUpdateWar()
        {
            // Stub method - war functionality not needed with SOL integration
            warCheckUpdating = false;
        }
";
                            string fixedContent = content.Substring(0, nextLinePos + 1) + warMethodStubs + content.Substring(nextLinePos + 1);
                            File.WriteAllText(databasePath, fixedContent);
                            Console.WriteLine("Added war method stubs to Database.cs at a proper location");
                        }
                    }
                    else
                    {
                        Console.WriteLine("Could not find a good location to insert war method stubs");
                    }
                }
                
                Console.WriteLine("Database.cs has been fixed successfully!");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fixing Database.cs: {ex.Message}");
            }

            // Check if we need to fix Terminal.cs (UpdateWalletInDatabase reference)
            string terminalPath = @"C:\Users\gursh\Desktop\coc\Slash\Server\Terminal.cs";
            if (File.Exists(terminalPath))
            {
                string terminalContent = File.ReadAllText(terminalPath);
                
                // Check if we need to fix the reference to UpdateWalletInDatabase
                if (terminalContent.Contains("UpdateWalletInDatabase(long.Parse(accountId), walletAddress)"))
                {
                    // Replace the call with inline code
                    string oldCode = "                    // Use provided wallet address as fallback\r\n                    UpdateWalletInDatabase(long.Parse(accountId), walletAddress);";
                    string newCode = @"                    // Instead of calling UpdateWalletInDatabase, do it inline
                    try
                    {
                        using (MySqlConnection connection = Database.GetMysqlConnection())
                        {
                            connection.Open();
                            string query = $""UPDATE accounts SET wallet_address = '{walletAddress}' WHERE id = {accountId};"";
                            using (MySqlCommand command = new MySqlCommand(query, connection))
                            {
                                command.ExecuteNonQuery();
                            }
                            Console.WriteLine($""Updated wallet address for account {accountId}: {walletAddress}"");
                            connection.Close();
                        }
                    }
                    catch (Exception updateEx)
                    {
                        Console.WriteLine($""Error updating wallet address: {updateEx.Message}"");
                    }";
                    
                    string fixedTerminalContent = terminalContent.Replace(oldCode, newCode);
                    
                    // Check if we also need to remove the UpdateWalletInDatabase method
                    if (fixedTerminalContent.Contains("private static void UpdateWalletInDatabase"))
                    {
                        int methodStart = fixedTerminalContent.IndexOf("        private static void UpdateWalletInDatabase");
                        if (methodStart > 0)
                        {
                            int methodEndBrace = fixedTerminalContent.IndexOf("\n        }", methodStart);
                            if (methodEndBrace > 0)
                            {
                                // Remove the entire method
                                string beforeMethod = fixedTerminalContent.Substring(0, methodStart);
                                string afterMethod = fixedTerminalContent.Substring(methodEndBrace + 10); // +10 to include the newline and the brace
                                
                                fixedTerminalContent = beforeMethod + 
                                                      "        // Note: UpdateWalletInDatabase method has been removed as it's now handled directly in RegisterPlayer\n" +
                                                      afterMethod;
                            }
                        }
                    }
                    
                    File.WriteAllText(terminalPath, fixedTerminalContent);
                    Console.WriteLine("Fixed UpdateWalletInDatabase references in Terminal.cs");
                }
                else
                {
                    Console.WriteLine("Terminal.cs not found at expected path");
                }
            }
        }
    }
}
