"use client"

import { useState, useEffect } from "react"
import { ethers } from "ethers"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Wallet, University, DollarSign, Shield, AlertCircle, CheckCircle } from "lucide-react"
import { toast } from "@/hooks/use-toast"

// Contract addresses
const USDC_ADDRESS = "0xbD4CE12E41E04A50D6304Fc093977fFfB9A9F9e0"
const ESCROW_ADDRESS = "0x6121cC9DD5AF612f97adA5E93aE0A0b49eE0D12E"

// Edu Chain testnet configuration
const EDU_CHAIN_CONFIG = {
  chainId: "0xa045c", // 656476 in hex
  chainName: "Edu Chain Testnet",
  nativeCurrency: {
    name: "EDU",
    symbol: "EDU",
    decimals: 18,
  },
  rpcUrls: ["https://rpc.edu-chain.raas.gelato.cloud"],
  blockExplorerUrls: ["https://edu-chain-testnet.blockscout.com"],
}

// Contract ABIs
const USDC_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function mint(address to, uint256 amount)",
]

const ESCROW_ABI = [
  "function stablecoin() view returns (address)",
  "function payer() view returns (address)",
  "function university() view returns (address)",
  "function amount() view returns (uint256)",
  "function invoiceRef() view returns (string)",
  "function isDeposited() view returns (bool)",
  "function isReleased() view returns (bool)",
  "function isRefunded() view returns (bool)",
  "function owner() view returns (address)",
  "function initialize(address _payer, address _university, uint256 _amount, string _invoiceRef)",
  "function deposit()",
  "function release()",
  "function refund()",
  "event Deposited(address indexed payer, address indexed university, uint256 amount, string invoiceRef)",
  "event Released(address indexed university, uint256 amount)",
  "event Refunded(address indexed payer, uint256 amount)",
]

