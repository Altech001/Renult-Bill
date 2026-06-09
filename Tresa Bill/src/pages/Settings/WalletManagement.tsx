import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Wallet,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownLeft,
  Lock,
  Unlock,
  AlertCircle,
  Search,
  Building,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import SettingsLayout from "./SettingsLayout";
import {
  useBranchWallet,
  useDeposit,
  usePlatformSummary,
  usePlatformClients,
  useFreezeWallet,
  useUnfreezeWallet,
} from "@/hooks/useWallet";

export default function WalletManagementPage() {
  const navigate = useNavigate();
  const [branchId, setBranchId] = useState(() => localStorage.getItem("selected-workspace") || "");
  useEffect(() => {
    const handler = (event: Event) => setBranchId((event as CustomEvent<{ id: string }>).detail.id);
    window.addEventListener("renult-branch-change", handler);
    return () => window.removeEventListener("renult-branch-change", handler);
  }, []);

  // Data Queries
  const { data: wallet, isLoading: isWalletLoading } = useBranchWallet(branchId);
  const { data: platformSummary } = usePlatformSummary();
  const { data: platformClients = [] } = usePlatformClients();

  // Mutations
  const depositMutation = useDeposit(branchId);
  const freezeMutation = useFreezeWallet();
  const unfreezeMutation = useUnfreezeWallet();

  // Local States
  const [searchTerm, setSearchTerm] = useState("");
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [amountInput, setAmountInput] = useState("");
  const [referenceInput, setReferenceInput] = useState("");

  // Flatten client wallets and filter them
  const clientWallets = useMemo(() => {
    const list: Array<{
      user_id: string;
      user_name: string;
      user_email: string;
      wallet_id: string;
      branch_id: string;
      branch_name: string;
      balance: number;
      total_deposited: number;
      total_withdrawn: number;
      is_frozen: boolean;
    }> = [];

    platformClients.forEach((client) => {
      if (client.wallets && Array.isArray(client.wallets)) {
        client.wallets.forEach((w) => {
          list.push({
            user_id: client.user_id,
            user_name: client.user_name,
            user_email: client.user_email,
            wallet_id: w.id,
            branch_id: w.branch_id,
            branch_name: w.branch_name,
            balance: w.balance,
            total_deposited: w.total_deposited,
            total_withdrawn: w.total_withdrawn,
            is_frozen: w.is_frozen,
          });
        });
      }
    });

    return list;
  }, [platformClients]);

  const filteredWallets = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();
    if (!search) return clientWallets;

    return clientWallets.filter((w) =>
      w.user_id.toLowerCase().includes(search) ||
      w.user_name.toLowerCase().includes(search) ||
      w.branch_name.toLowerCase().includes(search) ||
      w.branch_id.toLowerCase().includes(search)
    );
  }, [clientWallets, searchTerm]);

  // Form Handlers
  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(amountInput);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid deposit amount.");
      return;
    }
    if (!referenceInput.trim()) {
      toast.error("Please enter a transaction reference.");
      return;
    }

    try {
      await depositMutation.mutateAsync({ amount, reference: referenceInput });
      toast.success(`Simulated deposit of UGX ${amount.toLocaleString()} succeeded.`);
      setIsDepositOpen(false);
      setAmountInput("");
      setReferenceInput("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to process deposit.");
    }
  };

  const handleFreezeToggle = async (clientWalletId: string, currentlyFrozen: boolean) => {
    try {
      if (currentlyFrozen) {
        await unfreezeMutation.mutateAsync(clientWalletId);
        toast.success("Wallet successfully unfrozen.");
      } else {
        await freezeMutation.mutateAsync(clientWalletId);
        toast.success("Wallet successfully frozen.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update wallet status.");
    }
  };

  return (
    <SettingsLayout title="Wallet Management">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 py-8 space-y-8">

        {/* Header Title */}
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-bold text-foreground">Wallet Management</h1>
          <p className="text-xs text-muted-foreground">
            Monitor branch balances and perform secure deposits, withdrawals, and wallet controls.
          </p>
        </div>
        <Separator className="bg-border/20" />

        {/* Dashboard Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Active Workspace Wallet Card */}
          <div className="bg-card border border-border/40 rounded p-5 space-y-4 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-muted-foreground">Active Branch Balance</span>
              <Wallet className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-foreground">
                {isWalletLoading ? "..." : `UGX ${(wallet?.balance ?? 0).toLocaleString()}`}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-1">
                Workspace branch: <span className="font-bold text-foreground">{branchId}</span>
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                className="flex-1 text-[11px] h-8 gap-1"
                onClick={() => setIsDepositOpen(true)}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                Deposit
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-[11px] h-8 gap-1"
                onClick={() => navigate("/withdraw")}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                Withdraw
              </Button>
            </div>
          </div>

          {/* Platform Balance Metrics Card */}
          <div className="bg-card border border-border/40 rounded p-5 space-y-3 shadow-sm md:col-span-2">
            <span className="text-xs font-semibold text-muted-foreground block">Platform Infrastructure Summary</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
              <div>
                <p className="text-[10px] text-muted-foreground">Total Balance</p>
                <p className="text-base font-bold text-foreground mt-0.5">
                  UGX {(platformSummary?.total_balance ?? 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Platform Commissions</p>
                <p className="text-base font-bold text-emerald-600 mt-0.5">
                  UGX {(platformSummary?.total_commission ?? 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Total Deposits</p>
                <p className="text-base font-semibold text-foreground mt-0.5">
                  UGX {(platformSummary?.total_deposited ?? 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Total Withdrawals</p>
                <p className="text-base font-semibold text-foreground mt-0.5">
                  UGX {(platformSummary?.total_withdrawn ?? 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Client Wallets Listings Table */}
        <div className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold flex items-center gap-1.5">
                <Building className="w-4 h-4 text-muted-foreground" />
                Client & Branch Wallets
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Monitor and adjust administrative wallet limits platform-wide.
              </p>
            </div>

            {/* Search filter */}
            <div className="relative w-full sm:w-[260px]">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-9 text-xs rounded border-border/40"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded border border-border/10">
            <Table>
              <TableHeader className="bg-muted/40 font-semibold">
                <TableRow className="border-border/10">
                  <TableHead className="text-xs">Client User ID</TableHead>
                  <TableHead className="text-xs">Balance</TableHead>
                  <TableHead className="text-xs">Deposits</TableHead>
                  <TableHead className="text-xs">Withdrawals</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWallets.length > 0 ? (
                  filteredWallets.map((walletItem) => (
                    <TableRow key={walletItem.wallet_id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="font-mono text-xs font-semibold text-foreground">
                        <div className="font-sans font-bold">{walletItem.user_name || walletItem.user_id}</div>
                        <div className="text-[10px] text-muted-foreground font-normal mt-0.5">
                          Branch: {walletItem.branch_name} ({walletItem.branch_id})
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-bold text-foreground">
                        UGX {walletItem.balance.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-medium">
                        UGX {walletItem.total_deposited.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-medium">
                        UGX {walletItem.total_withdrawn.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge
                          variant="outline"
                          className={cn(
                            "px-2 py-0 border-none font-semibold rounded-full text-[10px]",
                            walletItem.is_frozen
                              ? "bg-rose-500/10 text-rose-500"
                              : "bg-emerald-500/10 text-emerald-500"
                          )}
                        >
                          {walletItem.is_frozen ? "Frozen" : "Active"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFreezeToggle(walletItem.wallet_id, walletItem.is_frozen)}
                          className={cn(
                            "h-8 px-2 text-[10px] rounded font-bold gap-1 transition-colors",
                            walletItem.is_frozen
                              ? "text-emerald-600 hover:bg-emerald-600/10"
                              : "text-rose-600 hover:bg-rose-600/10"
                          )}
                        >
                          {walletItem.is_frozen ? (
                            <>
                              <Unlock className="w-3 h-3" />
                              Unfreeze
                            </>
                          ) : (
                            <>
                              <Lock className="w-3 h-3" />
                              Freeze
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <AlertCircle className="w-6 h-6 text-muted-foreground/60" />
                        <h3 className="text-xs font-bold">No client wallets found</h3>
                        <p className="text-[10px] text-muted-foreground">
                          Try searching for a different user ID or branch name.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* --- Dialog Modals --- */}

        {/* Deposit Modal */}
        <Dialog open={isDepositOpen} onOpenChange={setIsDepositOpen}>
          <DialogContent className="sm:max-w-[420px] rounded bg-card border-border/40">
            <form onSubmit={handleDepositSubmit} className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-sm font-bold">Simulate Branch Deposit</DialogTitle>
                <DialogDescription className="text-[11px] text-muted-foreground">
                  Simulate funds deposition into this branch's wallet ledger. A 1% platform fee will be applied automatically.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 pt-2 text-xs">
                <div className="space-y-1">
                  <Label htmlFor="dep-amount" className="font-semibold text-muted-foreground">Deposit Amount (UGX)</Label>
                  <Input
                    id="dep-amount"
                    type="number"
                    placeholder="Enter amount, e.g. 50000"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    required
                    className="h-10 text-xs border-border/40"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dep-ref" className="font-semibold text-muted-foreground">Transaction Reference</Label>
                  <Input
                    id="dep-ref"
                    placeholder="e.g. MPESA/MTN Mobile Money Reference ID"
                    value={referenceInput}
                    onChange={(e) => setReferenceInput(e.target.value)}
                    required
                    className="h-10 text-xs border-border/40"
                  />
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsDepositOpen(false)}
                  className="h-9 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={depositMutation.isPending}
                  className="h-9 text-xs"
                >
                  Confirm Deposit
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

      </div>
    </SettingsLayout>
  );
}
