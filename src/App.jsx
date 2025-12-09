import { useState, useEffect, useMemo, lazy, Suspense, useCallback } from 'react';
import { Phone, Shield, LogOut, Settings, Search, Users, User, Calendar, X, Filter, TrendingUp, Home, Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import RoomCard from './components/RoomCard.jsx';
import Logo from './components/Logo.jsx';
import LanguageSelector from './components/LanguageSelector.jsx';
import TermsAndConditionsModal from './components/TermsAndConditionsModal.jsx';
import Notification from './components/Notification.jsx';
import LoginScreen from './components/LoginScreen.jsx';

import { useLanguage } from './contexts/LanguageContext.jsx';
import { useAuth } from './contexts/AuthContext.jsx';
import './App.css';

// Lazy load modal components to reduce initial bundle size
const RoomDetailModal = lazy(() => import('./components/RoomDetailModal.jsx'));
const MessCard = lazy(() => import('./components/MessCard.jsx'));
const AddRoomModal = lazy(() => import('./components/AddRoomModal.jsx'));
const AdminLoginModal = lazy(() => import('./components/AdminLoginModal.jsx'));
const LocationSelectionModal = lazy(() => import('./components/LocationSelectionModal.jsx'));
const GenderSelectionModal = lazy(() => import('./components/GenderSelectionModal.jsx'));
const BookingModal = lazy(() => import('./components/BookingModal.jsx'));
const BookingManagementModal = lazy(() => import('./components/BookingManagementModal.jsx'));
const FeatureFilterModal = lazy(() => import('./components/FeatureFilterModal.jsx'));
const UserStatisticsModal = lazy(() => import('./components/UserStatisticsModal.jsx'));

// Loading component for lazy-loaded modals
const ModalLoadingSpinner = () => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-8 flex items-center gap-3">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
      <span className="text-gray-600">Loading...</span>
    </div>
  </div>
);

