import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from 'wagmi'
import { parseEther, type Address } from 'viem'
import { useCallback, useEffect, useRef, useState } from 'react'
import { epocheAbi } from '../lib/epocheAbi'
import { EPOCHE_ADDRESS, isContractConfigured } from '../lib/config'
import { monadTestnet } from '../lib/chains'

export const Status = {
  None: 0,
  Pending: 1,
  Canceled: 2,
  Claimed: 3,
} as const

export type TransferRow = {
  id: bigint
  from: Address
  to: Address
  amount: bigint
  unlockAt: number
  status: number
}

/** How many recent transfer ids to scan (batched via multicall). */
const SCAN_WINDOW = 60n

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function isRateLimitError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e)
  return /limited to \d+\/sec|rate.?limit|429|too many requests/i.test(msg)
}

export function useEpocheConfig() {
  const defaultCoolOff = useReadContract({
    address: EPOCHE_ADDRESS,
    abi: epocheAbi,
    functionName: 'defaultCoolOff',
    chainId: monadTestnet.id,
    query: { enabled: isContractConfigured, staleTime: 60_000 },
  })
  const maxCoolOff = useReadContract({
    address: EPOCHE_ADDRESS,
    abi: epocheAbi,
    functionName: 'maxCoolOff',
    chainId: monadTestnet.id,
    query: { enabled: isContractConfigured, staleTime: 60_000 },
  })
  const nextId = useReadContract({
    address: EPOCHE_ADDRESS,
    abi: epocheAbi,
    functionName: 'nextId',
    chainId: monadTestnet.id,
    query: {
      enabled: isContractConfigured,
      refetchInterval: 30_000,
      staleTime: 10_000,
    },
  })

  return {
    defaultCoolOff: defaultCoolOff.data
      ? Number(defaultCoolOff.data)
      : undefined,
    maxCoolOff: maxCoolOff.data ? Number(maxCoolOff.data) : undefined,
    nextId: nextId.data as bigint | undefined,
    refetchNextId: nextId.refetch,
  }
}

export function useIsTrusted(to: Address | undefined) {
  const { address } = useAccount()
  return useReadContract({
    address: EPOCHE_ADDRESS,
    abi: epocheAbi,
    functionName: 'isTrusted',
    args: address && to ? [address, to] : undefined,
    chainId: monadTestnet.id,
    query: {
      enabled: Boolean(isContractConfigured && address && to),
      refetchInterval: 20_000,
      staleTime: 8_000,
    },
  })
}

export function useEpocheWrites() {
  const { writeContract, data: hash, isPending, error, reset } =
    useWriteContract()
  const receipt = useWaitForTransactionReceipt({ hash })

  const send = useCallback(
    (to: Address, amountMon: string, coolOff: number = 0) => {
      writeContract({
        address: EPOCHE_ADDRESS,
        abi: epocheAbi,
        functionName: 'send',
        args: [to, BigInt(coolOff)],
        value: parseEther(amountMon),
        chainId: monadTestnet.id,
      })
    },
    [writeContract],
  )

  const cancel = useCallback(
    (id: bigint) => {
      writeContract({
        address: EPOCHE_ADDRESS,
        abi: epocheAbi,
        functionName: 'cancel',
        args: [id],
        chainId: monadTestnet.id,
      })
    },
    [writeContract],
  )

  const claim = useCallback(
    (id: bigint) => {
      writeContract({
        address: EPOCHE_ADDRESS,
        abi: epocheAbi,
        functionName: 'claim',
        args: [id],
        chainId: monadTestnet.id,
      })
    },
    [writeContract],
  )

  const setTrusted = useCallback(
    (to: Address, trusted: boolean) => {
      writeContract({
        address: EPOCHE_ADDRESS,
        abi: epocheAbi,
        functionName: 'setTrusted',
        args: [to, trusted],
        chainId: monadTestnet.id,
      })
    },
    [writeContract],
  )

  const receiptError =
    receipt.isError && receipt.error ? receipt.error : undefined
  const combinedError = error ?? receiptError

  return {
    send,
    cancel,
    claim,
    setTrusted,
    hash,
    isPending,
    isConfirming: Boolean(hash) && receipt.isLoading,
    isSuccess: receipt.isSuccess,
    isReverted: receipt.isSuccess === false && receipt.isError,
    error: combinedError,
    /** True while wallet popup or chain confirmation is in progress. */
    busy: isPending || (Boolean(hash) && receipt.isLoading),
    reset,
  }
}

