import { ALLOW_CLIENT_STATE_SYNC } from '../config.js';

export const requireClientStateSyncEnabled = (req, res, next) => {
  if (!ALLOW_CLIENT_STATE_SYNC) {
    return res.status(403).json({
      error: 'Client state sync is disabled. Use authoritative gameplay endpoints.',
    });
  }

  return next();
};
