import { useState } from 'react';
import { MapPin, Building, Loader2, ChevronDown, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { useUserPreferences } from '../contexts/UserPreferencesContext.jsx';
import { saveUserLocation } from '../services/userService.js';
import { CITIES, STUDENT_STREAMS, getCollegesForCity } from '../utils/locationOptions.js';

const LocationSelectionModal = ({ onLocationSelect, isUpdateMode = false, onClose }) => {
  const { t } = useLanguage();
  const { selectedStudentStream, setSelectedStudentStream } = useUserPreferences();
  const [selectedStream, setSelectedStream] = useState(selectedStudentStream || '');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedCollege, setSelectedCollege] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showCollegeDropdown, setShowCollegeDropdown] = useState(false);

  const availableColleges =
    selectedCity && selectedStream ? getCollegesForCity(selectedCity, selectedStream) : [];

  const handleStreamSelect = (stream) => {
    setSelectedStream(stream);
    setSelectedCollege('');
    setShowCollegeDropdown(false);
  };

  const handleCitySelect = (city) => {
    setSelectedCity(city);
    setSelectedCollege('');
    setShowCollegeDropdown(false);
  };

  const handleCollegeSelect = (college) => {
    setSelectedCollege(college);
    setShowCollegeDropdown(false);
  };

  const handleContinue = async () => {
    if (!selectedStream || !selectedCity || !selectedCollege) {
      setError('Please select stream, city and college');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      await saveUserLocation({
        city: selectedCity,
        college: selectedCollege,
        studentStream: selectedStream
      });

      setSelectedStudentStream(selectedStream);

      onLocationSelect({
        city: selectedCity,
        college: selectedCollege,
        studentStream: selectedStream
      });
    } catch (error) {
      console.error('Error saving location:', error);
      setError('Failed to save your selection. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-8">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-gray-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {isUpdateMode ? (t('changeLocation') || 'Change Location') : (t('selectYourLocation') || 'Select Your Location')}
              </h2>
              <p className="text-gray-600">
                Select stream, city and college to continue
              </p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              I am a *
            </label>
            <div className="grid grid-cols-1 gap-3">
              {STUDENT_STREAMS.map((stream) => (
                <Button
                  key={stream.value}
                  onClick={() => handleStreamSelect(stream.value)}
                  className={`h-12 text-sm font-semibold rounded-xl transition-all duration-200 ${selectedStream === stream.value
                    ? 'bg-orange-600 hover:bg-orange-700 text-white'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-2 border-gray-200 hover:border-gray-300'
                    }`}
                  variant={selectedStream === stream.value ? 'default' : 'outline'}
                >
                  <GraduationCap className="w-4 h-4 mr-2" />
                  {stream.label}
                </Button>
              ))}
            </div>
          </div>

          {selectedStream && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {t('city') || 'City'} *
              </label>
              <div className="grid grid-cols-2 gap-3">
                {CITIES.map((city) => (
                  <Button
                    key={city}
                    onClick={() => handleCitySelect(city)}
                    className={`h-12 text-sm font-semibold rounded-xl transition-all duration-200 ${selectedCity === city
                      ? 'bg-gray-900 hover:bg-gray-800 text-white scale-105'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-2 border-gray-200 hover:border-gray-300'
                      }`}
                    variant={selectedCity === city ? 'default' : 'outline'}
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    {city}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {selectedStream && selectedCity && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {t('college') || 'College'} *
              </label>
              <div className="relative">
                <Button
                  onClick={() => setShowCollegeDropdown(!showCollegeDropdown)}
                  className={`w-full h-12 text-left justify-between px-4 ${selectedCollege
                    ? 'bg-gray-100 border-gray-400 text-gray-900'
                    : 'bg-gray-50 border-gray-300 text-gray-700'
                    }`}
                  variant="outline"
                >
                  <div className="flex items-center min-w-0 flex-1">
                    <Building className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="truncate text-sm">
                      {selectedCollege || t('selectCollege') || 'Select College'}
                    </span>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform flex-shrink-0 ml-2 ${showCollegeDropdown ? 'rotate-180' : ''}`} />
                </Button>

                {showCollegeDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                    {availableColleges.map((college) => (
                      <button
                        key={college}
                        onClick={() => handleCollegeSelect(college)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-100 transition-colors border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex items-start">
                          <Building className="w-4 h-4 mr-2 text-gray-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm leading-relaxed break-words text-gray-900">{college}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm text-center">{error}</p>
            </div>
          )}

          <Button
            onClick={handleContinue}
            disabled={!selectedStream || !selectedCity || !selectedCollege || isSaving}
            className="w-full h-12 text-lg font-semibold rounded-xl transition-all duration-200 bg-gray-900 hover:bg-gray-800 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{t('saving') || 'Saving...'}</span>
              </div>
            ) : (
              <span>{t('continue') || 'Continue'}</span>
            )}
          </Button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            {t('locationSelectionNote') || 'You can change this selection later in settings'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LocationSelectionModal;
