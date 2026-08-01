import {
  DEFAULT_PLATFORM_CITY,
  DEFAULT_PLATFORM_COLLEGE,
  roomMatchesUserLocation
} from './locationOptions.js';

const DY_PATIL_MEDICAL_KOLHAPUR = 'Dr. D. Y. Patil Medical College, Kolhapur';

/**
 * Admin passwords and roles:
 * - college: can manage only rooms for a specific city + college
 * - global: can manage all rooms (and platform-wide tools)
 */
export const ADMIN_PASSWORDS = {
  // DYPSN Engineering (Kolhapur) college admin
  '0147@May': {
    role: 'college',
    canCollectCash: false,
    city: DEFAULT_PLATFORM_CITY,
    college: DEFAULT_PLATFORM_COLLEGE,
    studentStream: 'engineering'
  },
  // Global admin
  '16Dec@1980': {
    role: 'global',
    canCollectCash: true
  },
  // Dr. D. Y. Patil Medical College, Kolhapur college admin
  'DrJuly18@2026': {
    role: 'college',
    canCollectCash: false,
    city: 'Kolhapur',
    college: DY_PATIL_MEDICAL_KOLHAPUR,
    studentStream: 'medical',
    name: 'VIJAY BIRAJDAR',
    profilePicture: '/ADMIN PROFILE/DYPMEDICAL1_converted.avif'
  }
};

/**
 * Validate admin password and return session config, or null if invalid.
 * @param {string} password
 * @returns {{ canCollectCash: boolean, isGlobalAdmin: boolean, adminScope: {city:string,college:string,studentStream?:string}|null } | null}
 */
export function authenticateAdmin(password) {
  const config = ADMIN_PASSWORDS[password];
  if (!config) return null;

  const isGlobalAdmin = config.role === 'global';
  return {
    canCollectCash: !!config.canCollectCash,
    isGlobalAdmin,
    adminScope: isGlobalAdmin
      ? null
      : {
          city: config.city || DEFAULT_PLATFORM_CITY,
          college: config.college || DEFAULT_PLATFORM_COLLEGE,
          studentStream: config.studentStream || 'engineering'
        },
    adminName: config.name || null,
    adminProfilePicture: config.profilePicture || null
  };
}

/** Whether this admin session may manage the given room. */
export function adminCanManageRoom(room, { isAdmin, isGlobalAdmin, adminScope } = {}) {
  if (!isAdmin) return false;
  if (isGlobalAdmin) return true;
  if (!adminScope) return false;
  return roomMatchesUserLocation(room, adminScope);
}
