import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { configuredDepositNetworks } from '@/lib/deposit-addresses'

/**
 * Receiving addresses for the deposit form. Read from the environment at
 * request time so the Docker image never bakes in an address, and rotating a
 * wallet is a restart rather than a rebuild.
 *
 * Session-gated: these are only shown to signed-in investors, same as in the
 * UI. Networks without a configured address are omitted entirely.
 */
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await getSessionUser(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const networks = configuredDepositNetworks()
  return NextResponse.json(
    { networks },
    { headers: { 'Cache-Control': 'private, no-store' } }
  )
}
