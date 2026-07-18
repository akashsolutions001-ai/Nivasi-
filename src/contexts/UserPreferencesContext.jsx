import React, { createContext, useContext, useState, useEffect } from 'react';

const UserPreferencesContext = createContext();

export const useUserPreferences = () => {
    const context = useContext(UserPreferencesContext);
    if (!context) {
        throw new Error('useUserPreferences must be used within a UserPreferencesProvider');
    }
    return context;
};

const readAdminScope = () => {
    try {
        const raw = sessionStorage.getItem('adminScope');
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

export const UserPreferencesProvider = ({ children }) => {
    const [selectedGender, setSelectedGender] = useState(() => {
        return localStorage.getItem('userGender');
    });

    const [selectedStudentStream, setSelectedStudentStream] = useState(() => {
        return localStorage.getItem('userStudentStream') || null;
    });

    const [selectedLocation, setSelectedLocation] = useState(() => {
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

    const [isGlobalAdmin, setIsGlobalAdmin] = useState(() => {
        return sessionStorage.getItem('isGlobalAdmin') === 'true';
    });

    const [adminScope, setAdminScope] = useState(() => readAdminScope());

    /**
     * @param {boolean} active
     * @param {boolean|{ canCollectCash?: boolean, isGlobalAdmin?: boolean, adminScope?: object|null }} sessionOrCash
     */
    const setAdminSession = (active, sessionOrCash = {}) => {
        const session =
            typeof sessionOrCash === 'boolean'
                ? { canCollectCash: sessionOrCash, isGlobalAdmin: !!sessionOrCash, adminScope: null }
                : (sessionOrCash || {});

        setIsAdmin(!!active);
        if (!active) {
            setCanCollectCash(false);
            setIsGlobalAdmin(false);
            setAdminScope(null);
            return;
        }

        setCanCollectCash(!!session.canCollectCash);
        setIsGlobalAdmin(!!session.isGlobalAdmin);
        setAdminScope(session.isGlobalAdmin ? null : (session.adminScope || null));
    };

    useEffect(() => {
        if (isAdmin) {
            sessionStorage.setItem('isAdmin', 'true');
            if (canCollectCash) {
                sessionStorage.setItem('canCollectCash', 'true');
            } else {
                sessionStorage.removeItem('canCollectCash');
            }
            if (isGlobalAdmin) {
                sessionStorage.setItem('isGlobalAdmin', 'true');
                sessionStorage.removeItem('adminScope');
            } else {
                sessionStorage.removeItem('isGlobalAdmin');
                if (adminScope) {
                    sessionStorage.setItem('adminScope', JSON.stringify(adminScope));
                } else {
                    sessionStorage.removeItem('adminScope');
                }
            }
        } else {
            sessionStorage.removeItem('isAdmin');
            sessionStorage.removeItem('canCollectCash');
            sessionStorage.removeItem('isGlobalAdmin');
            sessionStorage.removeItem('adminScope');
            setCanCollectCash(false);
            setIsGlobalAdmin(false);
            setAdminScope(null);
        }
    }, [isAdmin, canCollectCash, isGlobalAdmin, adminScope]);

    // College admins stay locked to their college location for filtering
    useEffect(() => {
        if (isAdmin && !isGlobalAdmin && adminScope?.city && adminScope?.college) {
            setSelectedLocation({
                city: adminScope.city,
                college: adminScope.college,
                studentStream: adminScope.studentStream
            });
            if (adminScope.studentStream) {
                setSelectedStudentStream(adminScope.studentStream);
            }
        }
    }, [isAdmin, isGlobalAdmin, adminScope, setSelectedLocation, setSelectedStudentStream]);

    useEffect(() => {
        if (selectedGender) {
            localStorage.setItem('userGender', selectedGender);
        }
    }, [selectedGender]);

    useEffect(() => {
        if (selectedStudentStream) {
            localStorage.setItem('userStudentStream', selectedStudentStream);
        }
    }, [selectedStudentStream]);

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
        selectedStudentStream,
        setSelectedStudentStream,
        selectedLocation,
        setSelectedLocation,
        hasAcceptedTerms,
        setHasAcceptedTerms,
        isAdmin,
        setIsAdmin,
        canCollectCash,
        setCanCollectCash,
        isGlobalAdmin,
        adminScope,
        setAdminSession
    };

    return (
        <UserPreferencesContext.Provider value={value}>
            {children}
        </UserPreferencesContext.Provider>
    );
};
