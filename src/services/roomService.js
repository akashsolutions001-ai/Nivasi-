// Room Service - Firestore operations for rooms
import { db, collection, doc, getDocs, addDoc, updateDoc, deleteDoc, serverTimestamp } from '../firebase.js';
import { getSubscriptionAmount, isSubscriptionActive, SUBSCRIPTION_DURATION_DAYS } from '../utils/subscriptionConfig.js';

const ROOMS_COLLECTION = 'rooms';

/** Fields that must not be changed via a normal room edit */
const PROTECTED_UPDATE_FIELDS = [
    'verificationStatus',
    'verifiedAt',
    'verifiedBy',
    'rejectedAt',
    'rejectedBy',
    'ownerId',
    'ownerName',
    'ownerEmail',
    'ownerPhone',
    'createdAt',
    'paymentStatus',
    'subscriptionStatus',
    'subscriptionStart',
    'subscriptionEnd',
    'subscriptionAmount',
    'paymentOrderId',
    'paymentMethod',
    'isPublished',
    'roomStatus',
    'visibility',
    'deleteRequested',
    'deleteRequestedBy',
    'deleteRequestedAt'
];

/**
 * Remove keys with undefined so Firestore gets only defined values
 */
function omitUndefined(obj) {
    if (obj == null) return obj;
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
        if (v !== undefined) out[k] = v;
    }
    return out;
}

/**
 * Fetch all rooms from Firestore
 */
export const fetchRooms = async () => {
    try {
        const roomsRef = collection(db, ROOMS_COLLECTION);
        const snapshot = await getDocs(roomsRef);

        // Spread doc.data() first, then override id with the real Firestore document id.
        // This prevents any numeric/custom 'id' field inside doc.data() from overwriting docSnap.id.
        const rooms = snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;
            
            // Check for subscription expiry
            if (data.subscriptionStatus === 'active' && !isSubscriptionActive(data.subscriptionEnd)) {
                // Non-blocking update to Firestore
                const updateRef = doc(db, ROOMS_COLLECTION, id);
                updateDoc(updateRef, {
                    paymentStatus: 'expired',
                    subscriptionStatus: 'expired',
                    isPublished: false
                }).catch(() => {});
                
                return { ...data, id, paymentStatus: 'expired', subscriptionStatus: 'expired', isPublished: false };
            }
            
            return {
                ...data,
                id
            };
        });

        return rooms;
    } catch (error) {
        console.error('Error fetching rooms from Firestore:', error);
        throw error;
    }
};

/**
 * Add a new room to Firestore with subscription fields initialized to pending
 */
