import React, { createContext, useContext, useState, useEffect } from 'react';

const UserPreferencesContext = createContext();

export const useUserPreferences = () => {
    const context = useContext(UserPreferencesContext);
    if (!context) {
        throw new Error('useUserPreferences must be used within a UserPreferencesProvider');
    }
    return context;
};

export const UserPreferencesProvider = ({ children }) => {
    const [selectedGender, setSelectedGender] = useState(() => {
        return localStorage.getItem('userGender');
    });

    const [selectedLocation, setSelectedLocation] = useState(() => {
        // Initialize from localStorage if available
        const saved = localStorage.getItem('userLocation');
        return saved ? JSON.parse(saved) : null;
    });

    const [hasAcceptedTerms, setHasAcceptedTerms] = useState(() => {
        return localStorage.getItem('hasAcceptedTerms') === 'true';
    });

    const [isAdmin, setIsAdmin] = useState(() => {
        return sessionStorage.getItem('isAdmin') === 'true';
    });

    const [canCollectCash, setCanCollectCash] = useState(() => {
        return sessionStorage.getItem('canCollectCash') === 'true';
    });

    const setAdminSession = (active, cashCollection = false) => {
        setIsAdmin(active);
        setCanCollectCash(active && cashCollection);
    };

    useEffect(() => {
        if (isAdmin) {
            console.log('[admin] admin session active: preserving admin mode');
            sessionStorage.setItem('isAdmin', 'true');
            if (canCollectCash) {
                sessionStorage.setItem('canCollectCash', 'true');
            } else {
                sessionStorage.removeItem('canCollectCash');
            }
        } else {
            sessionStorage.removeItem('isAdmin');
            sessionStorage.removeItem('canCollectCash');
            setCanCollectCash(false);
        }
    }, [isAdmin, canCollectCash]);

    // Persist changes to localStorage
    useEffect(() => {
        if (selectedGender) {
            localStorage.setItem('userGender', selectedGender);
        }
    }, [selectedGender]);

    useEffect(() => {
        if (selectedLocation) {
            localStorage.setItem('userLocation', JSON.stringify(selectedLocation));
        }
    }, [selectedLocation]);

    useEffect(() => {
        if (hasAcceptedTerms) {
            localStorage.setItem('hasAcceptedTerms', 'true');
        }
    }, [hasAcceptedTerms]);


    const value = {
        selectedGender,
        setSelectedGender,
        selectedLocation,
        setSelectedLocation,
        hasAcceptedTerms,
        setHasAcceptedTerms,
        isAdmin,
        setIsAdmin,
        canCollectCash,
        setCanCollectCash,
        setAdminSession
    };

    return (
        <UserPreferencesContext.Provider value={value}>
            {children}
        </UserPreferencesContext.Provider>
    );
};
