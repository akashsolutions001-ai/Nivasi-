// api/create-order.js
// Vercel Serverless Function — creates a Cashfree payment order.
// POST /api/create-order
// Body: { roomId, roomType, customerName, customerEmail, customerPhone }
// Returns: { payment_session_id, order_id, order_amount, order_status }

import { Cashfree } from 'cashfree-pg';
import { getAmountForRoomType, getAmountForRoomBatch, isValidFirestoreRoomId } from './_utils/pricing.js';
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountJson) {
      throw new Error('Missing FIREBASE_SERVICE_ACCOUNT environment variable');
    }
    const serviceAccount = JSON.parse(serviceAccountJson);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (error) {
    console.error('Firebase Admin init error:', error);
  }
}

// ─── SDK initialisation (module-level, runs once per cold start) ──────────────
Cashfree.XClientId     = process.env.CASHFREE_CLIENT_ID;
Cashfree.XClientSecret = process.env.CASHFREE_CLIENT_SECRET;
Cashfree.XEnvironment  =
  process.env.CASHFREE_ENV === 'production'
    ? Cashfree.Environment.PRODUCTION
    : Cashfree.Environment.SANDBOX;
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Strips a raw phone string down to exactly 10 digits.
 * Handles +91 / 91 prefixes and non-digit characters.
 */
function normalisePhone(phone) {
  let digits = String(phone).replace(/\D/g, '');
  if (digits.length > 10 && digits.startsWith('91')) {
    digits = digits.slice(2);
  }
  if (digits.length !== 10) {
    // Fallback: take the last 10 digits and zero-pad from the left
    digits = digits.slice(-10).padStart(10, '0');
  }
  return digits;
}

/**
 * Best-effort extraction of the request origin for building the return URL.
 * Cashfree production rejects localhost return URLs — use the deployed site instead.
 */
function resolveOrigin(req, bodyReturnUrl) {
  const productionFallback =
    process.env.SITE_URL ||
    process.env.VITE_API_URL ||
    'https://www.nivasispace.com';

  const isLocalOrigin = (origin) =>
    !origin ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1');

  if (bodyReturnUrl && typeof bodyReturnUrl === 'string' && !isLocalOrigin(bodyReturnUrl)) {
    return bodyReturnUrl.replace(/\/$/, '');
  }

  let origin;
  if (req.headers.origin) {
    origin = req.headers.origin;
  } else if (req.headers.referer) {
    try { origin = new URL(req.headers.referer).origin; } catch { /* ignore */ }
  } else if (req.headers.host) {
    const isLocal =
      req.headers.host.startsWith('localhost') ||
      req.headers.host.startsWith('127.0.0.1');
    origin = `${isLocal ? 'http' : 'https'}://${req.headers.host}`;
  }

  if (isLocalOrigin(origin)) {
    return productionFallback.replace(/\/$/, '');
  }

  return origin || productionFallback.replace(/\/$/, '');
}

/** Cashfree order_id max length is 50 characters. */
function buildOrderId(roomId) {
  const suffix = String(Date.now());
  const prefix = 'ord_';
  const maxRoomPart = 50 - prefix.length - suffix.length - 1;
  const roomPart = roomId.replace(/[^a-zA-Z0-9]/g, '').slice(0, maxRoomPart);
  return `${prefix}${roomPart}_${suffix}`;
}

