const FLOW_KEY = 'nivasi_add_room_flow';

function saveFlow(data) {
  sessionStorage.setItem(FLOW_KEY, JSON.stringify({ ...data, ts: Date.now() }));
}

export function setAddRoomPaymentFlow({ path, roomCount, title, roomType }) {
  saveFlow({ type: 'add_room', path, roomCount, title, roomType });
}

export function setSubscriptionPaymentFlow({ path, roomId, title, roomType }) {
  saveFlow({ type: 'subscription', path, roomId, roomCount: 1, title, roomType });
}

export function getPaymentFlow() {
  const raw = sessionStorage.getItem(FLOW_KEY);
  if (!raw) return null;
  try {
    const flow = JSON.parse(raw);
    if (!flow.type) flow.type = 'add_room';
    return flow;
  } catch {
    return null;
  }
}

export function getAddRoomPaymentFlow() {
  const flow = getPaymentFlow();
  return flow?.type === 'add_room' ? flow : null;
}

export function getSubscriptionPaymentFlow() {
  const flow = getPaymentFlow();
  return flow?.type === 'subscription' ? flow : null;
}

export function clearPaymentFlow() {
  sessionStorage.removeItem(FLOW_KEY);
}

export function clearAddRoomPaymentFlow() {
  clearPaymentFlow();
}
