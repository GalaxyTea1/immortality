import { ALLOW_CLIENT_STATE_SYNC } from '../config.js';
import { fail } from '../http/response.js';

export const requireClientStateSyncEnabled = (req, res, next) => {
  if (!ALLOW_CLIENT_STATE_SYNC) {
    return fail(res, 403, 'Client state sync is disabled. Use authoritative gameplay endpoints.');
  }

  return next();
};
