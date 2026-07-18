/** Map wallet/contract errors to short product copy. */
export function humanError(e: unknown): string {
  if (!e) return ''
  const raw =
    typeof e === 'object' && e !== null && 'shortMessage' in e
      ? String((e as { shortMessage: string }).shortMessage)
      : e instanceof Error
        ? e.message
        : String(e)

  const s = raw.toLowerCase()
  if (s.includes('user rejected') || s.includes('user denied'))
    return 'You rejected the transaction in your wallet.'
  if (s.includes('stilllocked') || s.includes('still locked'))
    return 'Cool-off is not over yet — wait for unlock, then release.'
  if (s.includes('unlockpassed') || s.includes('unlock passed'))
    return 'Cancel window closed — release to recipient instead.'
  if (s.includes('notsender') || s.includes('not sender'))
    return 'Only the sender can cancel this transfer.'
  if (s.includes('notpending') || s.includes('not pending'))
    return 'This transfer is already settled (canceled or released).'
  if (s.includes('coolofftoolong') || s.includes('cool-off too'))
    return 'Hold duration is too long — pick 5, 15, or 30 minutes.'
  if (s.includes('zeroamount') || s.includes('zero amount'))
    return 'Enter an amount greater than zero.'
  if (s.includes('zeroaddress') || s.includes('zero address'))
    return 'Enter a valid recipient address.'
  if (s.includes('selftransfer') || s.includes('self transfer'))
    return 'You can’t send to your own address.'
  if (s.includes('transferfailed') || s.includes('transfer failed'))
    return 'Native transfer failed — recipient may not accept MON.'
  if (s.includes('insufficient funds') || s.includes('exceeds balance'))
    return 'Not enough MON for this send (including gas).'
  if (
    s.includes('chain mismatch') ||
    s.includes('wrong network') ||
    s.includes('unknown chain') ||
    s.includes('does not match the target chain')
  )
    return 'Wrong network — switch to Monad Testnet and try again.'
  if (s.includes('limited to') || s.includes('rate limit') || s.includes('429'))
    return 'Network is busy — wait a second and try again.'
  if (s.includes('reverted') || s.includes('execution reverted'))
    return 'Transaction reverted. Refresh holds and try again.'

  if (raw.length > 160) return raw.slice(0, 157) + '…'
  return raw
}

/** Short label for write lifecycle in buttons / status lines. */
export function writeStatusLabel(opts: {
  isPending: boolean
  isConfirming: boolean
  isSuccess?: boolean
}): string | null {
  if (opts.isPending) return 'Confirm in wallet…'
  if (opts.isConfirming) return 'Confirming on Monad…'
  if (opts.isSuccess) return 'Confirmed'
  return null
}
