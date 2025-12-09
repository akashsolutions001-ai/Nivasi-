import React, { useState, useCallback, memo } from 'react';
import { MapPin, Phone, ExternalLink, Heart, Star, ChevronLeft, ChevronRight, X as XIcon, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Dialog, DialogContent } from '@/components/ui/dialog.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';

const RoomCard = memo(({ room, onViewDetails, isAdmin, onEdit, isFirst, onBookNow }) => {
  const { t } = useLanguage();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImageIdx, setModalImageIdx] = useState(0);
  
  // Debug logging for room data
  console.log('RoomCard rendering for room:', room.id, room.title, room.images);

  const handleCallClick = useCallback(() => {
    window.location.href = `tel:${room.contact}`;
  }, [room.contact]);

  const handleMapClick = useCallback(() => {
    window.open(room.mapLink, '_blank');
  }, [room.mapLink]);

  const handleImageClick = useCallback((idx) => {
    setModalImageIdx(idx);
    setModalOpen(true);
  }, []);

  const handlePrevImage = useCallback((e) => {
    e.stopPropagation();
    setModalImageIdx((prev) => (prev === 0 ? room.images.length - 1 : prev - 1));
  }, [room.images.length]);

  const handleNextImage = useCallback((e) => {
    e.stopPropagation();
    setModalImageIdx((prev) => (prev === room.images.length - 1 ? 0 : prev + 1));
  }, [room.images.length]);

  const handleViewDetails = useCallback(() => {
    onViewDetails(room);
  }, [onViewDetails, room]);

  const handleEdit = useCallback(() => {
    onEdit(room);
  }, [onEdit, room]);

  const handleBookNow = useCallback(() => {
    if (onBookNow) {
      onBookNow(room);
    }
  }, [onBookNow, room]);

  return (
    <div className="room-card p-6 hover-lift h-full flex flex-col">
      {/* Image Section (only first image visible) */}
      <div className="relative mb-4 overflow-hidden rounded-xl flex-shrink-0">
        <div className="w-full h-48 md:h-56 lg:h-64 bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center">
          {room.images && room.images.length > 0 ? (
            <picture className="h-full w-full flex-shrink-0 cursor-pointer" onClick={() => handleImageClick(0)}>
              <source srcSet={room.images[0]?.replace(/\.(jpg|jpeg|png)$/i, '.avif')} type="image/avif" />
              <source srcSet={room.images[0]?.replace(/\.(jpg|jpeg|png)$/i, '.webp')} type="image/webp" />
              <img
                src={room.images[0]}
                alt={`${room.title} - 1`}
                className="h-44 md:h-52 lg:h-60 w-full object-cover rounded-lg border border-orange-100 hover:scale-105 transition-transform"
                loading={isFirst ? "eager" : 'lazy'}
                decoding="sync"
                onError={e => { 
                  console.error(`Failed to load image: ${room.images[0]}`, e);
                  console.error('Room data:', room);
                  e.target.style.display = 'none'; 
                }}
                onLoad={() => {
                  if (isFirst) {
                    console.log(`Successfully loaded critical image: ${room.images[0]}`);
                  }
                }}
              />
            </picture>
          ) : (
            <div className="text-center w-full">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <img src="/logo.svg" alt="Nivasi.space Logo" className="w-12 h-12 object-contain" />
              </div>
              <p className="text-gray-500 text-sm">{t('noImageAvailable')}</p>
            </div>
          )}
          {/* Favorite Button */}
          <button aria-label={t('addToFavorites')} className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-all">
            <Heart className="w-4 h-4 text-gray-600 hover:text-red-500" />
          </button>
        </div>
      </div>

      {/* Fullscreen Modal for Images (unchanged) */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-3xl p-0 bg-black/95 flex flex-col items-center justify-center">
          <button onClick={() => setModalOpen(false)} className="absolute top-4 right-4 z-10 text-white bg-black/60 rounded-full p-2 hover:bg-black/80"><XIcon className="w-6 h-6" /></button>
          <div className="relative w-full flex items-center justify-center" style={{ minHeight: '60vh' }}>
            <button onClick={handlePrevImage} className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-orange-400 rounded-full p-2"><ChevronLeft className="w-7 h-7 text-black" /></button>
            <picture className="flex-grow flex items-center justify-center">
              <source srcSet={room.images[modalImageIdx]?.replace(/\.(jpg|jpeg|png)$/i, '.avif')} type="image/avif" />
              <source srcSet={room.images[modalImageIdx]?.replace(/\.(jpg|jpeg|png)$/i, '.webp')} type="image/webp" />
              <img
                src={room.images[modalImageIdx]}
                alt={`${room.title} - Fullscreen ${modalImageIdx + 1}`}
                className="object-contain max-h-[70vh] max-w-full rounded-lg shadow-2xl mx-auto"
                style={{ background: '#222' }}
              />
            </picture>
            <button onClick={handleNextImage} className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-orange-400 rounded-full p-2"><ChevronRight className="w-7 h-7 text-black" /></button>
          </div>
          {/* Thumbnails */}
          <div className="flex gap-2 py-4 overflow-x-auto w-full justify-center bg-black/60">
            {room.images.map((img, idx) => (
              <img
                key={idx}
                src={img}
                alt={`Thumb ${idx + 1}`}
                className={`h-14 w-24 object-cover rounded cursor-pointer border-2 transition-all duration-300 ${idx === modalImageIdx ? 'border-orange-400 shadow-lg ring-2 ring-orange-400' : 'border-transparent opacity-70 hover:opacity-100'}`}
                onClick={() => setModalImageIdx(idx)}
                style={{ minWidth: 80 }}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Enhanced Content Section */}
      <div className="space-y-4 flex-1 flex flex-col">
        {/* Title and Price */}
        <div className="flex-shrink-0">
          <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
            {room.title}
          </h3>
          <div className="price-highlight text-2xl font-bold">
            ₹{room.rent.toLocaleString()}/month <span className="text-base font-semibold">{room.pricingType === 'perRoom' ? t('perRoom') : t('perStudent')}</span>
          </div>
          {room.note && (
            <div className="text-base font-bold text-gray-700 mt-1">
              {room.note}
            </div>
          )}
        </div>

        {/* Location */}
        <div className="flex items-center gap-2 text-gray-600 flex-shrink-0">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full flex items-center justify-center">
            <MapPin className="w-4 h-4 text-white" />
          </div>
          <span className="font-medium">{room.location}</span>
        </div>

        {/* Contact */}
        <div className="flex items-center gap-2 text-gray-600 flex-shrink-0">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
            <Phone className="w-4 h-4 text-white" />
          </div>
          <button
            onClick={handleCallClick}
            className="font-medium hover:text-blue-600 transition-colors"
            aria-label={t('callNow')}
          >
            {room.contact}
          </button>
        </div>

        {/* Enhanced Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-4 flex-shrink-0 mt-auto">
          <Button
            onClick={handleCallClick}
            className="contact-btn contact-btn-call flex items-center justify-center gap-2"
            size="sm"
          >
            <Phone className="w-4 h-4" />
            {t('callNow')}
          </Button>
          <Button
            onClick={handleMapClick}
            className="contact-btn contact-btn-map flex items-center justify-center gap-2"
            size="sm"
          >
            <ExternalLink className="w-4 h-4" />
            {t('viewOnMap')}
          </Button>
        </div>

        {/* Book Now Button */}
        <Button
          onClick={handleBookNow}
          className="w-full book-now-btn-high-contrast flex items-center justify-center gap-2 mt-3"
          size="sm"
        >
          <Calendar className="w-4 h-4" />
          {t('bookNow') || 'Book Now'}
        </Button>

        {/* Details Button */}
        <Button
          onClick={handleViewDetails}
          className="contact-btn contact-btn-details w-full flex items-center justify-center gap-2 mt-3"
        >
          {t('viewDetails')}
        </Button>

        {/* Edit Button for Admins */}
        {isAdmin && (
          <Button
            onClick={handleEdit}
            className="btn-secondary w-full flex items-center justify-center gap-2 mt-2"
            size="sm"
          >
            {t('update')}
          </Button>
        )}
      </div>
    </div>
  );
});

export default RoomCard;

