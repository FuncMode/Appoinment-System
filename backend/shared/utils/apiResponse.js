// backend/shared/utils/apiResponse.js
// Consistent JSON envelope sa LAHAT ng responses: { success, message?, data?, meta? }
// (API contract consistency — tingnan ang docs/BACKEND_ARCHITECTURE.md).

export const ok = (res, data = null, meta = undefined) =>
  res.status(200).json(meta ? { success: true, data, meta } : { success: true, data });

export const created = (res, data = null) => res.status(201).json({ success: true, data });

export const noContent = (res) => res.status(204).send();

export const fail = (res, status, message, details = undefined) =>
  res.status(status).json(details ? { success: false, message, details } : { success: false, message });

export default { ok, created, noContent, fail };
