import { useState } from 'react';
import { 
  X, 
  Phone, 
  MessageCircle, 
  MapPin, 
  ExternalLink, 
  Share2, 
  ChevronLeft, 
  ChevronRight,
  Check,
  Copy,
  Heart,
  Star,
  Wifi,
  Car,
  Shield,
  Zap,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Dialog, DialogContent } from '@/components/ui/dialog.jsx';
import { useIsMobile } from '@/hooks/use-mobile.js';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import BookingModal from './BookingModal.jsx';

const RoomDetailModal = ({ room, onClose }) => {
  const { t } = useLanguage();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [shareMessage, setShareMessage] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? room.images.length - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => 
      prev === room.images.length - 1 ? 0 : prev + 1
    );
  };

  const handleCall = () => {
    window.location.href = `tel:${room.contact}`;
  };

  const handleBookNow = () => {
    setShowBookingModal(true);
  };

  const handleBookingSuccess = (booking) => {
    console.log('Booking successful:', booking);
    // You can add additional success handling here
  };

  const handleCloseBookingModal = () => {
    setShowBookingModal(false);
  };

  const handleViewOnMap = () => {
    window.open(room.mapLink, '_blank');
  };

  const handleShare = async () => {
    const shareData = {
      title: room.title,
      text: `${t('checkOutRoom')} ${room.title} - ₹${room.rent}/month`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        setShareMessage(t('sharedSuccessfully'));
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback to clipboard
      const shareText = `${shareData.title}\n${shareData.text}\n${shareData.url}\n\n${t('foundOnNivasi')}`;
      navigator.clipboard.writeText(shareText).then(() => {
        setShareMessage(t('linkCopied'));
      });
    }

    setTimeout(() => setShareMessage(''), 3000);
  };

  const getMapEmbedUrl = () => {
    const encodedAddress = encodeURIComponent(room.address);
    return `https://www.google.com/maps/embed/v1/place?key=YOUR_API_KEY&q=${encodedAddress}`;
  };

  const getAmenityIcon = (amenity) => {
    const lower = amenity.toLowerCase();
    if (lower.includes('wifi')) return <Wifi className="w-4 h-4" />;
    if (lower.includes('parking')) return <Car className="w-4 h-4" />;
    if (lower.includes('security')) return <Shield className="w-4 h-4" />;
    if (lower.includes('furnished')) return <img src="/logo.svg" alt="Furnished" className="w-5 h-5 object-contain" />;
    return <Zap className="w-4 h-4" />;
  };

  const isMobile = useIsMobile();

  return (
    <div className="modal-backdrop fixed inset-0 flex items-center justify-center p-4 z-50">
      <div className="modal-content max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-fade-scale">
        {/* Enhanced Header */}
        <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center z-10">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold title-gradient">{room.title}</h2>
              <button
                onClick={() => setIsFavorite(!isFavorite)}
                className={`p-2 rounded-full transition-all ${
                  isFavorite 
                    ? 'bg-red-100 text-red-500' 
                    : 'bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500'
                }`}
              >
                <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
              </button>
            </div>
            <div className="flex items-center gap-4">
              <p className="text-gray-600 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {room.location}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="hover:bg-red-50 hover:border-red-200 hover:text-red-600"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Enhanced Content */}
        <div className="p-6 space-y-8">
          {/* Enhanced Image Carousel */}
          <div className="relative">
            <div className="relative h-80 md:h-96 lg:h-[28rem] bg-gradient-to-br from-orange-100 to-orange-50 md:bg-gray-100 rounded-2xl overflow-hidden">
              {room.images && room.images.length > 0 ? (
                <>
                  <picture>
                    <source srcSet={room.images[currentImageIndex]?.replace(/\.(jpg|jpeg|png)$/i, '.avif')} type="image/avif" />
                    <source srcSet={room.images[currentImageIndex]?.replace(/\.(jpg|jpeg|png)$/i, '.webp')} type="image/webp" />
                  <img
                    src={room.images[currentImageIndex]}
                    alt={`${room.title} - Image ${currentImageIndex + 1}`}
                    className="w-full h-full object-cover md:object-cover cursor-zoom-in"
                    loading="eager"
                    decoding="sync"
                    onClick={() => setIsFullscreen(true)}
                  />
                  </picture>
                  {room.images.length > 1 && (
                    <>
                      <button
                        onClick={handlePrevImage}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-all"
                      >
                        <ChevronLeft className="w-5 h-5 text-gray-700" />
                      </button>
                      <button
                        onClick={handleNextImage}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-all"
                      >
                        <ChevronRight className="w-5 h-5 text-gray-700" />
                      </button>
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                        {room.images.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentImageIndex(index)}
                            className={`w-2 h-2 rounded-full transition-all ${
                              index === currentImageIndex 
                                ? 'bg-white w-6' 
                                : 'bg-white/60 hover:bg-white/80'
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <img src="/logo.svg" alt="Nivasi.space Logo" className="w-14 h-14 object-contain" />
                    </div>
                    <p className="text-gray-500">{t('noImageAvailable')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Price and Contact Section */}
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <div className="price-highlight text-4xl font-bold mb-4">
                ₹{room.rent.toLocaleString()}/month <span className="text-lg font-semibold">{room.pricingType === 'perRoom' ? t('perRoom') : t('perStudent')}</span>
              </div>
              {room.note && (
                <div className="text-lg font-bold text-gray-700 mb-4">
                  {room.note}
                </div>
              )}
                          {room.rooms && (
              <div className="text-lg font-semibold text-gray-700 mb-4">
                <span className="text-orange-700 font-bold">{t('rooms')}:</span> {room.rooms}
              </div>
            )}
              {room.description && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('conditions')}</h3>
                  <ul className="text-gray-600 leading-relaxed list-disc list-inside">
                    {room.description.split(/,|\n/).map((item, idx) => (
                      item.trim() && <li key={idx}>{item.trim()}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Enhanced Features */}
              {room.features && room.features.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('features')}</h3>
                  <div className="flex flex-wrap gap-2">
                    {room.features.map((feature, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-full text-sm font-medium text-gray-700"
                      >
                        {getAmenityIcon(feature)}
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {/* Enhanced Contact Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={handleCall}
                  className="contact-btn contact-btn-call flex items-center justify-center gap-2 py-3"
                >
                  <Phone className="w-5 h-5" />
                  {t('callNow')}
                </Button>
                <Button
                  onClick={handleBookNow}
                  className="book-now-btn-high-contrast flex items-center justify-center gap-2 py-3"
                >
                  <Calendar className="w-5 h-5" />
                  {t('bookNow') || 'Book Now'}
                </Button>
              </div>

              <Button
                onClick={handleViewOnMap}
                className="contact-btn contact-btn-map w-full flex items-center justify-center gap-2 py-3"
              >
                <ExternalLink className="w-5 h-5" />
                {t('viewOnGoogleMaps')}
              </Button>

              <Button
                onClick={handleShare}
                variant="outline"
                className="w-full flex items-center justify-center gap-2 py-3 hover:bg-orange-50 hover:border-orange-200"
              >
                <Share2 className="w-5 h-5" />
                {t('shareRoom')}
              </Button>

              {shareMessage && (
                <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-lg">
                  <Check className="w-4 h-4" />
                  {shareMessage}
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Address Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('location')}</h3>
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-xl border border-orange-200">
              <p className="text-gray-700 mb-2">{room.address}</p>
              <div className="text-sm text-gray-600">
                <MapPin className="w-4 h-4 inline mr-1" />
                {room.location}
              </div>
            </div>
          </div>

          {/* Removed Map View card as requested */}
        </div>
      </div>

      {/* Fullscreen Dialog for Image */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className={`max-w-none w-screen h-screen flex items-center justify-center bg-black/90 p-0 ${isMobile ? 'rounded-none' : ''} animate-zoom-in`}>
          {/* Image count and title overlay */}
          <div className="absolute top-0 left-0 w-full flex flex-col items-center z-40 pointer-events-none">
            <div className="mt-4 px-4 py-1 rounded-full bg-black/60 text-white text-xs font-semibold shadow-lg animate-fade-in">
              {room.title} &nbsp;|&nbsp; {currentImageIndex + 1} / {room.images.length}
            </div>
          </div>
          <div className="relative w-full h-full flex flex-col items-center justify-center">
            <button
              onClick={() => setIsFullscreen(false)}
              className={`absolute top-2 right-2 z-50 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg ${isMobile ? 'top-3 right-3 p-3' : ''}`}
              style={isMobile ? { top: 12, right: 12 } : {}}
            >
              <X className={`text-black ${isMobile ? 'w-8 h-8' : 'w-6 h-6'}`} />
            </button>
            <div
              className="flex-1 flex items-center justify-center w-full overflow-x-auto relative"
              {...(isMobile ? {
                onTouchStart: (e) => (window._touchStartX = e.touches[0].clientX),
                onTouchEnd: (e) => {
                  const dx = e.changedTouches[0].clientX - window._touchStartX;
                  if (dx > 50) handlePrevImage();
                  if (dx < -50) handleNextImage();
                }
              } : {})}
            >
              <button
                onClick={handlePrevImage}
                className={`absolute left-2 top-1/2 transform -translate-y-1/2 z-50 bg-white/90 hover:bg-orange-400 rounded-full flex items-center justify-center shadow-lg border-2 border-orange-200 ${isMobile ? 'w-14 h-14' : 'w-12 h-12'}`}
                style={isMobile ? { left: 8 } : {}}
              >
                <ChevronLeft className={`text-black ${isMobile ? 'w-9 h-9' : 'w-7 h-7'}`} />
              </button>
              <img
                src={room.images[currentImageIndex]}
                alt={`${room.title} - Fullscreen Image ${currentImageIndex + 1}`}
                className={`object-contain mx-auto transition-all duration-500 shadow-2xl ${isMobile ? 'max-h-[70vh] max-w-full rounded-lg' : 'max-h-[90vh] max-w-3xl rounded-2xl'} animate-image-fade-in`}
                style={isMobile ? { maxHeight: '70vh', width: '100%' } : {}}
              />
              <button
                onClick={handleNextImage}
                className={`absolute right-2 top-1/2 transform -translate-y-1/2 z-50 bg-white/90 hover:bg-orange-400 rounded-full flex items-center justify-center shadow-lg border-2 border-orange-200 ${isMobile ? 'w-14 h-14' : 'w-12 h-12'}`}
                style={isMobile ? { right: 8 } : {}}
              >
                <ChevronRight className={`text-black ${isMobile ? 'w-9 h-9' : 'w-7 h-7'}`} />
              </button>
              {/* Gradient overlay for thumbnails */}
              <div className="absolute bottom-0 left-0 w-full h-24 pointer-events-none" style={{background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.7) 100%)'}} />
            </div>
            {/* Thumbnails for scrolling */}
            <div className={`w-full flex ${isMobile ? 'flex-row overflow-x-auto py-2 px-1 gap-1 bg-black/80' : 'gap-2 justify-center items-center py-4 overflow-x-auto bg-black/60'} z-30`} style={isMobile ? { maxWidth: '100vw' } : {}}>
              {room.images.map((img, idx) => (
                <picture key={idx}>
                  <source srcSet={img.replace(/\.(jpg|jpeg|png)$/i, '.avif')} type="image/avif" />
                  <source srcSet={img.replace(/\.(jpg|jpeg|png)$/i, '.webp')} type="image/webp" />
                <img
                  src={img}
                  alt={`Thumbnail ${idx + 1}`}
                  className={`object-cover rounded cursor-pointer border-2 transition-all duration-300 ${idx === currentImageIndex ? 'border-orange-400 shadow-lg ring-2 ring-orange-400' : 'border-transparent opacity-70 hover:opacity-100'} ${isMobile ? 'h-12 w-20' : 'h-16 w-24'}`}
                    loading="lazy"
                    decoding="async"
                  onClick={() => setCurrentImageIndex(idx)}
                  style={isMobile ? { minWidth: 80, height: 48 } : {}}
                />
                </picture>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Booking Modal */}
      <BookingModal
        isOpen={showBookingModal}
        onClose={handleCloseBookingModal}
        room={room}
        onBookingSuccess={handleBookingSuccess}
      />
    </div>
  );
};

export default RoomDetailModal;

