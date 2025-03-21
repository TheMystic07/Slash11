using Solana.Unity.SDK.Example;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using codebase.utility;
// using Solana.Unity.Rpc.Types;
// using Solana.Unity.SDK;
using DevelopersHub.ClashOfWhatecer;

// ReSharper disable once CheckNamespace

public class ReceiveScreen : SimpleScreen
{
    public Button airdrop_btn;
    public Button close_btn;

    public TextMeshProUGUI publicKey_txt;
    public RawImage qrCode_img;

    private void Start()
    {
        airdrop_btn.onClick.AddListener(RequestAirdrop);

        close_btn.onClick.AddListener(() =>
        {
            transform.gameObject.SetActive(false);
        });
        // Web3.OnWalletChangeState += CheckAndToggleAirdrop;
        ShowScreen();
    }
    
    private void OnEnable()
    {
        // var isDevnet = IsDevnet();
        // airdrop_btn.enabled = isDevnet;
        // airdrop_btn.interactable = isDevnet;
    }

    public override void ShowScreen(object data = null)
    {
        base.ShowScreen();
        gameObject.SetActive(true);

        // CheckAndToggleAirdrop();

        GenerateQr();
        
        if (Player.instanse != null && !string.IsNullOrEmpty(Player.instanse.data.walletAddress))
        {
            publicKey_txt.text = Player.instanse.data.walletAddress;
            Debug.Log($"Using Player's wallet address: {Player.instanse.data.walletAddress}");
        }
        else
        {
            publicKey_txt.text = Player.instanse.data.walletAddress;
            Debug.Log("Fallback to Web3 wallet address");
        }
    }

    private void CheckAndToggleAirdrop()
    {
        // if(Web3.Wallet == null) return;
        // airdrop_btn.gameObject.SetActive(Web3.Wallet.RpcCluster == RpcCluster.DevNet);
    }

    private void GenerateQr()
    {
        string walletAddress = (Player.instanse != null && !string.IsNullOrEmpty(Player.instanse.data.walletAddress)) 
            ? Player.instanse.data.walletAddress 
            : "no wallet address";
            
        Texture2D tex = QRGenerator.GenerateQRTexture(walletAddress, 256, 256);
        qrCode_img.texture = tex;
    }

    private async void RequestAirdrop()
    {
        if (Player.instanse != null)
        {
            Loading.StartLoading();
            // Player.instanse.RequestGoldAirdrop();
            Loading.StopLoading();
            Debug.Log("Requested airdrop through game server API");
            return;
        }
        
        Loading.StartLoading();
        // var result = await Web3.Wallet.RequestAirdrop();
        // if (result?.Result == null)
        // {
        //     Debug.LogError("Airdrop failed, you may have reach the limit, try later or use a public faucet");
        // }
        // else
        // {
        //     // await Web3.Rpc.ConfirmTransaction(result.Result, Commitment.Confirmed);
        //     Debug.Log("Airdrop success, see transaction at https://explorer.solana.com/tx/" + result.Result + "?cluster=devnet");
        //     manager.ShowScreen(this, "wallet_screen");
        // }
        Loading.StopLoading();
    }

    private static bool IsDevnet()
    {
        // return  Web3.Rpc.NodeAddress.AbsoluteUri.Contains("devnet");
        return true;
    }

    public void CopyPublicKeyToClipboard()
    {
        string walletAddress = (Player.instanse != null && !string.IsNullOrEmpty(Player.instanse.data.walletAddress)) 
            ? Player.instanse.data.walletAddress 
            : "no wallet address";
            
        Clipboard.Copy(walletAddress);
        gameObject.GetComponent<Toast>()?.ShowToast("Public Key copied to clipboard", 3);
    }

    public override void HideScreen()
    {
        // base.HideScreen();
        gameObject.SetActive(false);
    }

    public void OnClose()
    {
       transform.gameObject.SetActive(false);
    }
}