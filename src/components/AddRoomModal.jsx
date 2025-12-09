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
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';

const AddRoomModal = ({ onClose, onAddRoom, initialRoom, isEdit }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState(() => initialRoom ? {
    title: initialRoom.title || '',
    rent: initialRoom.rent || '',
    contact: initialRoom.contact || '',
    address: initialRoom.address || '',
    location: initialRoom.location || '',
    mapLink: initialRoom.mapLink || '',
    description: initialRoom.description || '',
    features: initialRoom.features ? initialRoom.features.join(', ') : '',
    gender: initialRoom.gender || 'boy',
    images: initialRoom.images || []
  } : {
    title: '',
    rent: '',
    contact: '',
    address: '',
    location: '',
    mapLink: '',
    description: '',
    features: '',
    gender: 'boy',
    images: []
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const imageUrls = files.map(file => URL.createObjectURL(file));
    
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...imageUrls]
    }));
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
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
    } else if (!formData.mapLink.includes('maps.google.com') && !formData.mapLink.includes('goo.gl')) {
      newErrors.mapLink = t('validMapLink');
    }

    if (!formData.description.trim()) {
      newErrors.description = t('descriptionRequired');
    }

    if (!formData.gender) {
      newErrors.gender = t('genderRequired');
    }

    if (formData.images.length === 0) {
      newErrors.images = t('imagesRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      const newRoom = {
        id: isEdit && initialRoom ? initialRoom.id : Date.now(), // Use existing id if editing
        title: formData.title.trim(),
        rent: parseInt(formData.rent),
        contact: formData.contact.trim(),
        address: formData.address.trim(),
        location: formData.location.trim(),
        mapLink: formData.mapLink.trim(),
        description: formData.description.trim(),
        features: formData.features.split(',').map(a => a.trim()).filter(a => a),
        gender: formData.gender,
        images: formData.images.length > 0 ? formData.images : ['/api/placeholder/400/300']
      };

      onAddRoom(newRoom);
      setSubmitMessage(isEdit ? t('roomUpdatedSuccessfully') : t('roomAddedSuccessfully'));
      
      // Close modal after success
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (error) {
      setSubmitMessage(t('errorAddingRoom'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">{isEdit ? t('editRoom') : t('addNewRoom')}</h2>
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
          <div className={`mx-6 mt-4 px-4 py-2 rounded-md flex items-center gap-2 ${
            submitMessage.includes('Error') 
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

        {/* Form */}
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
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.title ? 'border-red-500' : 'border-gray-300'
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
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.rent ? 'border-red-500' : 'border-gray-300'
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
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.contact ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.contact && (
                  <p className="text-red-500 text-sm mt-1">{errors.contact}</p>
                )}
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
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.address ? 'border-red-500' : 'border-gray-300'
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
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.location ? 'border-red-500' : 'border-gray-300'
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
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.mapLink ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.mapLink && (
                  <p className="text-red-500 text-sm mt-1">{errors.mapLink}</p>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 inline mr-1" />
                {t('description')} *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder={t('descriptionPlaceholder')}
                rows="3"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.description ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1">{errors.description}</p>
              )}
            </div>

            {/* Features */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('features')} (comma-separated)
              </label>
              <input
                type="text"
                name="features"
                value={formData.features}
                onChange={handleInputChange}
                placeholder={t('featuresPlaceholder')}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.features ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.features && (
                <p className="text-red-500 text-sm mt-1">{errors.features}</p>
              )}
            </div>

            {/* Gender Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('gender')} *
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className={`flex items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.gender === 'boy' 
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
                
                <label className={`flex items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.gender === 'girl' 
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

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Upload className="w-4 h-4 inline mr-1" />
                {t('images')} *
              </label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.images && (
                <p className="text-red-500 text-sm mt-1">{errors.images}</p>
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
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
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
                  {isEdit ? t('update') + '...' : t('submit') + '...'}
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  {isEdit ? t('update') : t('addRoom')}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddRoomModal;

