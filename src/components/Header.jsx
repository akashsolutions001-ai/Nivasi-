import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Phone, Shield, User, Settings, Calendar, MapPin, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import Logo from './Logo.jsx';
import LanguageSelector from './LanguageSelector.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { useUserPreferences } from '../contexts/UserPreferencesContext.jsx';

const Header = ({
    onShowProfile, // Kept for backwards compatibility but unused for profile nav
    onChangeLocation,
    onChangeGender,
    onContactUs,
    onShowBookingManagement
}) => {
    const { t } = useLanguage();
    const { selectedLocation, selectedGender, isAdmin, isGlobalAdmin, adminScope, setAdminSession } = useUserPreferences();
    const navigate = useNavigate();

    const handleAdminLogout = () => {
        setAdminSession(false);
    };

    const handleLocationClick = () => {
        if (isAdmin && !isGlobalAdmin && adminScope) {
            return; // College admin location is locked
        }
        if (onChangeLocation) onChangeLocation();
    };

    const adminLabel = isGlobalAdmin
        ? 'Global Admin'
        : (adminScope?.city ? `${adminScope.city} Admin` : (t('adminMode') || 'Admin Mode'));


    return (
        <header className="header-gradient text-white shadow-lg sticky top-0 z-40">
            <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3">
                {/* Mobile Layout - Optimized */}
                <div className="sm:hidden">
                    {/* Top Row - Logo, Title, Profile */}
                    <div className="flex items-center justify-between mb-2 px-1">
                        <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity min-w-0 flex-1 mr-2">
                            <Logo className="h-10 w-auto flex-shrink-0" />
                            <div className="flex flex-col min-w-0">
                                <h1 className="text-sm font-bold text-white leading-tight truncate">
                                    {t('title')}
                                </h1>
                                <p className="text-[10px] text-white/90 font-medium leading-none mt-0.5 truncate">
                                    Find perfect room
                                </p>
                            </div>
                        </Link>
                        {/* Profile button: relative + z-50 to sit above ::before overlay */}
                        <Button
                            onClick={() => navigate('/profile')}
                            variant="ghost"
                            size="sm"
                            className="relative z-50 px-2 h-9 min-h-0 text-white hover:bg-white/20 rounded-lg flex-shrink-0 flex items-center justify-center gap-1.5"
                            style={{ minHeight: 'unset' }}
                        >
                            <User className="w-5 h-5" />
                            <span className="text-xs font-medium">Profile</span>
                        </Button>
                    </div>

                    {/* 2×2 Grid Actions — mobile only, no scroll */}
                    <div className="grid grid-cols-2 gap-2">
                        {/* Location */}
                        <Button
                            onClick={handleLocationClick}
                            variant="outline"
                            disabled={isAdmin && !isGlobalAdmin}
                            className="w-full bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm text-xs min-h-[44px] px-3 rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-80"
                        >
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{selectedLocation ? selectedLocation.city : 'City'}</span>
                        </Button>

                        {/* Gender */}
                        <Button
                            onClick={onChangeGender}
                            variant="outline"
                            className="w-full bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm text-xs min-h-[44px] px-3 rounded-xl flex items-center justify-center gap-1.5"
                        >
                            <User className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{selectedGender ? (selectedGender === 'boy' ? 'Boy' : 'Girl') : 'Gender'}</span>
                        </Button>

                        {/* Language */}
                        <div className="w-full [&>div]:w-full [&>div>button]:w-full [&>div>button]:min-h-[44px] [&>div>button]:text-xs [&>div>button]:bg-white/20 [&>div>button]:border-white/30 [&>div>button]:text-white [&>div>button]:rounded-xl [&>div>button]:px-3 [&>div>button]:justify-center">
                            <LanguageSelector />
                        </div>

                        {/* Contact */}
                        <Button
                            onClick={onContactUs}
                            className="w-full btn-primary hover-lift text-xs min-h-[44px] px-3 rounded-xl flex items-center justify-center gap-1.5"
                        >
                            <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>Contact</span>
                        </Button>
                    </div>

                    {isAdmin && (
                        <div className="mt-2 grid grid-cols-2 gap-2">
                            <div className="col-span-2 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-white/20 border border-white/30 text-white text-xs font-semibold">
                                <Shield className="w-3.5 h-3.5" />
                                {adminLabel}
                            </div>
                            <Button
                                variant="outline"
                                onClick={onShowBookingManagement}
                                className="w-full bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm text-xs min-h-[44px] px-3 rounded-xl flex items-center justify-center gap-1.5"
                            >
                                <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                                <span>{t('manageBookings') || 'Bookings'}</span>
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleAdminLogout}
                                className="w-full bg-red-500/25 border-red-300/40 text-white hover:bg-red-500/35 backdrop-blur-sm text-xs min-h-[44px] px-3 rounded-xl flex items-center justify-center gap-1.5"
                            >
                                <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
                                <span>{t('logout')}</span>
                            </Button>
                        </div>
                    )}
                </div>

                {/* Desktop Layout */}
                <div className="hidden sm:flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center relative z-10 w-full">
                    <div className="flex flex-col xs:flex-row xs:items-center gap-2 sm:gap-4 w-full">
                        <Link to="/" className="flex items-center gap-3 mx-auto sm:mx-0 hover:opacity-90 transition-opacity">
                            <Logo size="large" />
                            <div className="text-center sm:text-left">
                                <h1 className="text-2xl xs:text-3xl font-bold text-white leading-tight">
                                    {t('title')}
                                </h1>
                                <p className="text-white text-sm flex flex-wrap justify-center sm:justify-start items-center gap-1">
                                    {t('tagline')}
                                </p>
                            </div>
                        </Link>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                        <LanguageSelector />
                        <Button
                            onClick={handleLocationClick}
                            variant="outline"
                            disabled={isAdmin && !isGlobalAdmin}
                            className="w-full sm:w-auto bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm disabled:opacity-80"
                        >
                            <Settings className="w-4 h-4 mr-2" />
                            {isAdmin && !isGlobalAdmin
                              ? (selectedLocation?.city || 'City')
                              : (selectedLocation ? 'Change City' : 'City')}
                        </Button>
                        <Button
                            onClick={onChangeGender}
                            variant="outline"
                            className="w-full sm:w-auto bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm"
                        >
                            <Settings className="w-4 h-4 mr-2" />
                            {selectedGender ? 'Change Gender' : 'Gender'}
                        </Button>


                        {isAdmin && (
                            <>
                                <div className="status-badge status-admin animate-fade-scale w-full sm:w-auto text-center">
                                    <Shield className="w-4 h-4 mr-1" />
                                    {adminLabel}
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={onShowBookingManagement}
                                    className="w-full sm:w-auto bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm"
                                >
                                    <Calendar className="w-4 h-4 mr-2" />
                                    {t('manageBookings') || 'Bookings'}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleAdminLogout}
                                    className="w-full sm:w-auto bg-red-500/25 border-red-300/40 text-white hover:bg-red-500/35 backdrop-blur-sm"
                                >
                                    <LogOut className="w-4 h-4 mr-2" />
                                    {t('logout')}
                                </Button>
                            </>
                        )}

                        <Button
                            onClick={onContactUs}
                            className="w-full sm:w-auto btn-primary hover-lift"
                        >
                            <Phone className="w-4 h-4 mr-2" />
                            For Room Registration Contact Us
                        </Button>

                        <Button
                            onClick={() => navigate('/profile')}
                            variant="outline"
                            className="w-full sm:w-auto bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm"
                        >
                            <User className="w-4 h-4 mr-2" />
                            profile
                        </Button>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
