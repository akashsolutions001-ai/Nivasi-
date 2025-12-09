import { useState } from 'react';
import { User, Users } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';


const GenderSelectionModal = ({ onGenderSelect }) => {
  const { t } = useLanguage();
  const [selectedGender, setSelectedGender] = useState(null);

  const handleGenderSelect = (gender) => {
    setSelectedGender(gender);
    // Add a small delay for visual feedback
    setTimeout(() => {
      onGenderSelect(gender);
    }, 200);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-slide-up">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t('welcomeToCollegeRoomRental')}
          </h2>
          <p className="text-gray-600">
            {t('selectGenderToSeeRooms')}
          </p>
        </div>

        <div className="space-y-4">
          <Button
            onClick={() => handleGenderSelect('boy')}
            className={`w-full h-16 text-lg font-semibold rounded-xl transition-all duration-200 ${
              selectedGender === 'boy'
                ? 'bg-blue-600 hover:bg-blue-700 text-white scale-105'
                : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-2 border-blue-200 hover:border-blue-300'
            }`}
            variant={selectedGender === 'boy' ? 'default' : 'outline'}
          >
            <div className="flex items-center justify-center gap-3">
              <User className="w-6 h-6" />
              <span>{t('boys')}</span>
            </div>
          </Button>

          <Button
            onClick={() => handleGenderSelect('girl')}
            className={`w-full h-16 text-lg font-semibold rounded-xl transition-all duration-200 ${
              selectedGender === 'girl'
                ? 'bg-pink-600 hover:bg-pink-700 text-white scale-105'
                : 'bg-pink-50 hover:bg-pink-100 text-pink-700 border-2 border-pink-200 hover:border-pink-300'
            }`}
            variant={selectedGender === 'girl' ? 'default' : 'outline'}
          >
            <div className="flex items-center justify-center gap-3">
              <User className="w-6 h-6" />
              <span>{t('girls')}</span>
            </div>
          </Button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            {t('changeSelectionLater')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default GenderSelectionModal; 