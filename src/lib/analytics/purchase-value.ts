/** Validate the final TL value without coercion, rounding or a replacement price. */
export function isValidPurchaseValue(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

export class InvalidPurchaseValueError extends Error {
  constructor() {
    super('invalid_purchase_value')
    Object.setPrototypeOf(this, InvalidPurchaseValueError.prototype)
    this.name = 'InvalidPurchaseValueError'
  }
}

export function assertPurchaseValue(value: unknown): asserts value is number {
  if (!isValidPurchaseValue(value)) {
    // Never log the input, order identifiers, customer data or provider payload.
    console.warn('[tracking] Purchase blocked: invalid_purchase_value')
    throw new InvalidPurchaseValueError()
  }
}
