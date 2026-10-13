export function calculateBookingPrice(requiredCbm, pricePerCbm) {
  const subtotal = Math.round(requiredCbm * pricePerCbm)
  const handlingFee = 450
  const serviceFee = Math.round(subtotal * 0.05)
  const taxes = Math.round((subtotal + handlingFee + serviceFee) * 0.18)
  const taxesAndFees = handlingFee + serviceFee + taxes
  return {
    subtotal,
    handlingFee,
    serviceFee,
    taxes,
    taxesAndFees,
    total: subtotal + taxesAndFees,
  }
}
