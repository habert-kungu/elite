/**
 * Deposit destinations shown to investors.
 *
 * Network *metadata* (labels, hints) is static and safe to import anywhere,
 * including client components. The receiving *addresses* come from the
 * environment and are only read on the server, then handed to the browser at
 * runtime by `GET /api/deposit-networks`.
 *
 * Reading them at runtime rather than inlining a `NEXT_PUBLIC_` value matters
 * for the Docker image: the build happens without production env vars, so an
 * inlined address would ship empty. Set these in `.env` (see `.env.example`):
 *
 *   DEPOSIT_USDT_TRC20_ADDRESS   USDT on Tron (TRC20)
 *   DEPOSIT_BTC_ADDRESS          Bitcoin, native SegWit (bc1…)
 *
 * A network with no configured address is withheld from the deposit form
 * rather than shown with a blank or wrong address.
 */

export const DEPOSIT_NETWORKS = [
  {
    key: "TRC20",
    label: "USDT (TRC20)",
    asset: "USDT",
    chain: "Tron (TRC20)",
    envVar: "DEPOSIT_USDT_TRC20_ADDRESS",
    hint: "Send USDT on the Tron network only. Other networks will be lost.",
  },
  {
    key: "BTC",
    label: "Bitcoin (BTC)",
    asset: "BTC",
    chain: "Bitcoin",
    envVar: "DEPOSIT_BTC_ADDRESS",
    hint: "Native SegWit (bc1…) address. Send BTC only — amount is valued in USD at the time of confirmation.",
  },
] as const

export type DepositNetwork = (typeof DEPOSIT_NETWORKS)[number]
export type DepositNetworkKey = DepositNetwork["key"]

/** A network plus the address resolved for it (empty when unconfigured). */
export type ResolvedDepositNetwork = {
  key: string
  label: string
  asset: string
  chain: string
  hint: string
  address: string
}

export const DEPOSIT_NETWORK_KEYS: readonly string[] = DEPOSIT_NETWORKS.map((n) => n.key)

export function depositNetwork(key: string): DepositNetwork {
  return DEPOSIT_NETWORKS.find((n) => n.key === key) ?? DEPOSIT_NETWORKS[0]
}

/** Server only — reads the configured address for a network. */
export function depositAddress(key: string): string {
  const net = DEPOSIT_NETWORKS.find((n) => n.key === key)
  if (!net) return ""
  return process.env[net.envVar]?.trim() || ""
}

/** Server only — networks that actually have an address configured. */
export function configuredDepositNetworks(): ResolvedDepositNetwork[] {
  return DEPOSIT_NETWORKS.map(({ key, label, asset, chain, hint }) => ({
    key,
    label,
    asset,
    chain,
    hint,
    address: depositAddress(key),
  })).filter((n) => n.address.length > 0)
}