function App() {
  const { t, currentLanguage } = useLanguage();
  const { user, loading, logout, isAuthenticated } = useAuth();
  
  // Debug logging for iOS authentication issues
  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      console.log('App: iOS Device - Auth State:', {
        user: user ? 'exists' : 'null',
        loading,
        isAuthenticated,
        userEmail: user?.email,
        userUID: user?.uid
      });
    }
  }, [user, loading, isAuthenticated]);
  
  const [rooms, setRooms] = useState([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editRoom, setEditRoom] = useState(null);
  const [selectedGender, setSelectedGender] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showLocationSelection, setShowLocationSelection] = useState(false);
  const [showGenderSelection, setShowGenderSelection] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(true);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedRoomForBooking, setSelectedRoomForBooking] = useState(null);
  const [showBookingManagement, setShowBookingManagement] = useState(false);
  const [showUserStatistics, setShowUserStatistics] = useState(false);
  const [notification, setNotification] = useState({ message: '', type: 'success', isVisible: false });

  const [showContactPopup, setShowContactPopup] = useState(false);
  const [isWebViewApp, setIsWebViewApp] = useState(false);
  const [showFeatureFilter, setShowFeatureFilter] = useState(false);
  const [featureFilters, setFeatureFilters] = useState({});
  const [activeSection, setActiveSection] = useState('rooms'); // 'rooms' | 'mess'
  const [messItems, setMessItems] = useState([]);
  
  // Load rooms data dynamically
  useEffect(() => {
    const loadRooms = async () => {
      try {
        const { sampleRooms, getTranslatedRooms } = await import('./data/rooms.js');
        const translatedRooms = getTranslatedRooms(currentLanguage);
        console.log('Loaded rooms:', translatedRooms.length);
        console.log('All room IDs:', translatedRooms.map(r => r.id));
        console.log('Room 31:', translatedRooms.find(r => r.id === 31));
        console.log('Rooms with IDs 28, 29, and 31:', translatedRooms.filter(r => r.id === 28 || r.id === 29 || r.id === 31));
        setRooms(translatedRooms);
      } catch (error) {
        console.error('Failed to load rooms data:', error);
        setRooms([]);
      } finally {
        setIsLoadingRooms(false);
      }
    };
    
    loadRooms();
  }, [currentLanguage]);

  // Load mess data lazily when selected first time
  useEffect(() => {
    const loadMess = async () => {
      try {
        const { getMess } = await import('./data/mess.js');
        const items = getMess();
        setMessItems(items);
      } catch (error) {
        console.error('Failed to load mess data:', error);
        setMessItems([]);
      }
    };

    if (activeSection === 'mess' && messItems.length === 0) {
      loadMess();
    }
  }, [activeSection, messItems.length]);

  // Room type categories - use useMemo to update when language changes
  const categories = useMemo(() => [
    { key: 'All', label: t('all') },
    { key: 'Single Room', label: t('singleRoom') },
    { key: 'Cot Basis', label: t('cotBasis') },
    { key: '1 RK', label: t('oneRK') },
    { key: '1 BHK', label: t('oneBHK') },
    { key: '2 BHK', label: t('twoBHK') }
  ], [t]);

  // Helper function to get the original English key for a category
  const getCategoryKey = useCallback((categoryKey) => {
    const categoryMap = {
      'All': 'All',
      'Single Room': 'Single Room',
      'Cot Basis': 'Cot Basis',
      '1 RK': '1 RK',
      '1 BHK': '1 BHK',
      '2 BHK': '2 BHK'
    };
    return categoryMap[categoryKey] || categoryKey;
  }, []);

  // Helper function to check if a room matches a category (handles both English and translated values)
  const roomMatchesCategory = useCallback((room, category) => {
    if (category === 'All') return true;
    
    const originalCategory = getCategoryKey(category);
    
    // Map category keys to translation keys
    const categoryTranslationMap = {
      'Single Room': 'singleRoom',
      'Cot Basis': 'cotBasis',
      '1 RK': 'oneRK',
      '1 BHK': 'oneBHK',
      '2 BHK': 'twoBHK'
    };
    
    const translationKey = categoryTranslationMap[category];
    const translatedCategory = translationKey ? t(translationKey) : category;
    
    return (room.roomType === originalCategory || room.roomType === translatedCategory ||
            room.rooms === originalCategory || room.rooms === translatedCategory);
  }, [t, getCategoryKey]);

  // Enhanced filtering with memoization
  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      const matchesGender = selectedGender ? 
        (selectedGender === 'boy' ? (room.gender === 'boy' || room.gender === 'boys') : 
         selectedGender === 'girl' ? (room.gender === 'girl' || room.gender === 'girls') : 
         room.gender === selectedGender) 
        : true;
      const matchesCategory = roomMatchesCategory(room, category);
      const matchesSearch = room.title && room.title.toLowerCase().includes(search.toLowerCase());
      
      // Feature filtering
      const matchesFeatures = Object.keys(featureFilters).length === 0 || 
        Object.entries(featureFilters).every(([feature, isSelected]) => {
          if (!isSelected) return true; // Skip unselected features
          return room.features && room.features.some(roomFeature => 
            roomFeature.toLowerCase().includes(feature.toLowerCase())
          );
        });
      
      return matchesGender && matchesCategory && matchesSearch && matchesFeatures;
    });
  }, [rooms, selectedGender, category, search, featureFilters, roomMatchesCategory]);

  const handleViewDetails = useCallback((room) => {
    setSelectedRoom(room);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedRoom(null);
  }, []);

  const handleShowAddForm = useCallback(() => {
    if (isAdmin) {
      setShowAddForm(true);
    } else {
      setShowAdminLogin(true);
    }
  }, [isAdmin]);

  const handleAdminLogin = useCallback(() => {
    setIsAdmin(true);
    setShowAdminLogin(false);
    setShowAddForm(true);
  }, []);

  const handleAdminLogout = useCallback(() => {
    setIsAdmin(false);
    setShowAddForm(false);
  }, []);

  const handleAddRoom = useCallback((newRoom) => {
    setRooms(prev => [newRoom, ...prev]);
    setShowAddForm(false);
  }, []);

  const handleContactUs = useCallback(() => {
    setShowContactPopup(true);
  }, []);

  const handleShowFeatureFilter = useCallback(() => {
    setShowFeatureFilter(true);
  }, []);

  const handleApplyFeatureFilters = useCallback((filters) => {
    setFeatureFilters(filters);
  }, []);

  const handleClearFeatureFilters = useCallback(() => {
    setFeatureFilters({});
  }, []);

  // Detect if running in web view app
  useEffect(() => {
    const detectWebView = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isWebView = userAgent.includes('wv') || // Android WebView
                       userAgent.includes('mobile') && userAgent.includes('safari') && !userAgent.includes('chrome') || // iOS WebView
                       userAgent.includes('nivasi') || // Custom web view identifier
                       window.ReactNativeWebView || // React Native WebView
                       window.webkit && window.webkit.messageHandlers; // iOS WKWebView
      
      setIsWebViewApp(isWebView);
    };

    detectWebView();
  }, []);

  const handleEditRoom = useCallback((room) => {
    setEditRoom(room);
  }, []);

  const handleUpdateRoom = useCallback((updatedRoom) => {
    setRooms(prev => prev.map(r => r.id === updatedRoom.id ? updatedRoom : r));
    setEditRoom(null);
  }, []);

  const handleTermsAccept = useCallback(() => {
    setHasAcceptedTerms(true);
    setShowTermsModal(false);
    setShowLocationSelection(true);
  }, []);

  const handleTermsDecline = useCallback(() => {
    setShowTermsModal(false);
    // User declined terms, could redirect to logout or show message
  }, []);

  const handleLocationSelect = useCallback((location) => {
    setSelectedLocation(location);
    setShowLocationSelection(false);
    setShowGenderSelection(true);
  }, []);

  const handleGenderSelect = useCallback(async (gender) => {
    setSelectedGender(gender);
    setShowGenderSelection(false);
    setIsLoading(true);
    
    try {
      // Save user to Firebase with both location and gender
      const { saveUserOnGenderSelection } = await import('./services/userService.js');
      await saveUserOnGenderSelection(gender, {
        city: selectedLocation?.city,
        college: selectedLocation?.college
      });
    } catch (error) {
      console.error('Error saving user data:', error);
      // Show notification for error
      setNotification({
        message: 'Failed to save your selection. Please try again.',
        type: 'error',
        isVisible: true
      });
    }
    
    // Simulate loading for better UX
    setTimeout(() => setIsLoading(false), 500);
  }, [selectedLocation]);

  const handleChangeGender = useCallback(() => {
    setShowGenderSelection(true);
  }, []);

  const handleChangeLocation = useCallback(() => {
    setShowLocationSelection(true);
  }, []);

  const handleBookNow = useCallback((room) => {
    setSelectedRoomForBooking(room);
    setShowBookingModal(true);
  }, []);

  const handleBookingSuccess = useCallback((booking) => {
    console.log('Booking submitted successfully:', booking);
    setNotification({
      message: t('bookingSubmittedMessage') || 'Your booking has been submitted successfully!',
      type: 'success',
      isVisible: true
    });
  }, [t]);

  const handleShowBookingManagement = useCallback(() => {
    setShowBookingManagement(true);
  }, []);

  const handleShowUserStatistics = useCallback(() => {
    setShowUserStatistics(true);
  }, []);

  // Show loading screen while auth is initializing
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    // For iOS devices, add additional check to prevent showing login screen after redirect
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    // On iOS, be more careful about showing login screen
    if (isIOS) {
      // Check if we have a user object or if we're still processing authentication
      if (user === null && loading === false && !isAuthenticated) {
        console.log('App: iOS - Showing login screen (no user, not loading, not authenticated)');
        return <LoginScreen onLoginSuccess={() => {}} />;
      } else if (user || loading) {
        console.log('App: iOS - User exists or still loading, not showing login screen');
        // Don't show login screen if we have a user or are still loading
        // Continue to the main app
      } else {
        // If we reach here on iOS, show login screen as fallback
        console.log('App: iOS - Fallback: showing login screen');
        return <LoginScreen onLoginSuccess={() => {}} />;
      }
    } else {
      // For non-iOS devices, use the standard check
      return <LoginScreen onLoginSuccess={() => {}} />;
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100">
      {/* Notification */}
      <Notification
        message={notification.message}
        type={notification.type}
        isVisible={notification.isVisible}
        onClose={() => setNotification(prev => ({ ...prev, isVisible: false }))}
      />
      {/* Terms and Conditions Modal */}
      <TermsAndConditionsModal
        isOpen={showTermsModal}
        onAccept={handleTermsAccept}
        onDecline={handleTermsDecline}
        t={t}
      />
      
      {/* Compact Header */}
      <header className="header-gradient text-white shadow-lg">
        <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3">
                              {/* Mobile Layout - Optimized */}
                <div className="sm:hidden">
            {/* Top Row - Logo and Title */}
            <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Logo className="bg-white/20 backdrop-blur-sm flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                  <h1 className="text-base font-bold text-white leading-tight truncate">
                          {t('title')}
                        </h1>
                        <p className="text-white text-xs opacity-90 truncate">
                          {t('tagline')}
                        </p>
                      </div>
                    </div>
                  </div>

            {/* Middle Row - Language and Location/Gender Buttons */}
            <div className="flex items-center gap-1 mb-2">
                      <LanguageSelector />
              <Button
                onClick={handleChangeLocation}
                variant="outline"
                size="sm"
                className="bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm text-[10px] px-1.5 py-0.5 min-w-0 flex-shrink-0"
              >
                <Settings className="w-2.5 h-2.5 mr-0.5 flex-shrink-0" />
                <span>{selectedLocation ? 'Change Location' : 'Location'}</span>
              </Button>
              <Button
                onClick={handleChangeGender}
                variant="outline"
                size="sm"
                className="bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm text-[10px] px-1.5 py-0.5 min-w-0 flex-shrink-0"
              >
                <Settings className="w-2.5 h-2.5 mr-0.5 flex-shrink-0" />
                <span>{selectedGender ? 'Change Gender' : 'Gender'}</span>
              </Button>
                  </div>

            {/* Bottom Row - Contact Button */}
                    <Button
                      onClick={handleContactUs}
                      size="sm"
                      className="btn-primary hover-lift w-full"
                    >
                      <Phone className="w-4 h-4" />
                      For Room Registration Contact Us
                    </Button>
                </div>

              {/* Desktop Layout */}
              <div className="hidden sm:flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center relative z-10 w-full">
                <div className="flex flex-col xs:flex-row xs:items-center gap-2 sm:gap-4 w-full">
                  <div className="flex items-center gap-3 mx-auto sm:mx-0">
                    <Logo className="bg-white/20 backdrop-blur-sm" />
                    <div className="text-center sm:text-left">
                      <h1 className="text-2xl xs:text-3xl font-bold text-white leading-tight">
                        {t('title')}
                      </h1>
                      <p className="text-white text-sm flex flex-wrap justify-center sm:justify-start items-center gap-1">
                        {t('tagline')}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                  <LanguageSelector />
                  {selectedLocation && (
                    <Button
                      onClick={handleChangeLocation}
                      variant="outline"
                      className="w-full sm:w-auto bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm"
                    >
                      <Settings className="w-4 h-4" />
                      Change Location
                    </Button>
                  )}
                  {selectedGender && (
                    <Button
                      onClick={handleChangeGender}
                      variant="outline"
                      className="w-full sm:w-auto bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm"
                    >
                      <Settings className="w-4 h-4" />
                      Change Gender
                    </Button>
                  )}
                  {isAdmin && (
                    <>
                      <div className="status-badge status-admin animate-fade-scale w-full sm:w-auto text-center">
                        <Shield className="w-4 h-4" />
                        {t('adminMode')}
                      </div>
                      <Button
                        variant="outline"
                        onClick={handleShowBookingManagement}
                        className="w-full sm:w-auto bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm"
                      >
                        <Calendar className="w-4 h-4" />
                        {t('manageBookings') || 'Bookings'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleShowUserStatistics}
                        className="w-full sm:w-auto bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm"
                      >
                        <TrendingUp className="w-4 h-4" />
                        User Stats
                      </Button>
                    </>
                  )}
                  
                  <Button
                    onClick={handleContactUs}
                    className="w-full sm:w-auto btn-primary hover-lift"
                  >
                    <Phone className="w-4 h-4" />
                    For Room Registration Contact Us
                  </Button>
                  

                  
                  {/* Logout Button */}
                  <Button
                    variant="outline"
                    onClick={logout}
                    className="w-full sm:w-auto bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm"
                  >
                    <LogOut className="w-4 h-4" />
                    {t('logout')}
                  </Button>
                  
                  {isAdmin && (
                    <Button
                      variant="outline"
                      onClick={handleAdminLogout}
                      className="w-full sm:w-auto bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm"
                    >
                      <Shield className="w-4 h-4" />
                      {t('adminLogout')}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </header>

        {/* Enhanced Main Content */}
        <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Section Toggle - Below Header, Above Categories */}
        <div className="flex items-center justify-center mb-4 animate-slide-up px-2">
          <div className="inline-flex w-full max-w-md items-center gap-1 bg-white border border-orange-300 rounded-full shadow-sm overflow-hidden">
            <span className="hidden md:flex items-center gap-1 pl-3 pr-2 text-xs font-medium text-orange-700">
              <Search className="w-3.5 h-3.5" />
              Searching for
            </span>
            <button
              role="tab"
              aria-selected={activeSection==='rooms'}
              className={`group flex-1 justify-center flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                activeSection==='rooms'
                  ? 'bg-orange-600 text-white shadow-inner'
                  : 'text-orange-800 hover:bg-orange-50'
              }`}
              onClick={() => setActiveSection('rooms')}
            >
              <Home className={`w-4 h-4 ${activeSection==='rooms' ? 'text-white' : 'text-orange-600'}`} />
              Rooms
            </button>
            <button
              role="tab"
              aria-selected={activeSection==='mess'}
              className={`group flex-1 justify-center flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                activeSection==='mess'
                  ? 'bg-orange-600 text-white shadow-inner'
                  : 'text-orange-800 hover:bg-orange-50'
              }`}
              onClick={() => setActiveSection('mess')}
            >
              <Utensils className={`w-4 h-4 ${activeSection==='mess' ? 'text-white' : 'text-orange-600'}`} />
              Mess
            </button>
          </div>
        </div>

        {/* Categories Bar and Search Bar - only for Rooms */}
        {activeSection === 'rooms' && (
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4 animate-slide-up">
            <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map(cat => (
                <button
                  key={cat.key}
                  className={`px-3 sm:px-4 py-2 rounded-full border transition-all text-xs sm:text-sm font-semibold whitespace-nowrap flex-shrink-0 ${category === cat.key ? 'bg-orange-800 text-white border-orange-800 shadow-lg' : 'bg-white text-orange-700 border-orange-400 hover:bg-orange-50 hover:text-orange-800'}`}
                  onClick={() => setCategory(cat.key)}
                  aria-pressed={category === cat.key}
                >
                  {cat.label}
                </button>
              ))}
              
              {/* Feature Filter Button */}
              <button
                className={`px-3 sm:px-4 py-2 rounded-full border transition-all text-xs sm:text-sm font-semibold whitespace-nowrap flex-shrink-0 flex items-center gap-2 ${
                  Object.keys(featureFilters).length > 0 
                    ? 'bg-orange-800 text-white border-orange-800 shadow-lg' 
                    : 'bg-white text-orange-700 border-orange-400 hover:bg-orange-50 hover:text-orange-800'
                }`}
                onClick={handleShowFeatureFilter}
              >
                <Filter className="w-4 h-4" />
                {t('filterByFeatures') || 'Filter'}
                {Object.keys(featureFilters).length > 0 && (
                  <span className="bg-white text-orange-800 text-xs px-1.5 py-0.5 rounded-full">
                    {Object.values(featureFilters).filter(Boolean).length}
                  </span>
                )}
              </button>
              
              {/* Clear Filters Button */}
              {Object.keys(featureFilters).length > 0 && (
                <button
                  className="px-3 sm:px-4 py-2 rounded-full border border-red-400 bg-white text-red-600 hover:bg-red-50 hover:text-red-700 transition-all text-xs sm:text-sm font-semibold whitespace-nowrap flex-shrink-0"
                  onClick={handleClearFeatureFilters}
                >
                  {t('clearAll') || 'Clear'}
                </button>
              )}
            </div>
          </div>
        )}



        {/* Section Heading */}
        <div className="mb-8 text-center animate-slide-up">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold title-gradient mb-3">
            {activeSection === 'rooms' ? t('availableRooms') : 'Available Mess Options'}
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-2 px-4">
            {activeSection === 'rooms' ? t('poweredBy') : 'Powered by Nivasi.space'}
          </p>
          <div className="w-16 sm:w-24 h-1 bg-gradient-to-r from-purple-400 to-pink-400 mx-auto mt-4 rounded-full"></div>
        </div>

        {/* Grid */}
        {isLoading || isLoadingRooms ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            <span className="ml-3 text-gray-600">{activeSection==='rooms' ? t('loadingRooms') : 'Loading mess options...'}</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {activeSection === 'rooms' ? (
              filteredRooms.map((room, index) => (
                <div 
                  key={room.id} 
                  className="animate-slide-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <RoomCard
                    room={room}
                    onViewDetails={handleViewDetails}
                    isAdmin={isAdmin}
                    onEdit={handleEditRoom}
                    onBookNow={handleBookNow}
                    isFirst={index < 3}
                  />
                </div>
              ))
            ) : (
              messItems.map((mess, index) => (
                <div
                  key={mess.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <Suspense fallback={<ModalLoadingSpinner />}>
                    <MessCard mess={mess} isFirst={index < 3} />
                  </Suspense>
                </div>
              ))
            )}
          </div>
        )}

        {/* Empty State */}
        {filteredRooms.length === 0 && selectedGender && (
          <div className="text-center py-16 animate-fade-scale">
            <div className="w-28 h-28 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <img src="/logo.svg" alt="Nivasi.space Logo" className="w-16 h-16 object-contain" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {t('noRoomsForGender')} {selectedGender === 'boy' ? t('boys') : t('girls')}
            </h3>
            <p className="text-gray-600 mb-6">
              {t('beFirstToAdd')} {selectedGender === 'boy' ? t('boys') : t('girls')} {t('onNivase')}
            </p>
            <Button
              onClick={handleContactUs}
              className="btn-primary"
            >
              <Phone className="w-4 h-4 mr-2" />
              {t('contactUs')}
            </Button>
          </div>
        )}

        {/* Empty State - No gender selected */}
        {filteredRooms.length === 0 && !selectedGender && (
          <div className="text-center py-16 animate-fade-scale">
            <div className="w-28 h-28 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <img src="/logo.svg" alt="Nivasi.space Logo" className="w-16 h-16 object-contain" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('welcomeToNivase')}</h3>
            <p className="text-gray-600 mb-6">{t('collegeRoomRental')} - {t('beFirstToAddGeneral')}</p>
            <Button
              onClick={handleContactUs}
              className="btn-primary"
            >
              <Phone className="w-4 h-4 mr-2" />
              {t('contactUs')}
            </Button>
          </div>
        )}

        {/* About Us Section */}
        <section className="about-us-section my-20 max-w-4xl mx-auto text-center animate-fade-scale">
          <div className="bg-white/90 rounded-2xl shadow-xl p-8 border border-orange-100">
            <h2 className="text-4xl font-extrabold mb-6 text-orange-600 tracking-tight flex items-center justify-center gap-3">
              <span>{t('aboutUs')}</span>
              <span role="img" aria-label="team">👥</span>
            </h2>
            <p className="text-gray-700 text-lg mb-10 max-w-2xl mx-auto">{t('aboutUsDescription')}</p>
            <div className="grid md:grid-cols-2 gap-8 mt-10">
              <div className="bg-gradient-to-br from-orange-100 to-white rounded-xl p-6 shadow flex flex-col items-center">
                <h3 className="text-2xl font-bold mb-2 text-orange-700 flex items-center gap-2"><span role="img" aria-label="target">🎯</span> {t('ourMission')}</h3>
                <p className="text-gray-700">{t('missionDescription')}</p>
              </div>
              <div className="bg-gradient-to-br from-orange-100 to-white rounded-xl p-6 shadow flex flex-col items-center">
                <h3 className="text-2xl font-bold mb-2 text-orange-700 flex items-center gap-2"><span role="img" aria-label="vision">🌟</span> {t('ourVision')}</h3>
                <p className="text-gray-700">{t('visionDescription')}</p>
              </div>
            </div>
          </div>
        </section>

        </main>

        {/* Professional Footer */}
        <footer className="bg-gradient-to-r from-slate-800 to-slate-900 text-white mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              
              {/* Branding and Description */}
              <div className="lg:col-span-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white text-2xl">🏠</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">NIVASI.SPACE</h3>
                    <p className="text-orange-300 text-sm font-medium"></p>
                  </div>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {t('trustedPlatform')}
                </p>
              </div>

              {/* Contact Information */}
              <div>
                <h4 className="text-lg font-semibold mb-4 text-white">{t('contact')}</h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center mt-0.5">
                      <span className="text-white text-xs">📍</span>
                    </div>
                    <p className="text-gray-300 text-sm">
                    {t('collegeAddress')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">📞</span>
                    </div>
                    <p className="text-gray-300 text-sm">+91 7385553529</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✉️</span>
                    </div>
                    <p className="text-gray-300 text-sm">contact@nivasi.space</p>
                  </div>
                </div>
              </div>

              {/* Quick Links */}
              <div>
                <h4 className="text-lg font-semibold mb-4 text-white">{t('quickLinks')}</h4>
                <div className="space-y-2">
                  <a href="#" className="block text-gray-300 hover:text-orange-300 transition-colors text-sm">{t('aboutUs')}</a>
                  <a href="#" className="block text-gray-300 hover:text-orange-300 transition-colors text-sm">{t('privacyPolicy')}</a>
                  <a href="#" className="block text-gray-300 hover:text-orange-300 transition-colors text-sm">{t('termsOfService')}</a>
                  <a href="#" className="block text-gray-300 hover:text-orange-300 transition-colors text-sm">{t('successStories')}</a>
                  <a href="#" className="block text-gray-300 hover:text-orange-300 transition-colors text-sm">{t('contactUs')}</a>
                </div>
              </div>

              {/* Legal Links */}
              <div>
                <h4 className="text-lg font-semibold mb-4 text-white">{t('legal')}</h4>
                <div className="space-y-2">
                  <a href="#" className="block text-gray-300 hover:text-orange-300 transition-colors text-sm">{t('termsConditions')}</a>
                  <a href="#" className="block text-gray-300 hover:text-orange-300 transition-colors text-sm">{t('privacyPolicy')}</a>
                  <a href="#" className="block text-gray-300 hover:text-orange-300 transition-colors text-sm">{t('refundPolicy')}</a>
                  <a href="#" className="block text-gray-300 hover:text-orange-300 transition-colors text-sm">{t('safetyGuidelines')}</a>
                </div>
              </div>
            </div>

            {/* Bottom Section */}
            <div className="border-t border-gray-700 mt-8 pt-8">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                                  <p className="text-gray-400 text-sm">
                  {t('allRightsReserved')}
                </p>
                <p className="text-gray-400 text-sm">
                  {t('designDevelopedBy')} <span className="text-orange-300 font-medium">{t('akashSolutions')}</span>
                </p>
              </div>
            </div>
          </div>
        </footer>

        {/* Location Selection Modal */}
      {showLocationSelection && hasAcceptedTerms && (
        <Suspense fallback={<ModalLoadingSpinner />}>
          <LocationSelectionModal onLocationSelect={handleLocationSelect} />
        </Suspense>
      )}

        {/* Gender Selection Modal */}
      {showGenderSelection && hasAcceptedTerms && (
        <Suspense fallback={<ModalLoadingSpinner />}>
          <GenderSelectionModal onGenderSelect={handleGenderSelect} />
        </Suspense>
      )}

      {/* Room Detail Modal */}
      {selectedRoom && (
        <Suspense fallback={<ModalLoadingSpinner />}>
          <RoomDetailModal
            room={selectedRoom}
            onClose={handleCloseModal}
          />
        </Suspense>
      )}

      {/* Add Room Form Modal */}
      {showAddForm && (
        <Suspense fallback={<ModalLoadingSpinner />}>
          <AddRoomModal
            onClose={() => setShowAddForm(false)}
            onAddRoom={handleAddRoom}
          />
        </Suspense>
      )}

      {/* Edit Room Modal (reuse AddRoomModal) */}
      {editRoom && (
        <Suspense fallback={<ModalLoadingSpinner />}>
          <AddRoomModal
            onClose={() => setEditRoom(null)}
            onAddRoom={handleUpdateRoom}
            initialRoom={editRoom}
            isEdit
          />
        </Suspense>
      )}

      {/* Admin Login Modal */}
      {showAdminLogin && (
        <Suspense fallback={<ModalLoadingSpinner />}>
          <AdminLoginModal
            onClose={() => setShowAdminLogin(false)}
            onAdminLogin={handleAdminLogin}
          />
        </Suspense>
      )}

      {/* Booking Modal */}
      {showBookingModal && selectedRoomForBooking && (
        <Suspense fallback={<ModalLoadingSpinner />}>
          <BookingModal
            isOpen={showBookingModal}
            onClose={() => {
              setShowBookingModal(false);
              setSelectedRoomForBooking(null);
            }}
            room={selectedRoomForBooking}
            onBookingSuccess={handleBookingSuccess}
          />
        </Suspense>
      )}

      {/* Booking Management Modal */}
      {showBookingManagement && (
        <Suspense fallback={<ModalLoadingSpinner />}>
          <BookingManagementModal
            isOpen={showBookingManagement}
            onClose={() => setShowBookingManagement(false)}
          />
        </Suspense>
      )}

      {/* User Statistics Modal */}
      {showUserStatistics && (
        <Suspense fallback={<ModalLoadingSpinner />}>
          <UserStatisticsModal
            onClose={() => setShowUserStatistics(false)}
          />
        </Suspense>
      )}



      {/* Contact Popup Modal */}
      {showContactPopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
                  <Phone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Contact Us
                  </h2>
                  <p className="text-sm text-gray-600">
                    For Room Registration
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowContactPopup(false)}
                className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Contact Information */}
                <div className="space-y-4">
                  {/* Address */}
                  <div className="flex items-start gap-3 p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-orange-800 mb-1">📍 Address</h3>
                      <p className="text-sm text-orange-700 leading-relaxed">
                        Dr. DY Patil Pratishthan's College of Engineering, Salokhenaga, Kolhapur, Maharashtra, 416007 India
                      </p>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center flex-shrink-0">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-blue-800 mb-1">📞 Phone</h3>
                      <a 
                        href="tel:+917385553529"
                        className="text-sm text-blue-700 hover:text-blue-900 transition-colors"
                      >
                        +91 7385553529
                      </a>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-green-800 mb-1">✉️ Email</h3>
                      <a 
                        href="mailto:contact@nivasi.space"
                        className="text-sm text-green-700 hover:text-green-900 transition-colors"
                      >
                        contact@nivasi.space
                      </a>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <Button
                    onClick={() => window.open('tel:+917385553529', '_self')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Call Now
                  </Button>
                  
                  <Button
                    onClick={() => window.open('mailto:contact@nivasi.space', '_self')}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Send Email
                  </Button>
                  
                  <Button
                    onClick={() => setShowContactPopup(false)}
                    variant="outline"
                    className="w-full"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feature Filter Modal */}
      {showFeatureFilter && (
        <Suspense fallback={<ModalLoadingSpinner />}>
          <FeatureFilterModal
            isOpen={showFeatureFilter}
            onClose={() => setShowFeatureFilter(false)}
            onApplyFilters={handleApplyFeatureFilters}
            currentFilters={featureFilters}
          />
        </Suspense>
      )}

      
    </div>
  );
}

export default App;

