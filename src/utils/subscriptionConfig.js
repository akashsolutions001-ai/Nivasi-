// Subscription Configuration
export const SUBSCRIPTION_DURATION_DAYS = 90;
export const EXPIRY_WARNING_DAYS = 7;

/** Engineering listing subscription prices (unchanged) */
export const ENGINEERING_ROOM_TYPE_PRICING = {
  'Single Room': 100,
  'Cot Basis': 100,
  '1 RK': 150,
  '1 BHK': 200,
  '2 BHK': 300
};

/** Medical listing subscription prices */
export const MEDICAL_ROOM_TYPE_PRICING = {
  'Single Room': 150,
  'Cot Basis': 150,
  '1 RK': 200,
  '1 BHK': 400,
  '2 BHK': 600,
  '3 BHK': 800,
  '4 BHK': 1000,
  '5 BHK': 1200
};

/** @deprecated Prefer getPricingForStream — kept for backward compatibility (engineering rates) */
export const ROOM_TYPE_PRICING = ENGINEERING_ROOM_TYPE_PRICING;

/**
 * Pricing table for a student stream.
 * @param {string} [studentStream]
 * @returns {Record<string, number>}
 */
export function getPricingForStream(studentStream) {
  return studentStream === 'medical' ? MEDICAL_ROOM_TYPE_PRICING : ENGINEERING_ROOM_TYPE_PRICING;
}

/**
 * Room type options for Add Room (depends on Engineering vs Medical).
 * @param {string} [studentStream]
 * @returns {string[]}
 */
export function getRoomTypeOptions(studentStream) {
  return Object.keys(getPricingForStream(studentStream));
}

/**
 * Get subscription amount based on room type and student stream
 * @param {string} roomType
 * @param {string} [studentStream='engineering']
 * @returns {number}
 */
export function getSubscriptionAmount(roomType, studentStream = 'engineering') {
  const pricing = getPricingForStream(studentStream);
  const price = pricing[roomType];
  if (price === undefined) {
    // Fallback: try engineering table, then 1 RK
    const fallback =
      ENGINEERING_ROOM_TYPE_PRICING[roomType] ??
      MEDICAL_ROOM_TYPE_PRICING[roomType] ??
      ENGINEERING_ROOM_TYPE_PRICING['1 RK'];
    if (fallback === undefined) {
      throw new Error(`Invalid room type: ${roomType}`);
    }
    return fallback;
  }
  return price;
}

/** All room types across streams (for bulk-add eligibility). */
export const MULTI_ROOM_TYPES = [
  ...new Set([
    ...Object.keys(ENGINEERING_ROOM_TYPE_PRICING),
    ...Object.keys(MEDICAL_ROOM_TYPE_PRICING)
  ])
];

export const MAX_ROOMS_PER_BATCH = 10;

/**
 * Total registration fee for multiple rooms of the same type.
 * @param {string} roomType
 * @param {number} count
 * @param {string} [studentStream='engineering']
 * @returns {number}
 */
export function getSubscriptionTotal(roomType, count = 1, studentStream = 'engineering') {
  const qty = Math.min(MAX_ROOMS_PER_BATCH, Math.max(1, Number(count) || 1));
  return getSubscriptionAmount(roomType, studentStream) * qty;
}

/**
 * Check if subscription is active
 * @param {object|string|number} subscriptionEnd - Firebase Timestamp, Date, or milliseconds
 * @returns {boolean}
 */
export function isSubscriptionActive(subscriptionEnd) {
  if (!subscriptionEnd) return false;
  
  // Handle Firebase Timestamp or normal Date / timestamp ms
  let endTimeMs;
  if (subscriptionEnd.seconds) {
    endTimeMs = subscriptionEnd.seconds * 1000;
  } else if (subscriptionEnd.toDate && typeof subscriptionEnd.toDate === 'function') {
    endTimeMs = subscriptionEnd.toDate().getTime();
  } else {
    endTimeMs = new Date(subscriptionEnd).getTime();
  }
  
  return endTimeMs > Date.now();
}

/**
 * Check if subscription is expiring soon (within warning days)
 * @param {object|string|number} subscriptionEnd 
 * @returns {boolean}
 */
export function isExpiringSoon(subscriptionEnd) {
  if (!subscriptionEnd) return false;
  
  let endTimeMs;
  if (subscriptionEnd.seconds) {
    endTimeMs = subscriptionEnd.seconds * 1000;
  } else if (subscriptionEnd.toDate && typeof subscriptionEnd.toDate === 'function') {
    endTimeMs = subscriptionEnd.toDate().getTime();
  } else {
    endTimeMs = new Date(subscriptionEnd).getTime();
  }
  
  const nowMs = Date.now();
  const diffMs = endTimeMs - nowMs;
  const warningMs = EXPIRY_WARNING_DAYS * 24 * 60 * 60 * 1000;
  
  return diffMs > 0 && diffMs <= warningMs;
}

/**
 * Get remaining days until subscription expiry
 * @param {object|string|number} subscriptionEnd 
 * @returns {number}
 */
export function getDaysUntilExpiry(subscriptionEnd) {
  if (!subscriptionEnd) return 0;
  
  let endTimeMs;
  if (subscriptionEnd.seconds) {
    endTimeMs = subscriptionEnd.seconds * 1000;
  } else if (subscriptionEnd.toDate && typeof subscriptionEnd.toDate === 'function') {
    endTimeMs = subscriptionEnd.toDate().getTime();
  } else {
    endTimeMs = new Date(subscriptionEnd).getTime();
  }
  
  const diffMs = endTimeMs - Date.now();
  if (diffMs <= 0) return 0;
  
  return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
}