export default async function handler(req, res) {
  // ── CORS ───────────────────────────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  // ──────────────────────────────────────────────────────────────────────────

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Validate environment ───────────────────────────────────────────────────
  if (!process.env.CASHFREE_CLIENT_ID || !process.env.CASHFREE_CLIENT_SECRET) {
    console.error('[create-order] Missing CASHFREE_CLIENT_ID or CASHFREE_CLIENT_SECRET');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // ── Parse & validate body ──────────────────────────────────────────────────
  const { roomId, roomIds, roomCount, roomType, studentStream, customerName, customerEmail, customerPhone, returnUrl } = req.body ?? {};

  // Log full request body for debugging
  console.log('[create-order] request body:', JSON.stringify(req.body));

  const normalizedRoomIds = Array.isArray(roomIds) && roomIds.length > 0
    ? roomIds.map((id) => String(id).trim()).filter(Boolean)
    : roomId
      ? [String(roomId).trim()]
      : [];

  console.log('[create-order] received roomIds:', normalizedRoomIds);

  if (normalizedRoomIds.length === 0 || normalizedRoomIds.some((id) => !isValidFirestoreRoomId(id))) {
    console.error('[create-order] Invalid roomId(s) received:', normalizedRoomIds);
    return res.status(400).json({
      error: 'Invalid roomId. Must be Firestore rooms document id.',
      receivedRoomIds: normalizedRoomIds
    });
  }

  const batchCount = Math.min(
    normalizedRoomIds.length,
    Math.max(1, Number(roomCount) || normalizedRoomIds.length)
  );
  const primaryRoomId = normalizedRoomIds[0];

  if (!roomType || !customerName || !customerPhone) {
    return res.status(400).json({
      error: 'Missing required fields: roomType, customerName, customerPhone',
    });
  }

  // Safely normalize primary room id
  const normalizedRoomId = primaryRoomId;

  // ── Duplicate Payment Protection ───────────────────────────────────────────
  if (admin.apps.length) {
    try {
      for (const id of normalizedRoomIds) {
        const roomDoc = await admin.firestore().collection('rooms').doc(id).get();
        if (!roomDoc.exists) continue;
        const roomData = roomDoc.data();
        if (roomData.paymentStatus === 'paid' && roomData.subscriptionStatus === 'active' && roomData.subscriptionEnd) {
          let endTimeMs;
          if (roomData.subscriptionEnd._seconds) {
            endTimeMs = roomData.subscriptionEnd._seconds * 1000;
          } else if (roomData.subscriptionEnd.toDate) {
            endTimeMs = roomData.subscriptionEnd.toDate().getTime();
          } else if (typeof roomData.subscriptionEnd === 'number') {
            endTimeMs = roomData.subscriptionEnd;
          } else {
            endTimeMs = new Date(roomData.subscriptionEnd).getTime();
          }

          if (endTimeMs > Date.now()) {
            console.warn(`[create-order] Room ${id} already has an active subscription. Order creation blocked.`);
            return res.status(409).json({
              error: 'Room subscription already active',
              roomId: id,
              subscriptionEnd: roomData.subscriptionEnd
            });
          }
        }
      }
    } catch (err) {
      console.error('[create-order] Error checking duplicate payment:', err);
      // Fall through and allow order creation if Firestore check fails
    }
  }

  // ── Resolve amount from roomType + stream (server-side — never trust client amount) ────────
  let amount;
  let resolvedStream = studentStream === 'medical' ? 'medical' : 'engineering';

  // Prefer studentStream stored on the room document when available
  if (admin.apps.length) {
    try {
      const roomDoc = await admin.firestore().collection('rooms').doc(primaryRoomId).get();
      if (roomDoc.exists) {
        const streamFromRoom = roomDoc.data()?.studentStream;
        if (streamFromRoom === 'medical' || streamFromRoom === 'engineering') {
          resolvedStream = streamFromRoom;
        }
      }
    } catch (err) {
      console.error('[create-order] Error reading room studentStream:', err);
    }
  }

  try {
    amount = getAmountForRoomBatch(roomType, batchCount, resolvedStream);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  // ── Build order ────────────────────────────────────────────────────────────
  // Format: ord_<roomIdSlice>_<unixMs>  (max 50 chars for Cashfree)
  const orderId = buildOrderId(normalizedRoomId);
  const origin  = resolveOrigin(req, returnUrl);

  const orderRequest = {
    order_id:       orderId,
    order_amount:   amount,
    order_currency: 'INR',
    customer_details: {
      customer_id:    `cust_${normalizedRoomId.slice(0, 12)}`,
      customer_name:  customerName,
      customer_email: customerEmail || 'no-reply@nivasi.space',
      customer_phone: normalisePhone(customerPhone),
    },
    order_meta: {
      // Cashfree replaces {order_id} in the URL with the actual order ID
      return_url: `${origin}/?payment_status=check&order_id={order_id}`,
    },
  };

  // ── Call Cashfree SDK ──────────────────────────────────────────────────────
  try {
    const response = await Cashfree.PGCreateOrder('2023-08-01', orderRequest);

    // Log the full raw response for debugging
    console.log('[create-order] Raw Cashfree response status:', response?.status);
    console.log('[create-order] Raw Cashfree response data:', JSON.stringify(response?.data));

    // The SDK wraps the Cashfree API response in an Axios response object.
    // response.data is the OrderEntity from Cashfree.
    const order = response?.data;

    if (!order) {
      console.error('[create-order] Cashfree returned empty response data');
      return res.status(500).json({ error: 'Failed to create order — empty response from Cashfree' });
    }

    // Extract payment_session_id — validate it exists and is non-empty
    const paymentSessionId = order.payment_session_id;

    if (!paymentSessionId) {
      console.error('[create-order] Cashfree response missing payment_session_id. Full order:', JSON.stringify(order));
      return res.status(500).json({
        error: 'Failed to create order — no payment_session_id in Cashfree response',
        order_status: order.order_status,
      });
    }

    console.log(`[create-order] Order created: ${order.order_id} | ₹${order.order_amount} | session: ${paymentSessionId.substring(0, 20)}...`);
    console.log(`[create-order] orderId: ${order.order_id}`);

    try {
      const db = admin.firestore();
      console.log('[create-order] stored payment roomIds:', normalizedRoomIds);
      await db.collection('payments').doc(order.order_id).set({
        orderId: order.order_id,
        roomId: normalizedRoomId,
        roomIds: normalizedRoomIds,
        roomCount: batchCount,
        amount: order.order_amount,
        status: 'created',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        paymentType: 'room_subscription'
      });
      console.log(`[create-order] payment mapping stored`);
    } catch (dbError) {
      console.error('[create-order] Error saving payment mapping to Firestore:', dbError);
      return res.status(500).json({ error: 'Failed to create payment mapping in database' });
    }

    return res.status(200).json({
      payment_session_id: paymentSessionId,
      order_id:           order.order_id,
      order_amount:       order.order_amount,
      order_status:       order.order_status,
    });
  } catch (err) {
    const detail = err?.response?.data ?? err.message;
    console.error('[create-order] Cashfree API error:', JSON.stringify(detail));
    console.error('[create-order] Full error:', err?.message, err?.stack);
    return res.status(500).json({ error: 'Failed to create order', detail });
  }
}