export const addRoom = async (roomData, user, isAdmin) => {
    try {
        const roomsRef = collection(db, ROOMS_COLLECTION);
        
        let amount = 0;
        try {
            amount = getSubscriptionAmount(
              roomData.roomType || roomData.rooms || '1 RK',
              roomData.studentStream || 'engineering'
            );
        } catch (e) {
            console.error('Error getting subscription amount:', e);
        }

        const subscriptionFields = {
            subscriptionAmount: amount,
            paymentStatus: 'pending',
            subscriptionStatus: 'pending',
            subscriptionStart: null,
            subscriptionEnd: null,
            paymentOrderId: null,
            isPublished: false
        };

        const roomToAdd = omitUndefined({
            ...roomData,
            ...subscriptionFields,
            ownerId: isAdmin ? null : (user?.uid || null),
            ownerName: isAdmin ? null : (user?.displayName || null),
            ownerEmail: isAdmin ? null : (user?.email || null),
            ownerPhone: roomData.contact || null,
            addedByAdmin: isAdmin || undefined,
            verificationStatus: isAdmin ? 'verified' : 'pending',
            roomStatus: 'active',
            visibility: 'visible',
            verifiedAt: isAdmin ? serverTimestamp() : null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        // Remove the local id if present (Firestore will generate its own)
        delete roomToAdd.id;

        const docRef = await addDoc(roomsRef, roomToAdd);

        // Spread roomData and subscriptionFields first, then override id with the real
        // Firestore-generated document id so no custom/numeric id field can overwrite it.
        return {
            ...roomData,
            ...subscriptionFields,
            ownerId: isAdmin ? null : (user?.uid || null),
            ownerName: isAdmin ? null : (user?.displayName || null),
            ownerEmail: isAdmin ? null : (user?.email || null),
            ownerPhone: roomData.contact || null,
            addedByAdmin: isAdmin || undefined,
            verificationStatus: isAdmin ? 'verified' : 'pending',
            roomStatus: 'active',
            visibility: 'visible',
            id: docRef.id
        };
    } catch (error) {
        console.error('Error adding room to Firestore:', error);
        throw error;
    }
};

/**
 * Activate subscription after cash payment collected by admin
 */
export const activateCashSubscription = async (roomId) => {
    return activateCashSubscriptionForRooms([roomId]);
};

/**
 * Activate subscription after cash payment for one or more rooms
 */
export const activateCashSubscriptionForRooms = async (roomIds) => {
    const ids = Array.isArray(roomIds) ? roomIds.filter(Boolean) : [roomIds];
    if (ids.length === 0) return [];

    try {
        const now = new Date();
        const subscriptionEnd = new Date(now.getTime() + SUBSCRIPTION_DURATION_DAYS * 24 * 60 * 60 * 1000);
        const paymentOrderId = `cash-${ids[0]}-${Date.now()}`;

        const updatePayload = {
            paymentStatus: 'paid',
            subscriptionStatus: 'active',
            subscriptionStart: now,
            subscriptionEnd,
            paymentMethod: 'cash',
            paymentOrderId,
            isPublished: true,
            updatedAt: serverTimestamp()
        };

        await Promise.all(
            ids.map((roomId) => updateDoc(doc(db, ROOMS_COLLECTION, roomId), updatePayload))
        );

        return ids.map((id) => ({ ...updatePayload, id }));
    } catch (error) {
        console.error('Error activating cash subscription:', error);
        throw error;
    }
};

/**
 * Clear personal ownership on platform listings (admin-added rooms).
 * Used for new admin adds and one-time legacy cleanup.
 */
export const releasePlatformRoomOwnership = async (roomId) => {
    try {
        const roomRef = doc(db, ROOMS_COLLECTION, roomId);
        await updateDoc(roomRef, {
            ownerId: null,
            ownerName: null,
            ownerEmail: null,
            addedByAdmin: true,
            updatedAt: serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error('Error releasing platform room ownership:', error);
        throw error;
    }
};

/**
 * Verify a room
 */
export const verifyRoom = async (roomId, adminId) => {
    try {
        const roomRef = doc(db, ROOMS_COLLECTION, roomId);
        await updateDoc(roomRef, {
            verificationStatus: 'verified',
            verifiedAt: serverTimestamp(),
            verifiedBy: adminId,
            updatedAt: serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error('Error verifying room:', error);
        throw error;
    }
};

/**
 * Reject a room
 */
export const rejectRoom = async (roomId, adminId) => {
    try {
        const roomRef = doc(db, ROOMS_COLLECTION, roomId);
        await updateDoc(roomRef, {
            verificationStatus: 'rejected',
            rejectedAt: serverTimestamp(),
            rejectedBy: adminId,
            updatedAt: serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error('Error rejecting room:', error);
        throw error;
    }
};

/**
 * Toggle room status (active/expired)
 */
export const updateRoomStatus = async (roomId, status) => {
    try {
        const roomRef = doc(db, ROOMS_COLLECTION, roomId);
        await updateDoc(roomRef, {
            roomStatus: status,
            updatedAt: serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error('Error updating room status:', error);
        throw error;
    }
};

/**
 * Toggle room visibility (visible/hidden)
 */
export const toggleRoomVisibility = async (roomId, isVisible) => {
    try {
        const roomRef = doc(db, ROOMS_COLLECTION, roomId);
        await updateDoc(roomRef, {
            visibility: isVisible ? 'visible' : 'hidden',
            hidden: !isVisible,
            updatedAt: serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error('Error toggling room visibility:', error);
        throw error;
    }
};

/**
 * Update an existing room in Firestore
 */
export const updateRoom = async (roomId, roomData) => {
    try {
        const roomRef = doc(db, ROOMS_COLLECTION, roomId);

        const roomToUpdate = omitUndefined({
            ...roomData,
            updatedAt: serverTimestamp()
        });

        // Remove id from the data (it's in the document path)
        delete roomToUpdate.id;

        // Never allow edits to change verification, subscription, or ownership
        for (const field of PROTECTED_UPDATE_FIELDS) {
            delete roomToUpdate[field];
        }

        await updateDoc(roomRef, roomToUpdate);

        return {
            id: roomId,
            ...roomToUpdate
        };
    } catch (error) {
        console.error('Error updating room in Firestore:', error);
        throw error;
    }
};

/**
 * Delete a room from Firestore
 */
export const deleteRoom = async (roomId) => {
    try {
        const roomRef = doc(db, ROOMS_COLLECTION, roomId);
        await deleteDoc(roomRef);

        return true;
    } catch (error) {
        console.error('Error deleting room from Firestore:', error);
        throw error;
    }
};

/**
 * Request room deletion (for local admins)
 */
export const requestRoomDeletion = async (roomId, adminId) => {
    try {
        const roomRef = doc(db, ROOMS_COLLECTION, roomId);
        await updateDoc(roomRef, {
            deleteRequested: true,
            deleteRequestedBy: adminId,
            deleteRequestedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error('Error requesting room deletion:', error);
        throw error;
    }
};

/**
 * Reject room deletion
 */
export const rejectRoomDeletion = async (roomId) => {
    try {
        const roomRef = doc(db, ROOMS_COLLECTION, roomId);
        await updateDoc(roomRef, {
            deleteRequested: false,
            deleteRequestedBy: null,
            deleteRequestedAt: null,
            updatedAt: serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error('Error rejecting room deletion:', error);
        throw error;
    }
};

/**
 * Assign all Firestore rooms to a college and city (platform-wide).
 */
export const assignAllRoomsToCollege = async (
  college = "Dr. D. Y. Patil Prathisthan's College of Engineering, Salokhenagar (DYPSN) Kolhapur",
  city = 'Kolhapur'
) => {
  try {
    const roomsRef = collection(db, ROOMS_COLLECTION);
    const snapshot = await getDocs(roomsRef);
    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      if (data.college === college && data.city === city) {
        skipped++;
        continue;
      }

      try {
        await updateDoc(doc(db, ROOMS_COLLECTION, docSnap.id), {
          college,
          city,
          updatedAt: serverTimestamp()
        });
        updated++;
      } catch (err) {
        failed++;
        console.error(`Failed to assign college for room ${docSnap.id}:`, err);
      }
    }

    return { total: snapshot.size, updated, skipped, failed, college, city };
  } catch (error) {
    console.error('Error assigning rooms to college:', error);
    throw error;
  }
};

/**
 * Initialize Firestore with rooms from static data (one-time migration)
 */
export const migrateRoomsToFirestore = async (staticRooms) => {
    try {
        // First check if rooms already exist
        const existingRooms = await fetchRooms();

        if (existingRooms.length > 0) {
            return existingRooms;
        }

        const migratedRooms = [];
        for (const room of staticRooms) {
            const addedRoom = await addRoom(room);
            migratedRooms.push(addedRoom);
        }

        return migratedRooms;
    } catch (error) {
        console.error('Error migrating rooms to Firestore:', error);
        throw error;
    }
};
