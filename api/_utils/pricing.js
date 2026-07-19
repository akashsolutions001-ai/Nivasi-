// api/_utils/pricing.js
// Single source of truth for subscription pricing.
// Used by create-order.js (and future renewal endpoints).

/**
 * Engineering subscription amount (INR) keyed by roomType.
 */
export const ENGINEERING_ROOM_TYPE_PRICING = {
  'Single Room': 100,
  'Cot Basis': 100,
  '1 RK': 150,
  '1 BHK': 200,
  '2 BHK': 300,
};

/**
 * Medical subscription amount (INR) keyed by roomType.
 */
export const MEDICAL_ROOM_TYPE_PRICING = {
  'Single Room': 150,
  'Cot Basis': 150,
  '1 RK': 200,
  '1 BHK': 400,
  '2 BHK': 600,
  '3 BHK': 800,
  '4 BHK': 1000,
  '5 BHK': 1200,
};

/**
 * All accepted room types (union). Medical-only types use medical amounts.
 * Kept so any caller of ROOM_TYPE_PRICING accepts 3/4/5 BHK.
 */
export const ROOM_TYPE_PRICING = {
  ...ENGINEERING_ROOM_TYPE_PRICING,
  ...MEDICAL_ROOM_TYPE_PRICING,
};

function getPricingTable(studentStream) {
  return studentStream === 'medical' ? MEDICAL_ROOM_TYPE_PRICING : ENGINEERING_ROOM_TYPE_PRICING;
}

function allValidRoomTypes() {
  return Object.keys(ROOM_TYPE_PRICING);
}

/** Subscription validity period in days. */
export const SUBSCRIPTION_DURATION_DAYS = 90;

/**
 * Returns the subscription amount for a given roomType and student stream.
 * Throws a descriptive Error if the roomType is not recognised.
 *
 * @param {string} roomType - e.g. "1 RK", "3 BHK"
 * @param {string} [studentStream='engineering'] - "engineering" | "medical"
 * @returns {number} amount in INR
 */
export function getAmountForRoomType(roomType, studentStream = 'engineering') {
  const normalizedType = typeof roomType === 'string' ? roomType.trim() : roomType;
  const pricing = getPricingTable(studentStream);
  let amount = pricing[normalizedType];

  // Medical-only types (3/4/5 BHK) or stream omitted — fall back across tables
  if (amount === undefined) {
    amount =
      MEDICAL_ROOM_TYPE_PRICING[normalizedType] ??
      ENGINEERING_ROOM_TYPE_PRICING[normalizedType] ??
      ROOM_TYPE_PRICING[normalizedType];
  }

  if (amount === undefined) {
    throw new Error(
      `Unknown roomType: "${roomType}". Valid values: ${allValidRoomTypes().join(', ')}`
    );
  }
  return amount;
}

export const MAX_ROOMS_PER_BATCH = 10;

export function getAmountForRoomBatch(roomType, count = 1, studentStream = 'engineering') {
  const qty = Math.min(MAX_ROOMS_PER_BATCH, Math.max(1, Number(count) || 1));
  return getAmountForRoomType(roomType, studentStream) * qty;
}

function isValidFirestoreRoomId(roomId) {
  return (
    roomId &&
    typeof roomId === 'string' &&
    !roomId.startsWith('178') &&
    !/^\d+$/.test(roomId)
  );
}

export { isValidFirestoreRoomId };
