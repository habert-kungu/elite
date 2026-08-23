/**
 * Deposit destinations shown to investors. Single source of truth — update
 * here and the deposit form, API validation and admin views follow.
 */
export const DEPOSIT_NETWORKS = [
  {
    key: "TRC20",
    label: "USDT (TRC20)",
    asset: "USDT",
    chain: "Tron (TRC20)",
    address: "TVJhKNEJqcKwyd2Mdc7hLbVTzUtZPeKcNq",
    hint: "Send USDT on the Tron network only. Other networks will be lost.",
  },
  {
    key: "BTC",
    label: "Bitcoin (BTC)",
    asset: "BTC",
    chain: "Bitcoin",
    address: "bc1qkxll65eele4tvyuvdr78fjp3y9s7g8sp6zq74t",
    hint: "Native SegWit (bc1…) address. Send BTC only — amount is valued in USD at the time of confirmation.",
  },
] as const

export type DepositNetworkKey = (typeof DEPOSIT_NETWORKS)[number]["key"]

export const DEPOSIT_NETWORK_KEYS: readonly string[] = DEPOSIT_NETWORKS.map((n) => n.key)

export function depositNetwork(key: string) {
  return DEPOSIT_NETWORKS.find((n) => n.key === key) ?? DEPOSIT_NETWORKS[0]
}
