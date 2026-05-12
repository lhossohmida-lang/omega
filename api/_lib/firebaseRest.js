// Firestore REST API utilities — no Firebase Admin SDK / service account needed
const PROJECT_ID = 'basst-omeeega';
const API_KEY = 'AIzaSyCCeuNEpe9jeBzJAi8JEagntMUB7fpfCfM';
const FS_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// ── Value conversions ─────────────────────────────────────────────────────────

function fromFsValue(v) {
  if (!v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return new Date(v.timestampValue);
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromFsValue);
  if ('mapValue' in v) return fromFsFields(v.mapValue.fields || {});
  return null;
}

function fromFsFields(fields) {
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, fromFsValue(v)]));
}

function toFsValue(v) {
  if (v === null || v === undefined) return { nullValue: 'NULL_VALUE' };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (typeof v === 'number') {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFsValue) } };
  if (typeof v === 'object') return { mapValue: { fields: toFsFields(v) } };
  return { nullValue: 'NULL_VALUE' };
}

function toFsFields(obj) {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, toFsValue(v)]));
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

async function fsRequest(method, path, body, idToken) {
  const url = `${FS_BASE}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
  const res = await fetch(url, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Firestore error ${res.status}`);
  }
  return res.json().catch(() => null);
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function verifyIdToken(idToken) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Invalid ID token');
  }
  const data = await res.json();
  return data.users?.[0] || null;
}

// ── Firestore operations ──────────────────────────────────────────────────────

export async function getDoc(collection, docId, idToken) {
  try {
    const doc = await fsRequest('GET', `/${collection}/${docId}`, undefined, idToken);
    return { exists: true, id: docId, data: () => fromFsFields(doc.fields || {}) };
  } catch (e) {
    if (e.message.includes('NOT_FOUND') || e.message.includes('not found')) {
      return { exists: false, id: docId, data: () => null };
    }
    throw e;
  }
}

export async function listDocs(collection, idToken, pageSize = 1000) {
  const res = await fsRequest('GET', `/${collection}?pageSize=${pageSize}`, undefined, idToken);
  return (res?.documents || []).map(doc => ({
    id: doc.name.split('/').pop(),
    data: () => fromFsFields(doc.fields || {}),
  }));
}

export async function runQuery(structuredQuery, idToken) {
  const res = await fsRequest('POST', ':runQuery', { structuredQuery }, idToken);
  return (Array.isArray(res) ? res : [])
    .filter(r => r.document)
    .map(r => ({
      id: r.document.name.split('/').pop(),
      data: () => fromFsFields(r.document.fields || {}),
    }));
}

export async function queryDocs(collection, idToken, options = {}) {
  const structuredQuery = { from: [{ collectionId: collection }] };
  if (options.orderBy) {
    structuredQuery.orderBy = options.orderBy.map(([field, dir]) => ({
      field: { fieldPath: field },
      direction: dir || 'ASCENDING',
    }));
  }
  if (options.limit) structuredQuery.limit = options.limit;
  if (options.where) structuredQuery.where = options.where;
  return runQuery(structuredQuery, idToken);
}

export async function queryWhere(collection, field, value, idToken) {
  return queryDocs(collection, idToken, {
    where: {
      fieldFilter: {
        field: { fieldPath: field },
        op: 'EQUAL',
        value: toFsValue(value),
      },
    },
  });
}

export async function addDoc(collection, data, idToken) {
  const res = await fsRequest('POST', `/${collection}`, { fields: toFsFields(data) }, idToken);
  return res?.name?.split('/').pop() || null;
}

export async function updateDoc(collection, docId, data, idToken) {
  const params = new URLSearchParams();
  for (const key of Object.keys(data)) {
    params.append('updateMask.fieldPaths', key);
  }
  return fsRequest('PATCH', `/${collection}/${docId}?${params}`, { fields: toFsFields(data) }, idToken);
}

export async function deleteDoc(collection, docId, idToken) {
  return fsRequest('DELETE', `/${collection}/${docId}`, undefined, idToken);
}
