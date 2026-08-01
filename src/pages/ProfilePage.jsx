import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { User, Phone, Mail, Building, Save, Loader2, CheckCircle, Users, LogOut, MapPin, Shield, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useUserPreferences } from '../contexts/UserPreferencesContext.jsx';
import { db } from '../firebase.js';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigate, useSearchParams } from 'react-router-dom';
import RoomCard from '../components/RoomCard.jsx';
import ConfirmationModal from '../components/ConfirmationModal.jsx';
import InAppToast from '../components/InAppToast.jsx';
import { verifyPayment } from '../services/paymentService.js';
import { getPaymentFlow, clearPaymentFlow } from '../utils/paymentFlow.js';
import { isSubscriptionActive, isExpiringSoon } from '../utils/subscriptionConfig.js';
import { CITIES, STUDENT_STREAMS, getCollegesForCity } from '../utils/locationOptions.js';

const RoomDetailModal = lazy(() => import('../components/RoomDetailModal.jsx'));
const AddRoomModal = lazy(() => import('../components/AddRoomModal.jsx'));
const SubscriptionPaymentModal = lazy(() => import('../components/SubscriptionPaymentModal.jsx'));
const BookingModal = lazy(() => import('../components/BookingModal.jsx'));

const ModalLoadingSpinner = () => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-8 flex items-center gap-3">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
      <span className="text-gray-600">Loading...</span>
    </div>
  </div>
);

