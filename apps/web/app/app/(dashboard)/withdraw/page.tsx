"use client"


import { Card } from "@/components/ui"
import * as React from "react"
import Link from "next/link"

const AVAILABLE_BALANCE = 4250.0

export default function WithdrawPage() {
  const [amount, setAmount] = React.useState("")
  const [address, setAddress] = React.useState("")
  const [network, setNetwork] = React.useState("TRC20")
  const [showConfirm, setShowConfirm] = React.useState(false)

  const withdrawAmount = amount ? parseFloat(amount) : 0
  const fee = withdrawAmount * 0.165
  const receiveAmount = withdrawAmount - fee

  const handleSubmit = () => {
    const message = `💰 *Withdrawal Request*\n\n*Amount:* $${withdrawAmount}\n*Fee (16.5%):* $${fee.toFixed(2)}\n*Net:* $${receiveAmount.toFixed(2)}\n*Network:* ${network}\n*Address:* ${address}`
    const telegramUrl = `https://t.me/khan_bashiri?text=${encodeURIComponent(message)}`
    window.open(telegramUrl, "_blank")
    setShowConfirm(false)
    setAmount("")
    setAddress("")
  }

  const isValid =
    withdrawAmount >= 50 &&
    withdrawAmount <= AVAILABLE_BALANCE &&
    address.length > 0

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center sm:gap-0">
        <div>
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
            Withdraw
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            Transfer earnings to your wallet
          </p>
        </div>
        <Link
          href="/app"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ← Back to Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="p-4 sm:p-6">
            <h2 className="mb-4 text-base font-medium text-foreground sm:mb-6 sm:text-lg">
              Withdrawal Details
            </h2>

            <div className="mb-4 sm:mb-5">
              <div className="mb-1.5 flex items-center justify-between sm:mb-2">
                <label className="text-xs font-medium text-foreground sm:text-sm">
                  Amount (USDT)
                </label>
                <button
                  onClick={() => setAmount(AVAILABLE_BALANCE.toString())}
                  className="text-[10px] font-medium text-[oklch(0.62_0.12_178)] hover:opacity-80 sm:text-xs"
                >
                  Max: ${AVAILABLE_BALANCE.toLocaleString()}
                </button>
              </div>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-border px-3 py-2.5 text-lg font-semibold text-foreground placeholder:text-muted-foreground focus:border-[oklch(0.21_0_0)] focus:outline-none sm:px-4 sm:py-3 sm:text-2xl"
              />
            </div>

            <div className="mb-4 sm:mb-5">
              <label className="mb-1.5 block text-xs font-medium text-foreground sm:mb-2 sm:text-sm">
                Wallet Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter your USDT address"
                className="w-full rounded-lg border border-border px-3 py-2.5 font-mono text-sm text-xs text-foreground placeholder:text-muted-foreground focus:border-[oklch(0.21_0_0)] focus:outline-none sm:px-4 sm:py-3 sm:text-sm"
              />
            </div>

            <div className="mb-4 sm:mb-5">
              <label className="mb-1.5 block text-xs font-medium text-foreground sm:mb-2 sm:text-sm">
                Network
              </label>
              <div className="grid grid-cols-3 gap-2">
                {["TRC20", "ERC20", "BEP20"].map((net) => (
                  <button
                    key={net}
                    onClick={() => setNetwork(net)}
                    className={`rounded-lg border px-2 py-2 text-[10px] font-medium transition-all sm:px-3 sm:py-2.5 sm:text-xs ${
                      network === net
                        ? "border-[oklch(0.21_0_0)] bg-[oklch(0.21_0_0)/8] text-foreground"
                        : "border-border text-muted-foreground hover:border-[oklch(0.21_0_0)/50]"
                    }`}
                  >
                    {net}
                  </button>
                ))}
              </div>
            </div>

            {withdrawAmount > 0 && (
              <div className="mb-4 space-y-2 rounded-lg bg-secondary/50 p-3 sm:mb-5 sm:space-y-3 sm:p-4">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium text-foreground">
                    ${withdrawAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-muted-foreground">Fee (16.5%)</span>
                  <span className="font-medium text-muted-foreground">
                    -${fee.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 text-xs sm:pt-3 sm:text-sm">
                  <span className="font-medium text-foreground">
                    You receive
                  </span>
                  <span className="font-bold text-[oklch(0.62_0.12_178)]">
                    ${receiveAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={() => isValid && setShowConfirm(true)}
              disabled={!isValid}
              className="w-full rounded-lg bg-[oklch(0.21_0_0)] py-3 text-sm font-medium text-[oklch(1_0_180)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:py-4 sm:text-base"
            >
              Request via Telegram
            </button>
          </Card>
        </div>

        <div className="space-y-3 sm:space-y-4">
          <Card className="p-4 sm:p-5">
            <div className="mb-1 font-mono text-[10px] text-muted-foreground uppercase sm:text-xs">
              Available
            </div>
            <div className="text-2xl font-bold text-foreground sm:text-3xl">
              ${AVAILABLE_BALANCE.toLocaleString()}
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground sm:text-xs">
              USDT
            </div>
          </Card>

          <Card className="p-4 sm:p-5">
            <h3 className="mb-3 text-xs font-medium text-foreground sm:mb-4 sm:text-sm">
              Important
            </h3>
            <ul className="space-y-2 text-[10px] text-muted-foreground sm:space-y-3 sm:text-xs">
              {[
                "Min withdrawal: $50 USDT",
                "Fee: 16.5% on net",
                "Processing: 24-48 hours",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <svg
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[oklch(0.62_0.12_178)] sm:h-4 sm:w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-lg border border-border bg-card p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-base font-semibold text-foreground">
              Confirm Withdrawal
            </h3>
            <div className="space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between border-b border-border py-2">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium text-foreground">
                  ${withdrawAmount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between border-b border-border py-2">
                <span className="text-muted-foreground">Fee (16.5%)</span>
                <span className="text-muted-foreground">
                  -${fee.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between border-b border-border py-2">
                <span className="text-muted-foreground">Network</span>
                <span className="text-foreground">{network}</span>
              </div>
              <div className="border-b border-border py-2">
                <span className="mb-1 block text-xs text-muted-foreground">
                  Address
                </span>
                <span className="font-mono text-xs break-all text-foreground">
                  {address}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="font-medium text-foreground">You receive</span>
                <span className="font-bold text-[oklch(0.62_0.12_178)]">
                  ${receiveAmount.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 rounded-lg bg-[oklch(0.21_0_0)] py-2.5 text-sm font-medium text-[oklch(1_0_180)] transition-opacity hover:opacity-90"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