export default function TuitionEscrowApp() {
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [account, setAccount] = useState("")
  const [usdcContract, setUsdcContract] = useState(null)
  const [escrowContract, setEscrowContract] = useState(null)
  const [loading, setLoading] = useState(false)
  const [usdcBalance, setUsdcBalance] = useState("0")
  const [escrowData, setEscrowData] = useState({
    payer: "",
    university: "",
    amount: "0",
    invoiceRef: "",
    isDeposited: false,
    isReleased: false,
    isRefunded: false,
    owner: "",
  })
  const [isOwner, setIsOwner] = useState(false)
  const [isPayer, setIsPayer] = useState(false)

  // Form states
  const [initForm, setInitForm] = useState({
    payer: "",
    university: "",
    amount: "",
    invoiceRef: "",
  })

  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum)
      setProvider(provider)
    }
  }, [])

  useEffect(() => {
    if (signer) {
      const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer)
      const escrowContract = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, signer)
      setUsdcContract(usdcContract)
      setEscrowContract(escrowContract)
    }
  }, [signer])

  useEffect(() => {
    if (account && escrowContract && usdcContract) {
      loadContractData()
    }
  }, [account, escrowContract, usdcContract])

  const connectWallet = async () => {
    try {
      if (!provider) {
        toast({
          title: "Error",
          description: "Please install MetaMask",
          variant: "destructive",
        })
        return
      }

      // Request account access
      await provider.send("eth_requestAccounts", [])

      // Add/Switch to Edu Chain testnet
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: EDU_CHAIN_CONFIG.chainId }],
        })
      } catch (switchError) {
        // Chain not added, add it
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [EDU_CHAIN_CONFIG],
          })
        }
      }

      const signer = await provider.getSigner()
      const address = await signer.getAddress()

      setSigner(signer)
      setAccount(address)

      toast({
        title: "Success",
        description: "Wallet connected successfully",
      })
    } catch (error) {
      console.error("Error connecting wallet:", error)
      toast({
        title: "Error",
        description: "Failed to connect wallet",
        variant: "destructive",
      })
    }
  }

  const loadContractData = async () => {
    try {
      setLoading(true)

      // Load USDC balance
      const balance = await usdcContract.balanceOf(account)
      setUsdcBalance(ethers.formatUnits(balance, 6))

      // Load escrow data
      const [payer, university, amount, invoiceRef, isDeposited, isReleased, isRefunded, owner] = await Promise.all([
        escrowContract.payer(),
        escrowContract.university(),
        escrowContract.amount(),
        escrowContract.invoiceRef(),
        escrowContract.isDeposited(),
        escrowContract.isReleased(),
        escrowContract.isRefunded(),
        escrowContract.owner(),
      ])

      setEscrowData({
        payer,
        university,
        amount: ethers.formatUnits(amount, 6),
        invoiceRef,
        isDeposited,
        isReleased,
        isRefunded,
        owner,
      })

      setIsOwner(owner.toLowerCase() === account.toLowerCase())
      setIsPayer(payer.toLowerCase() === account.toLowerCase())
    } catch (error) {
      console.error("Error loading contract data:", error)
    } finally {
      setLoading(false)
    }
  }

  const initializeEscrow = async () => {
    try {
      setLoading(true)
      const amountWei = ethers.parseUnits(initForm.amount, 6)
      const tx = await escrowContract.initialize(initForm.payer, initForm.university, amountWei, initForm.invoiceRef)
      await tx.wait()

      toast({
        title: "Success",
        description: "Escrow initialized successfully",
      })

      await loadContractData()
      setInitForm({ payer: "", university: "", amount: "", invoiceRef: "" })
    } catch (error) {
      console.error("Error initializing escrow:", error)
      toast({
        title: "Error",
        description: error.reason || "Failed to initialize escrow",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const approveUSDC = async () => {
    try {
      setLoading(true)
      const amountWei = ethers.parseUnits(escrowData.amount, 6)
      const tx = await usdcContract.approve(ESCROW_ADDRESS, amountWei)
      await tx.wait()

      toast({
        title: "Success",
        description: "USDC approval successful",
      })
    } catch (error) {
      console.error("Error approving USDC:", error)
      toast({
        title: "Error",
        description: error.reason || "Failed to approve USDC",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const depositFunds = async () => {
    try {
      setLoading(true)
      const tx = await escrowContract.deposit()
      await tx.wait()

      toast({
        title: "Success",
        description: "Funds deposited successfully",
      })

      await loadContractData()
    } catch (error) {
      console.error("Error depositing funds:", error)
      toast({
        title: "Error",
        description: error.reason || "Failed to deposit funds",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const releaseFunds = async () => {
    try {
      setLoading(true)
      const tx = await escrowContract.release()
      await tx.wait()

      toast({
        title: "Success",
        description: "Funds released to university",
      })

      await loadContractData()
    } catch (error) {
      console.error("Error releasing funds:", error)
      toast({
        title: "Error",
        description: error.reason || "Failed to release funds",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const refundFunds = async () => {
    try {
      setLoading(true)
      const tx = await escrowContract.refund()
      await tx.wait()

      toast({
        title: "Success",
        description: "Funds refunded to payer",
      })

      await loadContractData()
    } catch (error) {
      console.error("Error refunding funds:", error)
      toast({
        title: "Error",
        description: error.reason || "Failed to refund funds",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getEscrowStatus = () => {
    if (escrowData.isRefunded) return { status: "Refunded", color: "destructive" }
    if (escrowData.isReleased) return { status: "Released", color: "default" }
    if (escrowData.isDeposited) return { status: "Deposited", color: "secondary" }
    if (escrowData.payer !== ethers.ZeroAddress) return { status: "Initialized", color: "outline" }
    return { status: "Not Initialized", color: "outline" }
  }

  const statusInfo = getEscrowStatus()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <University className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Tuition Escrow</h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Secure tuition payment system using blockchain escrow on Edu Chain testnet
          </p>
        </div>

        {/* Wallet Connection */}
        {!account ? (
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Wallet className="h-5 w-5" />
                Connect Wallet
              </CardTitle>
              <CardDescription>Connect your wallet to interact with the escrow contract</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={connectWallet} className="w-full" size="lg">
                Connect MetaMask
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Account Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    Account Information
                  </span>
                  <Badge variant={statusInfo.color}>{statusInfo.status}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Connected Account</Label>
                    <p className="font-mono text-sm break-all">{account}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">USDC Balance</Label>
                    <p className="text-lg font-semibold">{usdcBalance} mUSDC</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Role</Label>
                    <div className="flex gap-2">
                      {isOwner && <Badge variant="default">Owner</Badge>}
                      {isPayer && <Badge variant="secondary">Payer</Badge>}
                      {!isOwner && !isPayer && <Badge variant="outline">Observer</Badge>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Main Interface */}
            <Tabs defaultValue="escrow" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="escrow">Escrow Management</TabsTrigger>
                <TabsTrigger value="admin">Admin Panel</TabsTrigger>
              </TabsList>

              {/* Escrow Management Tab */}
              <TabsContent value="escrow" className="space-y-6">
                {/* Escrow Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Escrow Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {escrowData.payer === ethers.ZeroAddress ? (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Escrow not initialized. Admin needs to set up the payment details.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-gray-500">Payer</Label>
                            <p className="font-mono text-sm break-all">{escrowData.payer}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-500">University</Label>
                            <p className="font-mono text-sm break-all">{escrowData.university}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-500">Amount</Label>
                            <p className="text-lg font-semibold">{escrowData.amount} mUSDC</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-500">Invoice Reference</Label>
                            <p className="text-sm">{escrowData.invoiceRef || "N/A"}</p>
                          </div>
                        </div>

                        <Separator />

                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            {escrowData.isDeposited ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-yellow-500" />
                            )}
                            <span className="text-sm">Deposited</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {escrowData.isReleased ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-gray-400" />
                            )}
                            <span className="text-sm">Released</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {escrowData.isRefunded ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-gray-400" />
                            )}
                            <span className="text-sm">Refunded</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Payer Actions */}
                {isPayer && escrowData.payer !== ethers.ZeroAddress && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Payer Actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {!escrowData.isDeposited && (
                        <div className="space-y-3">
                          <Button onClick={approveUSDC} disabled={loading} className="w-full" variant="outline">
                            1. Approve USDC Spending
                          </Button>
                          <Button onClick={depositFunds} disabled={loading} className="w-full">
                            2. Deposit Funds
                          </Button>
                        </div>
                      )}
                      {escrowData.isDeposited && !escrowData.isReleased && !escrowData.isRefunded && (
                        <Alert>
                          <CheckCircle className="h-4 w-4" />
                          <AlertDescription>
                            Funds deposited successfully. Waiting for admin to release or refund.
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Admin Panel Tab */}
              <TabsContent value="admin" className="space-y-6">
                {isOwner ? (
                  <>
                    {/* Initialize Escrow */}
                    {escrowData.payer === ethers.ZeroAddress && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Initialize Escrow</CardTitle>
                          <CardDescription>Set up a new tuition payment escrow</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="payer">Payer Address</Label>
                              <Input
                                id="payer"
                                placeholder="0x..."
                                value={initForm.payer}
                                onChange={(e) => setInitForm({ ...initForm, payer: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="university">University Address</Label>
                              <Input
                                id="university"
                                placeholder="0x..."
                                value={initForm.university}
                                onChange={(e) => setInitForm({ ...initForm, university: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="amount">Amount (mUSDC)</Label>
                              <Input
                                id="amount"
                                type="number"
                                placeholder="1000"
                                value={initForm.amount}
                                onChange={(e) => setInitForm({ ...initForm, amount: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="invoiceRef">Invoice Reference</Label>
                              <Input
                                id="invoiceRef"
                                placeholder="INV-2024-001"
                                value={initForm.invoiceRef}
                                onChange={(e) => setInitForm({ ...initForm, invoiceRef: e.target.value })}
                              />
                            </div>
                          </div>
                          <Button
                            onClick={initializeEscrow}
                            disabled={loading || !initForm.payer || !initForm.university || !initForm.amount}
                            className="w-full"
                          >
                            Initialize Escrow
                          </Button>
                        </CardContent>
                      </Card>
                    )}

                    {/* Admin Actions */}
                    {escrowData.payer !== ethers.ZeroAddress && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Admin Actions</CardTitle>
                          <CardDescription>Release or refund the escrowed funds</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {escrowData.isDeposited && !escrowData.isReleased && !escrowData.isRefunded && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <Button onClick={releaseFunds} disabled={loading} className="w-full">
                                Release to University
                              </Button>
                              <Button onClick={refundFunds} disabled={loading} variant="outline" className="w-full">
                                Refund to Payer
                              </Button>
                            </div>
                          )}
                          {!escrowData.isDeposited && (
                            <Alert>
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>
                                Waiting for payer to deposit funds before admin actions are available.
                              </AlertDescription>
                            </Alert>
                          )}
                          {(escrowData.isReleased || escrowData.isRefunded) && (
                            <Alert>
                              <CheckCircle className="h-4 w-4" />
                              <AlertDescription>
                                Escrow completed. Funds have been {escrowData.isReleased ? "released" : "refunded"}.
                              </AlertDescription>
                            </Alert>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  <Card>
                    <CardContent className="pt-6">
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          You are not the contract owner. Admin functions are not available.
                        </AlertDescription>
                      </Alert>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  )
}