const ProfilePage = () => {
    const { user, isAuthenticated } = useAuth();
    const { setSelectedGender, setSelectedLocation, setSelectedStudentStream, isAdmin, isGlobalAdmin, adminScope, adminName, adminProfilePicture } = useUserPreferences();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const isOnboarding = searchParams.get('onboarding') === 'true';

    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingRooms, setIsLoadingRooms] = useState(true);
    const [myRooms, setMyRooms] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Room action state
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [selectedRoomForBooking, setSelectedRoomForBooking] = useState(null);
    const [editRoom, setEditRoom] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [addRoomPaymentSuccess, setAddRoomPaymentSuccess] = useState(false);
    const [addRoomSuccessCount, setAddRoomSuccessCount] = useState(1);
    const [subscriptionPayRoom, setSubscriptionPayRoom] = useState(null);
    const [subscriptionPaymentSuccess, setSubscriptionPaymentSuccess] = useState(false);
    const [subscriptionIsRenewal, setSubscriptionIsRenewal] = useState(false);
    const [roomToDelete, setRoomToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [notification, setNotification] = useState({ message: '', type: 'success', isVisible: false, title: '' });

    const [formData, setFormData] = useState({
        displayName: '',
        phone: '',
        college: '',
        city: '',
        email: '',
        gender: '',
        studentStream: ''
    });

    const fetchMyRooms = useCallback(async () => {
        if (!user?.uid) return;
        try {
            const q = query(collection(db, 'rooms'), where('ownerId', '==', user.uid));
            const querySnapshot = await getDocs(q);
            const rooms = [];
            const { releasePlatformRoomOwnership } = await import('../services/roomService.js');

            for (const docSnap of querySnapshot.docs) {
                const data = docSnap.data();

                if (data.addedByAdmin) continue;

                const isLegacyAdminListing =
                    data.verificationStatus === 'verified' &&
                    !data.verifiedBy;

                if (isLegacyAdminListing) {
                    releasePlatformRoomOwnership(docSnap.id).catch((err) =>
                        console.error('Failed to release platform room ownership:', err)
                    );
                    continue;
                }

                rooms.push({ id: docSnap.id, ...data });
            }
            setMyRooms(rooms);
            return rooms;
        } catch (error) {
            console.error('Error fetching user rooms:', error);
            return [];
        } finally {
            setIsLoadingRooms(false);
        }
    }, [user?.uid]);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/'); // Redirect if not logged in
            return;
        }

        const fetchUserProfile = async () => {
            if (user?.uid) {
                try {
                    const userDocRef = doc(db, 'users', user.uid);
                    const userDoc = await getDoc(userDocRef);

                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        setFormData({
                            displayName: data.displayName || user.displayName || '',
                            email: user.email || '',
                            phone: data.phone || '',
                            college: data.college || '',
                            city: data.city || '',
                            gender: data.gender || '',
                            studentStream: data.studentStream || ''
                        });
                        // Sync gender + location with UserPreferences for room filtering
                        if (data.gender) {
                            setSelectedGender(data.gender);
                        }
                        if (data.studentStream) {
                            setSelectedStudentStream(data.studentStream);
                        }
                        if (data.city && data.college) {
                            setSelectedLocation({ city: data.city, college: data.college });
                        }
                    } else {
                        // Initialize with auth data
                        setFormData({
                            displayName: user.displayName || '',
                            email: user.email || '',
                            phone: '',
                            college: '',
                            city: '',
                            gender: '',
                            studentStream: ''
                        });
                    }
                } catch (error) {
                    console.error("Error fetching profile:", error);
                } finally {
                    setIsLoading(false);
                }
            }
        };

        fetchUserProfile();
        setIsLoadingRooms(true);
        fetchMyRooms();
    }, [user, isAuthenticated, navigate, fetchMyRooms, setSelectedGender]);

    useEffect(() => {
        const checkPaymentRedirect = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const paymentStatusParam = urlParams.get('payment_status');
            const orderIdParam = urlParams.get('order_id');

            if (paymentStatusParam !== 'check' || !orderIdParam) return;

            window.history.replaceState({}, document.title, window.location.pathname);

            setNotification({
                message: 'Verifying subscription payment with Cashfree...',
                type: 'info',
                isVisible: true,
                title: 'Verifying Payment'
            });

            try {
                const result = await verifyPayment(orderIdParam);

                if (result.success) {
                    const refreshedRooms = await fetchMyRooms();

                    const flow = getPaymentFlow();
                    const onPaymentPath = flow?.path === window.location.pathname;

                    if (onPaymentPath && flow?.type === 'subscription') {
                        clearPaymentFlow();
                        const updatedRoom = refreshedRooms.find((r) => r.id === flow.roomId);
                        setSubscriptionPayRoom(
                            updatedRoom || {
                                id: flow.roomId,
                                title: flow.title,
                                roomType: flow.roomType
                            }
                        );
                        setSubscriptionPaymentSuccess(true);
                        setSubscriptionIsRenewal(false);
                        setNotification({ message: '', type: 'success', isVisible: false, title: '' });
                    } else if (onPaymentPath && flow?.type === 'add_room') {
                        clearPaymentFlow();
                        setAddRoomSuccessCount(flow.roomCount || 1);
                        setAddRoomPaymentSuccess(true);
                        setShowAddForm(true);
                        setNotification({ message: '', type: 'success', isVisible: false, title: '' });
                    } else {
                        setNotification({
                            message: 'Your subscription is now active! The listing is visible in My Rooms.',
                            type: 'success',
                            isVisible: true,
                            title: 'Payment Successful!'
                        });
                    }
                } else {
                    setNotification({
                        message: `Payment not completed. Status: ${result.orderStatus || 'Pending'}`,
                        type: 'warning',
                        isVisible: true,
                        title: 'Payment Pending'
                    });
                }
            } catch (error) {
                console.error('Error verifying payment redirect:', error);
                setNotification({
                    message: 'Could not verify payment: ' + error.message,
                    type: 'error',
                    isVisible: true,
                    title: 'Verification Error'
                });
            }
        };

        if (!isLoadingRooms) {
            checkPaymentRedirect();
        }
    }, [isLoadingRooms, fetchMyRooms]);

    const handleInputChange = (field, value) => {
        if (field === 'phone') {
            // Only allow numbers
            const cleanValue = value.replace(/\D/g, '').slice(0, 10);
            setFormData(prev => ({ ...prev, [field]: cleanValue }));
        } else if (field === 'studentStream' || field === 'city') {
            setFormData(prev => ({ ...prev, [field]: value, college: '' }));
        } else {
            setFormData(prev => ({ ...prev, [field]: value }));
        }
        setSaveSuccess(false);
    };

    const collegesForProfile = useMemo(
        () => getCollegesForCity(formData.city, formData.studentStream),
        [formData.city, formData.studentStream]
    );

    // ── Room action handlers ──────────────────────────────────────────────

    const handleViewDetails = useCallback((room) => {
        setSelectedRoom(room);
    }, []);

    const handleBookNow = useCallback((room) => {
        setSelectedRoomForBooking(room);
        setShowBookingModal(true);
    }, []);

    const handleBookingSuccess = useCallback(() => {
        setShowBookingModal(false);
        setSelectedRoomForBooking(null);
        setNotification({
            message: 'Your booking request has been submitted. The owner will contact you soon.',
            type: 'success',
            isVisible: true,
            title: 'Booking Submitted!'
        });
    }, []);

    const handleEditRoom = useCallback((room) => {
        setEditRoom(room);
    }, []);

    const handleAddRoom = useCallback(async (roomData, paymentMethod = 'online') => {
        const isBatch = roomData?.rooms && Array.isArray(roomData.rooms);
        const roomsToAdd = isBatch ? roomData.rooms : [roomData];

        try {
            const { addRoom } = await import('../services/roomService.js');
            const savedRooms = [];

            for (const room of roomsToAdd) {
                const savedRoom = await addRoom(room, user, false);
                savedRooms.push(savedRoom);
            }

            setMyRooms((prev) => [...savedRooms, ...prev]);

            return {
                savedRooms,
                customerName: user?.displayName || 'Nivasi Host',
                customerEmail: user?.email || 'payments@nivasi.space'
            };
        } catch (error) {
            console.error('Error adding room or initiating payment:', error);

            const isDuplicateError = error.message && error.message.includes('already active');

            setNotification({
                message: isDuplicateError ? 'Your room subscription is already active.' : 'Failed to save room: ' + error.message,
                type: isDuplicateError ? 'info' : 'error',
                isVisible: true,
                title: isDuplicateError ? 'Subscription Active' : 'Payment Error'
            });
            throw error;
        }
    }, [user]);

    const handleUpdateRoom = useCallback(async (updatedRoom) => {
        try {
            const { updateRoom } = await import('../services/roomService.js');
            const savedRoom = await updateRoom(updatedRoom.id, updatedRoom);
            setMyRooms(prev => prev.map(r => r.id === savedRoom.id ? { ...r, ...savedRoom } : r));
            setEditRoom(null);
            setNotification({
                message: 'Your room listing has been updated.',
                type: 'success',
                isVisible: true,
                title: 'Room Updated!'
            });
        } catch (error) {
            console.error('Error updating room:', error);
            setMyRooms(prev => prev.map(r => r.id === updatedRoom.id ? { ...r, ...updatedRoom } : r));
            setEditRoom(null);
            setNotification({
                message: 'Changes saved locally. Will sync when connection is restored.',
                type: 'warning',
                isVisible: true,
                title: 'Updated Locally'
            });
        }
    }, []);

    const handleRequestDelete = useCallback((room) => {
        setRoomToDelete(room);
    }, []);

    const handleConfirmDelete = useCallback(async () => {
        if (!roomToDelete || isDeleting) return;
        setIsDeleting(true);
        try {
            const { deleteRoom } = await import('../services/roomService.js');
            if (roomToDelete.id) await deleteRoom(roomToDelete.id);
        } catch (error) {
            console.error('Error deleting room:', error);
        } finally {
            setMyRooms(prev => prev.filter(r => r.id !== roomToDelete.id));
            setIsDeleting(false);
            setRoomToDelete(null);
            setNotification({
                message: 'Your room has been removed from listings.',
                type: 'success',
                isVisible: true,
                title: 'Room Deleted!'
            });
        }
    }, [roomToDelete, isDeleting]);

    const handleToggleHidden = useCallback(async (room) => {
        try {
            const { updateRoom } = await import('../services/roomService.js');
            const updatedRoom = { ...room, hidden: !room.hidden };
            await updateRoom(room.id, updatedRoom);
            setMyRooms(prev => prev.map(r => r.id === room.id ? updatedRoom : r));
            setNotification({
                message: room.hidden ? 'Room is now visible.' : 'Room is now hidden.',
                type: 'success',
                isVisible: true,
                title: room.hidden ? 'Room Unhidden!' : 'Room Hidden!'
            });
        } catch (error) {
            console.error('Error toggling room visibility:', error);
            setMyRooms(prev => prev.map(r => r.id === room.id ? { ...r, hidden: !r.hidden } : r));
        }
    }, []);

    const openSubscriptionPayment = useCallback((room) => {
        const isRenewal =
            room.paymentStatus === 'expired' ||
            (room.paymentStatus === 'paid' &&
                (!isSubscriptionActive(room.subscriptionEnd) || isExpiringSoon(room.subscriptionEnd)));
        setSubscriptionIsRenewal(isRenewal);
        setSubscriptionPaymentSuccess(false);
        setSubscriptionPayRoom(room);
    }, []);

    const handleRenew = useCallback((room) => {
        openSubscriptionPayment(room);
    }, [openSubscriptionPayment]);

    // ─────────────────────────────────────────────────────────────────────────

    const handleLogout = async () => {
        try {
            const { signOut } = await import('../firebase.js');
            const { auth } = await import('../firebase.js');
            await signOut(auth);
            navigate('/');
        } catch (error) {
            console.error("Error logging out:", error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate required fields
        if (!formData.phone || formData.phone.length < 10) {
            alert("Please enter a valid 10-digit phone number");
            return;
        }
        if (!formData.college) {
            alert("Please select your college");
            return;
        }
        if (!formData.city) {
            alert("Please select your city");
            return;
        }
        if (!formData.gender) {
            alert("Please select your gender");
            return;
        }
        if (!formData.studentStream) {
            alert("Please select Engineering Student or Medical Student");
            return;
        }

        setIsSaving(true);
        setSaveSuccess(false);

        try {
            const userDocRef = doc(db, 'users', user.uid);
            await setDoc(userDocRef, {
                displayName: formData.displayName,
                email: formData.email,
                phone: formData.phone,
                college: formData.college,
                city: formData.city,
                gender: formData.gender,
                studentStream: formData.studentStream,
                updatedAt: new Date().toISOString()
            }, { merge: true });

            // Sync gender + location with UserPreferences for room filtering
            setSelectedGender(formData.gender);
            setSelectedStudentStream(formData.studentStream);
            setSelectedLocation({
                city: formData.city,
                college: formData.college
            });

            setSaveSuccess(true);

            // Redirect to home after 1.5 seconds
            setTimeout(() => {
                navigate('/');
            }, 1500);
        } catch (error) {
            console.error("Error saving profile:", error);
            alert("Failed to save profile.");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
            <InAppToast
                message={notification.message}
                type={notification.type}
                isVisible={notification.isVisible}
                title={notification.title}
                onClose={() => setNotification(prev => ({ ...prev, isVisible: false }))}
                duration={4000}
            />
            <div className="max-w-3xl mx-auto">
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    {/* Header Banner */}
                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 sm:px-8 py-8 sm:py-10 text-white">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`bg-white/20 rounded-full backdrop-blur-sm overflow-hidden flex items-center justify-center flex-shrink-0 border-2 border-white/40 shadow-sm ${isAdmin && adminProfilePicture ? 'w-20 h-20 sm:w-28 sm:h-28 p-1' : 'w-16 h-16 sm:w-20 sm:h-20 p-3'}`}>
                                    {isAdmin ? (
                                        adminProfilePicture ? (
                                            <img src={adminProfilePicture} alt="Admin Profile" className="w-full h-full object-cover rounded-full" />
                                        ) : (
                                            <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                                        )
                                    ) : (
                                        <User className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                                    )}
                                </div>
                                <div>
                                    <h1 className="text-2xl sm:text-3xl font-bold">
                                        {isAdmin ? (adminName ? adminName : 'Admin Profile') : (isOnboarding ? 'Complete Your Profile' : 'My Profile')}
                                    </h1>
                                    <p className="text-orange-100 mt-1 text-sm sm:text-base">
                                        {isAdmin ? 'Manage your admin settings' : (isOnboarding ? 'Please fill in your details to continue' : 'Manage your personal information')}
                                    </p>
                                </div>
                            </div>
                            {!isOnboarding && (
                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span className="hidden sm:inline">Logout</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Form Section */}
                    {isAdmin ? (
                        <div className="p-6 sm:p-8 text-center space-y-4">
                            <Shield className="w-16 h-16 text-orange-500 mx-auto" />
                            <h2 className="text-2xl font-bold text-gray-900">Admin Login Active</h2>
                            <p className="text-gray-600">You are logged in as an administrator.</p>
                            
                            <div className="bg-orange-50 rounded-xl p-6 max-w-md mx-auto text-left space-y-4 mt-6 border border-orange-100 shadow-sm">
                                {adminName && (
                                    <div className="flex justify-between items-center border-b border-orange-200 pb-2">
                                        <span className="text-gray-600 font-medium">Name</span>
                                        <span className="text-gray-900 font-semibold">{adminName}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center border-b border-orange-200 pb-2">
                                    <span className="text-gray-600 font-medium">Role</span>
                                    <span className="text-orange-700 font-bold">{isGlobalAdmin ? 'Global Admin' : 'Local Admin'}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-orange-200 pb-2">
                                    <span className="text-gray-600 font-medium">Access Scope</span>
                                    <span className="text-gray-900 font-semibold">{isGlobalAdmin ? 'All Locations' : (adminScope?.city || 'Restricted')}</span>
                                </div>
                                {!isGlobalAdmin && adminScope?.college && (
                                    <div className="flex justify-between items-center pb-2">
                                        <span className="text-gray-600 font-medium">Assigned College</span>
                                        <span className="text-gray-900 font-semibold text-right">{adminScope.college}</span>
                                    </div>
                                )}
                            </div>
                            
                            <div className="pt-6">
                                <p className="text-sm text-gray-500 mb-4">Use the top header navigation to access Booking Management.</p>
                            </div>
                        </div>
                    ) : (
                    <div className="p-6 sm:p-8">
                        <form onSubmit={handleSubmit} className="space-y-6">

                            {/* Success Message */}
                            {saveSuccess && (
                                <div className="bg-green-50 text-green-700 p-4 rounded-lg flex items-center gap-3 border border-green-200 animate-in fade-in slide-in-from-top-2">
                                    <CheckCircle className="w-5 h-5" />
                                    <span>Profile updated successfully! Redirecting to rooms...</span>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                                {/* Full Name */}
                                <div className="space-y-2">
                                    <Label htmlFor="displayName" className="text-gray-700">Full Name</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <Input
                                            id="displayName"
                                            value={formData.displayName}
                                            onChange={(e) => handleInputChange('displayName', e.target.value)}
                                            className="pl-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                                            placeholder="Enter your full name"
                                        />
                                    </div>
                                </div>

                                {/* Email (Read-only) */}
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-gray-700">Email Address</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <Input
                                            id="email"
                                            value={formData.email}
                                            readOnly
                                            className="pl-10 bg-gray-50 text-gray-500 border-gray-200 cursor-not-allowed"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500">Email cannot be changed.</p>
                                </div>

                                {/* Phone Number */}
                                <div className="space-y-2">
                                    <Label htmlFor="phone" className="text-gray-700">Phone Number *</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <Input
                                            id="phone"
                                            value={formData.phone}
                                            onChange={(e) => handleInputChange('phone', e.target.value)}
                                            className="pl-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                                            placeholder="Enter 10-digit number"
                                            type="tel"
                                            maxLength={10}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Gender Selection */}
                                <div className="space-y-2">
                                    <Label htmlFor="gender" className="text-gray-700">Gender *</Label>
                                    <div className="relative">
                                        <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
                                        <select
                                            id="gender"
                                            value={formData.gender}
                                            onChange={(e) => handleInputChange('gender', e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:border-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-opacity-20 outline-none bg-white appearance-none cursor-pointer"
                                            required
                                        >
                                            <option value="">Select Gender</option>
                                            <option value="boy">Boy</option>
                                            <option value="girl">Girl</option>
                                        </select>
                                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Student Stream */}
                                <div className="space-y-2">
                                    <Label htmlFor="studentStream" className="text-gray-700">I am a *</Label>
                                    <div className="relative">
                                        <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
                                        <select
                                            id="studentStream"
                                            value={formData.studentStream}
                                            onChange={(e) => handleInputChange('studentStream', e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:border-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-opacity-20 outline-none bg-white appearance-none cursor-pointer"
                                            required
                                        >
                                            <option value="">Select stream</option>
                                            {STUDENT_STREAMS.map((stream) => (
                                                <option key={stream.value} value={stream.value}>
                                                    {stream.label}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                {/* City Selection */}
                                <div className="space-y-2">
                                    <Label htmlFor="city" className="text-gray-700">City *</Label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
                                        <select
                                            id="city"
                                            value={formData.city}
                                            onChange={(e) => handleInputChange('city', e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:border-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-opacity-20 outline-none bg-white appearance-none cursor-pointer"
                                            required
                                        >
                                            <option value="">Select City</option>
                                            {CITIES.map((city, index) => (
                                                <option key={index} value={city}>
                                                    {city}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                {/* College Dropdown - Full Width */}
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="college" className="text-gray-700">Your College / University *</Label>
                                    <div className="relative">
                                        <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
                                        <select
                                            id="college"
                                            value={formData.college}
                                            onChange={(e) => handleInputChange('college', e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:border-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-opacity-20 outline-none bg-white appearance-none cursor-pointer"
                                            required
                                            disabled={!formData.studentStream || !formData.city}
                                        >
                                            <option value="">
                                                {!formData.studentStream
                                                    ? 'Select stream first'
                                                    : !formData.city
                                                        ? 'Select city first'
                                                        : 'Select your college'}
                                            </option>
                                            {collegesForProfile.map((college, index) => (
                                                <option key={index} value={college}>
                                                    {college}
                                                </option>
                                            ))}
                                            {formData.college && !collegesForProfile.includes(formData.college) && (
                                                <option value={formData.college}>{formData.college}</option>
                                            )}
                                        </select>
                                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-gray-100 flex justify-end">
                                <Button
                                    type="submit"
                                    className="bg-orange-600 hover:bg-orange-700 text-white min-w-[150px]"
                                    disabled={isSaving}
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4 mr-2" />
                                            Save & View Rooms
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                    )}
                </div>

                {/* My Rooms Section */}
                {!isOnboarding && (
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden mt-8 p-6 sm:p-8">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <Building className="w-6 h-6 text-orange-500" />
                                My Rooms
                            </h2>
                            <Button
                                onClick={() => setShowAddForm(true)}
                                className="bg-orange-600 hover:bg-orange-700 text-white w-full sm:w-auto"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Room
                            </Button>
                        </div>
                        {isLoadingRooms ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                            </div>
                        ) : myRooms.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {myRooms.map(room => (
                                    <RoomCard
                                        key={room.id}
                                        room={room}
                                        isOwner={true}
                                        onViewDetails={(r) => handleViewDetails(r)}
                                        onBookNow={(r) => handleBookNow(r)}
                                        onEdit={(r) => handleEditRoom(r)}
                                        onDelete={() => handleRequestDelete(room)}
                                        onToggleHidden={() => handleToggleHidden(room)}
                                        onRenew={(r) => handleRenew(r || room)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <p className="text-gray-500 mb-4">You haven&apos;t uploaded any rooms yet.</p>
                                <Button
                                    onClick={() => setShowAddForm(true)}
                                    className="bg-orange-600 hover:bg-orange-700 text-white"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Your First Room
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {/* ── My Rooms Modals ─────────────────────────────── */}
                {selectedRoom && (
                    <Suspense fallback={<ModalLoadingSpinner />}>
                        <RoomDetailModal
                            room={selectedRoom}
                            onClose={() => setSelectedRoom(null)}
                        />
                    </Suspense>
                )}

                {showBookingModal && selectedRoomForBooking && (
                    <Suspense fallback={<ModalLoadingSpinner />}>
                        <BookingModal
                            room={selectedRoomForBooking}
                            onClose={() => { setShowBookingModal(false); setSelectedRoomForBooking(null); }}
                            onSuccess={handleBookingSuccess}
                        />
                    </Suspense>
                )}

                {subscriptionPayRoom && (
                    <Suspense fallback={<ModalLoadingSpinner />}>
                        <SubscriptionPaymentModal
                            room={subscriptionPayRoom}
                            onClose={() => {
                                setSubscriptionPayRoom(null);
                                setSubscriptionPaymentSuccess(false);
                            }}
                            customerName={user?.displayName || 'Nivasi Host'}
                            customerEmail={user?.email || 'payments@nivasi.space'}
                            paymentSuccess={subscriptionPaymentSuccess}
                            isRenewal={subscriptionIsRenewal}
                            onPaymentDone={() => {
                                setSubscriptionPayRoom(null);
                                setSubscriptionPaymentSuccess(false);
                                fetchMyRooms();
                            }}
                        />
                    </Suspense>
                )}

                {showAddForm && (
                    <Suspense fallback={<ModalLoadingSpinner />}>
                        <AddRoomModal
                            onClose={() => {
                                setShowAddForm(false);
                                setAddRoomPaymentSuccess(false);
                            }}
                            onAddRoom={handleAddRoom}
                            isAdmin={false}
                            paymentSuccess={addRoomPaymentSuccess}
                            successRoomCount={addRoomSuccessCount}
                            onPaymentDone={() => {
                                setShowAddForm(false);
                                setAddRoomPaymentSuccess(false);
                            }}
                        />
                    </Suspense>
                )}

                {editRoom && (
                    <Suspense fallback={<ModalLoadingSpinner />}>
                        <AddRoomModal
                            initialRoom={editRoom}
                            isEdit
                            onClose={() => setEditRoom(null)}
                            onAddRoom={handleUpdateRoom}
                            isAdmin={false}
                        />
                    </Suspense>
                )}

                {roomToDelete && (
                    <ConfirmationModal
                        isOpen={!!roomToDelete}
                        title="Delete Room"
                        message={`Are you sure you want to delete "${roomToDelete.title}"? This action cannot be undone.`}
                        confirmText="Delete"
                        onConfirm={handleConfirmDelete}
                        onClose={() => setRoomToDelete(null)}
                        type="danger"
                        isLoading={isDeleting}
                    />
                )}

                {/* ────────────────────────────────────────────────── */}

                {/* Admin Login Button */}
                {!isAdmin && (
                    <div className="mt-8 flex justify-center">
                        <Button 
                            variant="outline" 
                            className="text-gray-500 hover:text-orange-600 border-gray-200 hover:bg-orange-50"
                            onClick={() => navigate('/admin/login')}
                        >
                            <Shield className="w-4 h-4 mr-2" />
                            Admin Login
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfilePage;