/**
 * Load transfers involving the connected wallet by scanning recent ids.
 * Batches getTransfer via multicall (public Monad RPC is ~15 req/s).
 * Always reads from testnet — contract is deployed there only for now.
 */
export function useMyTransfers() {
  const { address } = useAccount()
  const client = usePublicClient({ chainId: monadTestnet.id })
  const [rows, setRows] = useState<TransferRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef(false)
  const queued = useRef(false)

  const refresh = useCallback(async () => {
    if (!client || !address || !isContractConfigured) {
      setRows([])
      setError(null)
      return
    }

    // Coalesce overlapping polls; always run one more if anything queued mid-flight
    if (inFlight.current) {
      queued.current = true
      return
    }
    inFlight.current = true
    setLoading(true)
    // Keep last good rows visible; only clear error when a fetch starts cleanly
    setError(null)

    const runOnce = async (): Promise<TransferRow[]> => {
      const nextId = (await client.readContract({
        address: EPOCHE_ADDRESS,
        abi: epocheAbi,
        functionName: 'nextId',
      })) as bigint

      if (nextId <= 1n) return []

      const me = address.toLowerCase()
      const last = nextId - 1n
      const start = last > SCAN_WINDOW ? last - (SCAN_WINDOW - 1n) : 1n
      const ids: bigint[] = []
      for (let id = last; id >= start; id--) {
        if (id < 1n) break
        ids.push(id)
      }

      const results = await client.multicall({
        contracts: ids.map((id) => ({
          address: EPOCHE_ADDRESS,
          abi: epocheAbi,
          functionName: 'getTransfer' as const,
          args: [id] as const,
        })),
        allowFailure: true,
      })

      const transfers: TransferRow[] = []
      for (let i = 0; i < results.length; i++) {
        const r = results[i]
        if (r.status !== 'success' || !r.result) continue
        const [from, to, amount, unlockAt, status] = r.result as [
          Address,
          Address,
          bigint,
          bigint | number,
          number,
        ]
        if (from === '0x0000000000000000000000000000000000000000') continue
        if (from.toLowerCase() !== me && to.toLowerCase() !== me) continue
        transfers.push({
          id: ids[i],
          from,
          to,
          amount,
          unlockAt: Number(unlockAt),
          status: Number(status),
        })
      }

      transfers.sort((a, b) => Number(b.id - a.id))
      return transfers
    }

    try {
      let transfers: TransferRow[]
      try {
        transfers = await runOnce()
      } catch (e) {
        // One retry after a short pause — public RPC often recovers quickly
        if (isRateLimitError(e)) {
          await sleep(1200)
          transfers = await runOnce()
        } else {
          throw e
        }
      }
      setRows(transfers)
    } catch (e) {
      console.error('useMyTransfers', e)
      const msg = e instanceof Error ? e.message : String(e)
      if (isRateLimitError(e) || /limited to \d+\/sec|rate.?limit|429/i.test(msg)) {
        setError('RPC rate limited — wait a moment and hit Refresh.')
      } else if (/returned no data|does not have any code/i.test(msg)) {
        setError('Contract not found on this network. Switch to Monad Testnet.')
      } else {
        setError('Could not load transfers. Check network and try refresh.')
      }
      // Keep previous rows if we had a successful load before
    } finally {
      inFlight.current = false
      setLoading(false)
      if (queued.current) {
        queued.current = false
        // Defer so we exit this stack cleanly
        void Promise.resolve().then(() => refresh())
      }
    }
  }, [client, address])

  useEffect(() => {
    void refresh()
    const tick = () => {
      if (document.visibilityState !== 'visible') return
      void refresh()
    }
    const t = setInterval(tick, 60_000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [refresh])

  return { rows, loading, error, refresh }
}
