"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import useAuthStore from "@/store/authStore";
import { getBalance, getTransactions, getCoinPlans, createOrder, verifyPayment } from "@/lib/api";
import { CurrencyDollarIcon, ArrowUpIcon, ArrowDownIcon } from "@heroicons/react/24/outline";

export default function WalletPage() {
  const { user, updateUser, token } = useAuthStore();
  const router = useRouter();

  const [balance, setBalance] = useState({ coins: 0, diamonds: 0 });
  const [transactions, setTransactions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(null);
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    loadData();
    loadPlans();
  }, [user]);

  async function loadData() {
    try {
      const [bal, txns] = await Promise.all([getBalance(), getTransactions()]);
      setBalance(bal);
      setTransactions(txns.transactions || []);
    } finally {
      setLoading(false);
    }
  }

  async function loadPlans() {
    try {
      const data = await getCoinPlans();
      setPlans(data.plans || []);
    } catch {}
  }

  async function handleBuyCoins(plan) {
    setPayLoading(plan.id);
    try {
      const orderData = await createOrder(plan.id);

      // Load Razorpay script
      await new Promise((res, rej) => {
        if (window.Razorpay) return res();
        const s = document.createElement("script");
        s.src = "https://checkout.razorpay.com/v1/checkout.js";
        s.onload = res; s.onerror = rej;
        document.body.appendChild(s);
      });

      const rzp = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "TangoLive",
        description: `Buy ${plan.label}`,
        order_id: orderData.orderId,
        handler: async (response) => {
          try {
            const result = await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              planId: plan.id,
            });
            setBalance((b) => ({ ...b, coins: b.coins + result.coinsAdded }));
            updateUser({ coins: (user.coins || 0) + result.coinsAdded });
            alert(`✅ ${result.message}`);
            loadData();
          } catch (err) {
            alert("Payment verification failed");
          }
        },
        prefill: { email: user.email, name: user.displayName },
        theme: { color: "#ff2d7a" },
      });
      rzp.open();
    } catch (err) {
      alert(err.response?.data?.error || "Payment failed");
    } finally {
      setPayLoading(null);
    }
  }

  const typeConfig = {
    coin_purchase: { icon: "🪙", label: "Coin Purchase", color: "text-green-400" },
    gift_sent: { icon: "🎁", label: "Gift Sent", color: "text-red-400" },
    gift_received: { icon: "💎", label: "Gift Received", color: "text-yellow-400" },
    coin_refund: { icon: "↩️", label: "Refund", color: "text-blue-400" },
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-black text-white mb-6">My Wallet</h1>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="card p-6 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">🪙</span>
              <div>
                <div className="text-3xl font-black text-yellow-400">{balance.coins.toLocaleString()}</div>
                <div className="text-sm text-gray-400">Coins (for sending gifts)</div>
              </div>
            </div>
          </div>
          <div className="card p-6 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">💎</span>
              <div>
                <div className="text-3xl font-black text-blue-400">{balance.diamonds.toLocaleString()}</div>
                <div className="text-sm text-gray-400">Diamonds (earned from gifts)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {["overview", "buy"].map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize ${tab === t ? "bg-brand-500 text-white" : "bg-dark-700 text-gray-400 hover:text-white"}`}>
              {t === "buy" ? "💳 Buy Coins" : "📋 Transactions"}
            </button>
          ))}
        </div>

        {/* Buy Coins */}
        {tab === "buy" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {plans.map((plan) => (
              <div key={plan.id} className={`card p-5 hover:border-brand-500/40 transition-all ${plan.id === "popular" ? "border-brand-500/50 bg-brand-500/5" : ""}`}>
                {plan.id === "popular" && (
                  <div className="text-xs font-bold text-brand-400 mb-2 uppercase tracking-wide">⭐ Most Popular</div>
                )}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-white text-lg">{plan.label}</h3>
                    <div className="text-yellow-400 font-semibold">
                      🪙 {plan.coins.toLocaleString()} coins
                      {plan.bonus > 0 && <span className="text-green-400 text-sm ml-2">+{plan.bonus} bonus!</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-white">₹{plan.pricePaise / 100}</div>
                  </div>
                </div>
                <button onClick={() => handleBuyCoins(plan)} disabled={payLoading === plan.id}
                  className="btn-primary w-full text-sm">
                  {payLoading === plan.id ? "Processing..." : "Buy Now"}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Transactions */}
        {tab === "overview" && (
          <div className="card overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : transactions.length === 0 ? (
              <div className="p-12 text-center">
                <CurrencyDollarIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500">No transactions yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-dark-600">
                {transactions.map((tx) => {
                  const cfg = typeConfig[tx.type] || { icon: "💸", label: tx.type, color: "text-gray-400" };
                  return (
                    <div key={tx._id} className="flex items-center gap-4 px-5 py-4 hover:bg-dark-700/50 transition-colors">
                      <span className="text-2xl">{cfg.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">{tx.description}</div>
                        <div className="text-xs text-gray-500">{new Date(tx.createdAt).toLocaleDateString()}</div>
                      </div>
                      <div className={`font-bold text-sm ${tx.amount > 0 ? "text-green-400" : "text-red-400"}`}>
                        {tx.amount > 0 ? "+" : ""}{tx.amount} {tx.currency === "coins" ? "🪙" : "💎"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
