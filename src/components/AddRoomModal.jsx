import { useState } from 'react';
import {
  X,
  Upload,
  MapPin,
  Phone,
  DollarSign,
  FileText,
  Check,
  AlertCircle,
  Trash2,
  Locate,
  CreditCard,
  Banknote,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import ConfirmationModal from './ConfirmationModal.jsx';
import { ROOM_TYPE_PRICING, SUBSCRIPTION_DURATION_DAYS, MAX_ROOMS_PER_BATCH, getSubscriptionTotal } from '../utils/subscriptionConfig.js';

// Predefined features list
const AVAILABLE_FEATURES = [
  'Wi-Fi',
  'Hot Water',
  'Parking',
  'Bed/Mattress',
  'Cupboard',
  'Drinking Water',
  'Cooking Allowed',
  'Nearby Mess',
  "Owner's Mess",
  'Terrace Access',
  'CCTV Camera',
  'New Room',
  'Study Table',
  'Shoe Stand',
  'Emergency Light',
  'Parents Allowed',
  'Group Study Allowed',
  'Separate Light Meter',
  'Dressing Table',
  'Water Supply'
];

// Bill inclusion options (mutually exclusive)
const BILL_INCLUSION_OPTIONS = [
  { value: 'lightAndWater', label: 'Including light and water bill' },
  { value: 'waterOnly', label: 'Water bill only (light separate)' },
  { value: 'lightOnly', label: 'Light bill only (water separate)' },
  { value: 'none', label: 'Neither (light and water extra)' }
];

// Room type options (matches rooms.js and App categories)
const ROOM_TYPE_OPTIONS = ['Single Room', 'Cot Basis', '1 RK', '1 BHK', '2 BHK'];

// Conditions checkboxes (from common patterns in room descriptions)
const CONDITION_OPTIONS = [
  { key: 'oneYearAgreement', label: '1 Year Agreement' },
  { key: 'rent1stTo10th', label: 'Rent between 1st–10th of month' },
  { key: 'rent1stTo5th', label: 'Rent between 1st–5th of month' },
  { key: 'rent25thTo5th', label: 'Rent between 25th–5th of month' },
  { key: 'after10pmNoEntry', label: 'After 10pm no entry' },
  { key: 'after11pmNoEntry', label: 'After 11pm no entry' },
  { key: 'friendsNotAllowed', label: 'Friends not allowed in room' },
  { key: 'parentsAllowedStay', label: 'Parents allowed for stay' },
  { key: 'aadharPhotoParentMandatory', label: 'Aadhar, photo & parent phone mandatory' },
  { key: 'selfCleaning', label: 'Self cleaning required' },
  { key: 'selfCookingNotAllowed', label: 'Self cooking not allowed' },
  { key: 'noDrinkingSmoking', label: 'No drinking/smoking' },
  { key: 'goodBehaviour', label: 'Good behaviour required' },
  { key: 'garbageByStudents', label: 'Garbage management by students' },
  { key: 'groupStudyNotAllowed', label: 'Group study not allowed' },
  { key: 'entryGateLocked', label: 'Entry gate locked after hours' }
];

const AddRoomModal = ({ onClose, onAddRoom, initialRoom, isEdit, isAdmin, canCollectCash }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState(() => initialRoom ? {
    title: initialRoom.title || '',
    rent: initialRoom.rent || '',
    contact: initialRoom.contact || '',
    address: initialRoom.address || '',
    location: initialRoom.location || '',
    mapLink: initialRoom.mapLink || '',
    city: initialRoom.city || '',
    college: initialRoom.college || '',
    note: initialRoom.note || '',
    description: initialRoom.description || '',
    selectedFeatures: initialRoom.features || [],
    gender: initialRoom.gender || 'boy',
    images: initialRoom.images || [],
    imagePaths: Array.isArray(initialRoom.images) ? initialRoom.images.join('\n') : '',
    billInclusion: initialRoom.billInclusion || 'lightAndWater',
    roomType: initialRoom.roomType || initialRoom.rooms || '1 RK',
    roomCount: '1',
    pricingType: initialRoom.pricingType || 'perStudent',
    selectedConditions: initialRoom.selectedConditions || [],
    advance: initialRoom.advance ?? '',
    deposit: initialRoom.deposit ?? ''
  } : {
    title: '',
    rent: '',
    contact: '',
    address: '',
    location: '',
    mapLink: '',
    city: '',
    college: '',
    note: '',
    description: '',
    selectedFeatures: [],
    gender: 'boy',
    images: [],
    imagePaths: '',
    billInclusion: 'lightAndWater',
    roomType: '1 RK',
    roomCount: '1',
    pricingType: 'perStudent',
    selectedConditions: [],
    advance: '',
    deposit: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [mapLinkLoading, setMapLinkLoading] = useState(false);
  const [mapLinkError, setMapLinkError] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingRoomData, setPendingRoomData] = useState(null);
  const [step, setStep] = useState('form');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (name === 'mapLink' && mapLinkError) setMapLinkError('');
  };

  const handleFeatureToggle = (feature) => {
    setFormData(prev => {
      const isSelected = prev.selectedFeatures.includes(feature);
      return {
        ...prev,
        selectedFeatures: isSelected
          ? prev.selectedFeatures.filter(f => f !== feature)
          : [...prev.selectedFeatures, feature]
      };
    });
  };

  const handleConditionToggle = (key) => {
    setFormData(prev => {
      const isSelected = prev.selectedConditions.includes(key);
      return {
        ...prev,
        selectedConditions: isSelected
          ? prev.selectedConditions.filter(k => k !== key)
          : [...prev.selectedConditions, key]
      };
    });
  };

  const handleImagePathsChange = (e) => {
    const value = e.target.value;
    const paths = value
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);
    setFormData(prev => ({
      ...prev,
      imagePaths: value,
      images: paths
    }));

    if (errors.images && paths.length > 0) {
      setErrors(prev => ({ ...prev, images: '' }));
    }
  };

  const handleFetchMyLocation = () => {
    setMapLinkError('');
    if (!navigator.geolocation) {
      setMapLinkError('Geolocation is not supported by your browser.');
      return;
    }
    setMapLinkLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
        setFormData(prev => ({ ...prev, mapLink: url }));
        if (errors.mapLink) setErrors(prev => ({ ...prev, mapLink: '' }));
        setMapLinkLoading(false);
      },
      (err) => {
        const msg = err.code === 1 ? 'Location permission denied.'
          : err.code === 2 ? 'Location unavailable.'
            : err.code === 3 ? 'Request timed out.'
              : 'Could not get your location.';
        setMapLinkError(msg);
        setMapLinkLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = t('roomTitleRequired');
    }

    if (!formData.rent || isNaN(formData.rent) || formData.rent <= 0) {
      newErrors.rent = t('validRentAmount');
    }

    if (!formData.contact.trim()) {
      newErrors.contact = t('contactRequired');
    } else if (!/^[\+]?[0-9\s\-\(\)]{10,}$/.test(formData.contact)) {
      newErrors.contact = t('validContactNumber');
    }

    if (!formData.address.trim()) {
      newErrors.address = t('addressRequired');
    }

    if (!formData.location.trim()) {
      newErrors.location = t('locationRequired');
    }

    if (!formData.mapLink.trim()) {
      newErrors.mapLink = t('mapLinkRequired');
    } else if (!/google\.com\/maps|maps\.google\.com|goo\.gl|maps\.app\.goo\.gl/i.test(formData.mapLink)) {
      newErrors.mapLink = t('validMapLink');
    }

    if (!formData.gender) {
      newErrors.gender = t('genderRequired');
    }

    if (isAdmin && formData.images.length === 0) {
      newErrors.images = t('imagesRequired');
    }

    if (!isEdit) {
      const count = parseInt(formData.roomCount, 10);
      if (!count || count < 1 || count > MAX_ROOMS_PER_BATCH) {
        newErrors.roomCount = `Enter a number between 1 and ${MAX_ROOMS_PER_BATCH}`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Prepare the room data
    const billLabels = {
      lightAndWater: 'Including light and water bill',
      waterOnly: 'Including water bill only (light separate)',
      lightOnly: 'Including light bill only (water separate)',
      none: 'Without including light and water bill'
    };
    let note = formData.note.trim();
    const bl = billLabels[formData.billInclusion];
    const skipPrepend = /^(including|without)\s+(light|water|bill)/i.test(note);
    if (bl && !skipPrepend) note = [bl, note].filter(Boolean).join(', ');
    if (!note) note = undefined;

    const conditionToText = {
      oneYearAgreement: '1 YEAR AGREEMENT',
      rent1stTo10th: 'The rent should be paid between the 1st and 10th of each month',
      rent1stTo5th: 'The rent should be paid between the 1st and 5th of each month',
      rent25thTo5th: 'The rent should be paid between the 25th and 5th of each month',
      after10pmNoEntry: 'After 10pm no entry',
      after11pmNoEntry: 'After 11pm no entry',
      friendsNotAllowed: 'Friends are not allowed in room',
      parentsAllowedStay: 'Parents allowed for stay',
      aadharPhotoParentMandatory: "STUDENT'S addhar card, photo and parent phone number is mandatory",
      selfCleaning: 'Self Cleaning',
      selfCookingNotAllowed: 'Self cooking not allowed',
      noDrinkingSmoking: 'No drinking and smoking allowed in room',
      goodBehaviour: 'Good Behaviour is required',
      garbageByStudents: 'Garbage Management by students',
      groupStudyNotAllowed: 'Group Studies not allowed',
      entryGateLocked: 'Entry gate locked after hours'
    };
    const conditionParts = formData.selectedConditions.map(k => conditionToText[k]).filter(Boolean);
    const advanceStr = formData.advance && !isNaN(Number(formData.advance)) ? `${formData.advance} Rs. Advance` : '';
    const depositStr = formData.deposit && !isNaN(Number(formData.deposit)) ? `${formData.deposit} Rs. Deposit` : '';
    const descParts = [...conditionParts, advanceStr, depositStr, formData.description.trim()].filter(Boolean);
    const description = descParts.join(' , ');

    const adv = formData.advance != null && formData.advance !== '' && !isNaN(Number(formData.advance)) ? Number(formData.advance) : undefined;
    const dep = formData.deposit != null && formData.deposit !== '' && !isNaN(Number(formData.deposit)) ? Number(formData.deposit) : undefined;

    const allowsMultiple = !isEdit;
    const roomCount = allowsMultiple
      ? Math.min(MAX_ROOMS_PER_BATCH, Math.max(1, parseInt(formData.roomCount, 10) || 1))
      : 1;
    const baseTitle = formData.title.trim();

    const buildRoomPayload = (titleSuffix) => ({
      title: titleSuffix ? `${baseTitle} (${titleSuffix})` : baseTitle,
      rent: parseInt(formData.rent),
      pricingType: formData.pricingType,
      note: note || undefined,
      contact: formData.contact.trim(),
      address: formData.address.trim(),
      location: formData.location.trim(),
      mapLink: formData.mapLink.trim(),
      city: formData.city.trim() || undefined,
      college: formData.college.trim() || undefined,
      roomType: formData.roomType,
      rooms: formData.roomType,
      description: description || '',
      features: formData.selectedFeatures,
      gender: formData.gender,
      images: formData.images.length > 0 ? formData.images : ['/api/placeholder/400/300'],
      billInclusion: formData.billInclusion,
      selectedConditions: formData.selectedConditions,
      hidden: isEdit && initialRoom ? (initialRoom.hidden || false) : false,
      ...(adv != null && !isNaN(adv) ? { advance: adv } : {}),
      ...(dep != null && !isNaN(dep) ? { deposit: dep } : {}),
      ...(isEdit && initialRoom ? {
        id: initialRoom.id,
        verificationStatus: initialRoom.verificationStatus,
        verifiedAt: initialRoom.verifiedAt,
        verifiedBy: initialRoom.verifiedBy,
        rejectedAt: initialRoom.rejectedAt,
        rejectedBy: initialRoom.rejectedBy,
        ownerId: initialRoom.ownerId,
        ownerName: initialRoom.ownerName,
        ownerEmail: initialRoom.ownerEmail,
        ownerPhone: initialRoom.ownerPhone,
        paymentStatus: initialRoom.paymentStatus,
        subscriptionStatus: initialRoom.subscriptionStatus,
        subscriptionStart: initialRoom.subscriptionStart,
        subscriptionEnd: initialRoom.subscriptionEnd,
        subscriptionAmount: initialRoom.subscriptionAmount,
        paymentOrderId: initialRoom.paymentOrderId,
        paymentMethod: initialRoom.paymentMethod,
        isPublished: initialRoom.isPublished,
        roomStatus: initialRoom.roomStatus,
        visibility: initialRoom.visibility
      } : {})
    });

    if (isEdit) {
      setPendingRoomData(buildRoomPayload());
      setShowConfirmation(true);
      return;
    }

    const rooms = Array.from({ length: roomCount }, (_, i) => ({
      ...buildRoomPayload(roomCount > 1 ? String(i + 1) : null),
      id: Date.now() + i
    }));

    if (roomCount > 1) {
      setPendingRoomData({
        rooms,
        roomCount,
        roomType: formData.roomType,
        title: baseTitle,
        totalSubscriptionAmount: getSubscriptionTotal(formData.roomType, roomCount)
      });
    } else {
      setPendingRoomData(rooms[0]);
    }
    setStep('payment');
  };

  const handlePaymentChoice = async (paymentMethod) => {
    if (!pendingRoomData) return;

    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      await onAddRoom(pendingRoomData, paymentMethod);
      if (paymentMethod === 'cash') {
        const count = pendingRoomData.rooms?.length || 1;
        setSubmitMessage(
          count > 1
            ? `${count} rooms added and cash payment recorded successfully.`
            : 'Room added and cash payment recorded successfully.'
        );
        setTimeout(() => { onClose(); }, 1500);
      }
    } catch (error) {
      setSubmitMessage(t('errorAddingRoom'));
      setIsSubmitting(false);
    } finally {
      if (paymentMethod === 'cash') {
        setPendingRoomData(null);
      }
    }
  };

  const handleConfirmSubmit = async () => {
    if (!pendingRoomData) return;

    setShowConfirmation(false);
    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      if (isEdit) {
        await new Promise(resolve => setTimeout(resolve, 800));
        onAddRoom(pendingRoomData);
        setSubmitMessage(t('roomUpdatedSuccessfully'));
        setTimeout(() => { onClose(); }, 1500);
      }
    } catch (error) {
      setSubmitMessage(t('errorAddingRoom'));
      setIsSubmitting(false);
    } finally {
      setPendingRoomData(null);
      if (isEdit) setIsSubmitting(false);
    }
  };

  const isBatchPending = pendingRoomData?.rooms?.length > 1;
  const pendingRoomCount = isBatchPending
    ? pendingRoomData.roomCount
    : 1;
  const pendingRoomType = isBatchPending
    ? pendingRoomData.roomType
    : pendingRoomData?.roomType;
  const unitSubscriptionAmount = ROOM_TYPE_PRICING[pendingRoomType || formData.roomType] ?? ROOM_TYPE_PRICING['1 RK'];
  const formRoomCount = Math.min(MAX_ROOMS_PER_BATCH, Math.max(1, parseInt(formData.roomCount, 10) || 1));
  const formUnitPrice = ROOM_TYPE_PRICING[formData.roomType] ?? ROOM_TYPE_PRICING['1 RK'];
  const formTotalSubscription = formUnitPrice * formRoomCount;
  const subscriptionAmount = isBatchPending
    ? (pendingRoomData.totalSubscriptionAmount ?? unitSubscriptionAmount * pendingRoomCount)
    : unitSubscriptionAmount;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">
            {isEdit ? t('editRoom') : step === 'payment' ? 'Subscription Payment' : t('addNewRoom')}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Submit Message */}
        {submitMessage && (
          <div className={`mx-6 mt-4 px-4 py-2 rounded-md flex items-center gap-2 ${submitMessage.includes('Error')
            ? 'bg-red-50 border border-red-200 text-red-800'
            : 'bg-green-50 border border-green-200 text-green-800'
            }`}>
            {submitMessage.includes('Error') ? (
              <AlertCircle className="w-4 h-4" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {submitMessage}
          </div>
        )}

        {/* Payment Step */}
        {step === 'payment' && !isEdit && pendingRoomData && (
          <div className="p-6 space-y-6">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {isBatchPending ? pendingRoomData.title : pendingRoomData.title}
              </h3>
              <p className="text-sm text-gray-600 mb-1">
                {pendingRoomType} · {SUBSCRIPTION_DURATION_DAYS}-day listing subscription
              </p>
              {isBatchPending && (
                <p className="text-sm text-gray-600 mb-4">
                  {pendingRoomCount} separate listings · titles numbered (1), (2), …
                </p>
              )}
              <div className="flex flex-wrap items-baseline gap-2">
                {isBatchPending && (
                  <span className="text-sm text-gray-600">
                    {pendingRoomType} x {pendingRoomCount} · ₹{unitSubscriptionAmount} each =
                  </span>
                )}
                <span className="text-3xl font-bold text-orange-600">₹{subscriptionAmount}</span>
                <span className="text-sm text-gray-500">one-time registration fee</span>
              </div>
            </div>

            <p className="text-sm text-gray-600">
              Choose how you would like to pay for your room listing subscription.
            </p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => handlePaymentChoice('online')}
                disabled={isSubmitting}
                className="w-full flex items-center gap-4 p-4 border-2 border-orange-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-all text-left disabled:opacity-50"
              >
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Pay Online</p>
                  <p className="text-sm text-gray-500">Pay securely via Cashfree (UPI, card, netbanking)</p>
                </div>
              </button>

              {canCollectCash && (
                <button
                  type="button"
                  onClick={() => handlePaymentChoice('cash')}
                  disabled={isSubmitting}
                  className="w-full flex items-center gap-4 p-4 border-2 border-green-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all text-left disabled:opacity-50"
                >
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Banknote className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Cash Collected</p>
                    <p className="text-sm text-gray-500">Mark subscription as paid — cash received in person</p>
                  </div>
                </button>
              )}
            </div>

            <div className="flex justify-between gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('form')}
                disabled={isSubmitting}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                {t('cancel')}
              </Button>
            </div>
          </div>
        )}

        {/* Form */}
        {(step === 'form' || isEdit) && (
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Room Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <img src="/logo.svg" alt="Room" className="w-5 h-5 inline mr-1 object-contain" />
                {t('roomTitle')} *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder={t('roomTitlePlaceholder')}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.title ? 'border-red-500' : 'border-gray-300'
                  }`}
              />
              {errors.title && (
                <p className="text-red-500 text-sm mt-1">{errors.title}</p>
              )}
            </div>

            {/* Rent and Contact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  {t('rent')} (₹) *
                </label>
                <input
                  type="number"
                  name="rent"
                  value={formData.rent}
                  onChange={handleInputChange}
                  placeholder={t('rentPlaceholder')}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.rent ? 'border-red-500' : 'border-gray-300'
                    }`}
                />
                {errors.rent && (
                  <p className="text-red-500 text-sm mt-1">{errors.rent}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="w-4 h-4 inline mr-1" />
                  {t('contact')} *
                </label>
                <input
                  type="tel"
                  name="contact"
                  value={formData.contact}
                  onChange={handleInputChange}
                  placeholder={t('contactPlaceholder')}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.contact ? 'border-red-500' : 'border-gray-300'
                    }`}
                />
                {errors.contact && (
                  <p className="text-red-500 text-sm mt-1">{errors.contact}</p>
                )}
              </div>
            </div>

            {/* Bill inclusion (light/water) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rent includes</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {BILL_INCLUSION_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${formData.billInclusion === opt.value ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:bg-orange-50/50'}`}
                  >
                    <input
                      type="radio"
                      name="billInclusion"
                      value={opt.value}
                      checked={formData.billInclusion === opt.value}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-orange-600"
                    />
                    <span className="text-sm text-gray-700">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Note (short, for card under price) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Note (e.g. 2 girls required, 3 boys required)</label>
              <input
                type="text"
                name="note"
                value={formData.note}
                onChange={handleInputChange}
                placeholder="e.g. 2 girls required in this room"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Room Type and Pricing Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Room Type *</label>
                <select
                  name="roomType"
                  value={formData.roomType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {ROOM_TYPE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <div className="mt-2 text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded p-2 space-y-1">
                  {formRoomCount > 1 ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span>Per room: <strong>₹{formUnitPrice}</strong></span>
                        <span>Duration: <strong>{SUBSCRIPTION_DURATION_DAYS} Days</strong></span>
                      </div>
                      <div className="font-semibold">
                        Total registration: {formData.roomType} x {formRoomCount} = <strong>₹{formTotalSubscription}</strong>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span>Subscription: <strong>₹{formUnitPrice}</strong></span>
                      <span>Duration: <strong>{SUBSCRIPTION_DURATION_DAYS} Days</strong></span>
                    </div>
                  )}
                </div>
              </div>
              {!isEdit && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of rooms to add *
                  </label>
                  <select
                    name="roomCount"
                    value={formData.roomCount}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.roomCount ? 'border-red-500' : 'border-gray-300'}`}
                  >
                    {Array.from({ length: MAX_ROOMS_PER_BATCH }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={String(n)}>
                        {formData.roomType} x {n} — ₹{formUnitPrice * n}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Same details for each room. Each gets its own listing (e.g. &quot;{formData.title.trim() || 'My PG'} (1)&quot;, &quot;{formData.title.trim() || 'My PG'} (2)&quot;).
                  </p>
                  {errors.roomCount && (
                    <p className="text-red-500 text-sm mt-1">{errors.roomCount}</p>
                  )}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pricing *</label>
                <div className="flex gap-4">
                  <label className={`flex items-center gap-2 cursor-pointer ${formData.pricingType === 'perRoom' ? 'text-orange-600 font-medium' : ''}`}>
                    <input type="radio" name="pricingType" value="perRoom" checked={formData.pricingType === 'perRoom'} onChange={handleInputChange} className="w-4 h-4" />
                    Per room
                  </label>
                  <label className={`flex items-center gap-2 cursor-pointer ${formData.pricingType === 'perStudent' ? 'text-orange-600 font-medium' : ''}`}>
                    <input type="radio" name="pricingType" value="perStudent" checked={formData.pricingType === 'perStudent'} onChange={handleInputChange} className="w-4 h-4" />
                    Per student
                  </label>
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                {t('address')} *
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder={t('addressPlaceholder')}
                rows="2"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.address ? 'border-red-500' : 'border-gray-300'
                  }`}
              />
              {errors.address && (
                <p className="text-red-500 text-sm mt-1">{errors.address}</p>
              )}
            </div>

            {/* Location Area and Map Link */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('location')} *
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder={t('locationPlaceholder')}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.location ? 'border-red-500' : 'border-gray-300'
                    }`}
                />
                {errors.location && (
                  <p className="text-red-500 text-sm mt-1">{errors.location}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('mapLink')} *
                </label>
                <input
                  type="url"
                  name="mapLink"
                  value={formData.mapLink}
                  onChange={handleInputChange}
                  placeholder={t('mapLinkPlaceholder')}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.mapLink ? 'border-red-500' : 'border-gray-300'
                    }`}
                />
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleFetchMyLocation}
                    disabled={mapLinkLoading || isSubmitting}
                    className="text-orange-600 border-orange-300 hover:bg-orange-50"
                  >
                    <Locate className="w-4 h-4 mr-1.5" />
                    {mapLinkLoading ? 'Fetching…' : 'Use my current location'}
                  </Button>
                </div>
                {mapLinkError && (
                  <p className="text-red-500 text-sm mt-1">{mapLinkError}</p>
                )}
                {errors.mapLink && (
                  <p className="text-red-500 text-sm mt-1">{errors.mapLink}</p>
                )}
              </div>
            </div>

            {/* City and College (optional) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City (optional)</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  placeholder="e.g. Kolhapur"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">College (optional)</label>
                <input
                  type="text"
                  name="college"
                  value={formData.college}
                  onChange={handleInputChange}
                  placeholder="e.g. DYPSN Kolhapur"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Conditions (checkboxes) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Conditions</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[28vh] overflow-y-auto p-1">
                {CONDITION_OPTIONS.map((c) => (
                  <label
                    key={c.key}
                    className={`flex items-center gap-3 p-2.5 border rounded-lg cursor-pointer transition-all ${formData.selectedConditions.includes(c.key) ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:bg-orange-50/50'}`}
                  >
                    <Checkbox
                      checked={formData.selectedConditions.includes(c.key)}
                      onCheckedChange={() => handleConditionToggle(c.key)}
                      className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500 w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">{c.label}</span>
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Advance (Rs)</label>
                  <input
                    type="number"
                    name="advance"
                    value={formData.advance}
                    onChange={handleInputChange}
                    placeholder="e.g. 2000"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Deposit (Rs)</label>
                  <input
                    type="number"
                    name="deposit"
                    value={formData.deposit}
                    onChange={handleInputChange}
                    placeholder="e.g. 1000"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Selected: {formData.selectedConditions.length} conditions</p>
            </div>

            {/* Description (additional, optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 inline mr-1" />
                {t('description')} (additional, optional)
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Any other conditions or details..."
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Features Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {t('features')} / Amenities
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 max-h-[40vh] overflow-y-auto p-1">
                {AVAILABLE_FEATURES.map((feature) => (
                  <label
                    key={feature}
                    className={`flex items-center gap-3 p-3 sm:p-3 border rounded-lg cursor-pointer transition-all active:scale-[0.98] ${formData.selectedFeatures.includes(feature)
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:bg-orange-50'
                      }`}
                  >
                    <Checkbox
                      checked={formData.selectedFeatures.includes(feature)}
                      onCheckedChange={() => handleFeatureToggle(feature)}
                      className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500 w-5 h-5"
                    />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Selected: {formData.selectedFeatures.length} amenities
              </p>
            </div>

            {/* Gender Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('gender')} *
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className={`flex items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all ${formData.gender === 'boy'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:border-gray-400'
                  }`}>
                  <input
                    type="radio"
                    name="gender"
                    value="boy"
                    checked={formData.gender === 'boy'}
                    onChange={handleInputChange}
                    className="sr-only"
                  />
                  <div className="text-center">
                    <div className="text-lg font-semibold">{t('boy')}</div>
                    <div className="text-sm text-gray-600">{t('maleStudentsOnly')}</div>
                  </div>
                </label>

                <label className={`flex items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all ${formData.gender === 'girl'
                  ? 'border-pink-500 bg-pink-50 text-pink-700'
                  : 'border-gray-300 hover:border-gray-400'
                  }`}>
                  <input
                    type="radio"
                    name="gender"
                    value="girl"
                    checked={formData.gender === 'girl'}
                    onChange={handleInputChange}
                    className="sr-only"
                  />
                  <div className="text-center">
                    <div className="text-lg font-semibold">{t('girl')}</div>
                    <div className="text-sm text-gray-600">{t('femaleStudentsOnly')}</div>
                  </div>
                </label>
              </div>
              {errors.gender && (
                <p className="text-red-500 text-sm mt-1">{errors.gender}</p>
              )}
            </div>

            {/* Images - Conditional rendering based on admin status */}
            <div>
              {isAdmin ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Upload className="w-4 h-4 inline mr-1" />
                    {t('images')} *
                  </label>
                  <p className="text-xs text-gray-500 mb-1">
                    Enter image paths from the <code>/public</code> folder, one per line. Example:
                    <br />
                    <span className="font-mono text-[11px]">
                      /Sureh Pattar/upper/front.avif
                    </span>
                  </p>
                  <textarea
                    name="imagePaths"
                    value={formData.imagePaths}
                    onChange={handleImagePathsChange}
                    placeholder="/Owner Name/folder/image-1.avif&#10;/Owner Name/folder/image-2.avif"
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                  />
                  {errors.images && (
                    <p className="text-red-500 text-sm mt-1">{errors.images}</p>
                  )}
                </div>
              ) : (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-orange-800 mb-2 flex items-center">
                    <Upload className="w-4 h-4 mr-2" />
                    Room Images
                  </h4>
                  <p className="text-sm text-orange-700 mb-2">
                    To add images to your room listing, please send them to our WhatsApp number: <strong>+91 8999483116</strong>. Make sure to mention your room name or registered phone number.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => window.open('https://wa.me/918999483116', '_blank')}
                    className="mt-2"
                  >
                    Send Images via WhatsApp
                  </Button>
                </div>
              )}

              {/* Image Preview */}
              {formData.images.length > 0 && (
                <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3">
                  {formData.images.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={image}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded-md"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              className="btn-primary w-full mt-4"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="loading-spinner mr-2" />
                  {isEdit ? t('update') + '...' : 'Next...'}
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  {isEdit ? t('update') : 'Next'}
                </>
              )}
            </Button>
          </div>
        </form>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => {
          setShowConfirmation(false);
          setPendingRoomData(null);
        }}
        onConfirm={handleConfirmSubmit}
        title={isEdit ? 'Update Room' : 'Add Room'}
        message={
          isEdit
            ? `Are you sure you want to update "${formData.title}"? The changes will be visible to all students.`
            : `Are you sure you want to add "${formData.title}"? This room will be visible to all students.`
        }
        confirmText={isEdit ? 'Update' : 'Add Room'}
        cancelText="Cancel"
        type="success"
        isLoading={isSubmitting}
      />
    </div>
  );
};

export default AddRoomModal;

