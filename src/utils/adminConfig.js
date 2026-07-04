// Admin password configuration
export const ADMIN_PASSWORDS = {
  '0147@May': { canCollectCash: false },
  '16Dec@1980': { canCollectCash: true },
};

/**
 * Validate admin password and return session config, or null if invalid.
 * @param {string} password
 * @returns {{ canCollectCash: boolean } | null}
 */
export function authenticateAdmin(password) {
  const config = ADMIN_PASSWORDS[password];
  if (!config) return null;
  return { canCollectCash: config.canCollectCash };
}
