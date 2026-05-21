export const ok = (res, data = null, meta = undefined) => {
  const body = { success: true, data };
  if (meta !== undefined) body.meta = meta;
  return res.json(body);
};

export const created = (res, data = null, meta = undefined) => {
  const body = { success: true, data };
  if (meta !== undefined) body.meta = meta;
  return res.status(201).json(body);
};

export const fail = (res, status, message, details = undefined) => {
  const error = { message };
  if (details !== undefined) error.details = details;
  return res.status(status).json({ success: false, error });
};

export const failFromError = (res, error, fallbackMessage) => {
  if (error.status) {
    return fail(res, error.status, error.message, error.details);
  }
  return fail(res, 500, fallbackMessage);
};
