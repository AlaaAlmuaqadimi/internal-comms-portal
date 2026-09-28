const crypto = require('crypto');
const { readJson, writeJson } = require('./dataService');
const org = require('./orgService');

const KEY_LEN = 64;
const DUMMY_SALT = crypto.randomBytes(16).toString('hex');

const getSeedAccounts = () => readJson('accounts.json');
const getUsers = () => readJson('users.json');

/** Public profile: never includes credentials or the permission list. */
function toProfile(a) {
  return {
    id: a.id,
    name: a.name,
    title: a.title || '',
    unitId: a.unitId || '',
    ...org.describe(a.unitId),
    status: a.status || 'offline',
    avatar: a.avatar || '',
    avatarAlt: a.avatarAlt || '',
  };
}

/** Every account that exists: seeded employees + registered users. */
function getAllProfiles() {
  return [...getSeedAccounts(), ...getUsers()].map(toProfile);
}

const findProfile = (id) => getAllProfiles().find((p) => p.id === Number(id)) || null;
const findUserById = (id) => getUsers().find((u) => u.id === Number(id)) || null;
const findUserByUsername = (name) => {
  const n = String(name || '').trim().toLowerCase();
  return getUsers().find((u) => u.username === n) || null;
};

const derive = (password, salt) => crypto.scryptSync(password, salt, KEY_LEN);

function verifyPassword(password, user) {
  const expected = Buffer.from(user.passwordHash, 'hex');
  const actual = derive(password, user.passwordSalt);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

/** Spend the same time as a real check so unknown usernames aren't distinguishable. */
function burnVerify(password) {
  derive(password, DUMMY_SALT);
}

function nextId() {
  return Math.max(0, ...getSeedAccounts().map((a) => a.id), ...getUsers().map((u) => u.id)) + 1;
}

function createUser(data) {
  const users = getUsers();
  const salt = crypto.randomBytes(16).toString('hex');
  const user = {
    id: nextId(),
    username: data.username.toLowerCase(),
    passwordSalt: salt,
    passwordHash: derive(data.password, salt).toString('hex'),
    name: data.name,
    title: data.title,
    unitId: data.unitId,
    status: 'online',
    avatar: '',
    avatarAlt: '',
    allowedContacts: data.allowedContacts,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  writeJson('users.json', users);
  return user;
}

function setStatus(id, status) {
  const users = getUsers();
  const user = users.find((u) => u.id === Number(id));
  if (user) {
    user.status = status;
    writeJson('users.json', users);
  }
}

const RELATION_ORDER = [
  ['manager', 'مديرك المباشر'],
  ['same', 'نفس المستوى الإداري (زملاء وحدتك والوحدات الشقيقة)'],
  ['below', 'الحسابات التي تندرج أسفل وحدتك'],
];

/**
 * Accounts a person placed in `unitId` may be allowed to contact, according to the
 * hierarchy: their manager, the same administrative level, or anyone below them.
 */
function getCandidates(unitId, excludeId = null) {
  if (!org.isSelectable(unitId)) return [];
  const rel = org.relatives(unitId);
  const out = [];
  getAllProfiles().forEach((p) => {
    if (p.id === excludeId) return;
    let relation = null;
    if (rel.same.has(p.unitId)) relation = 'same';
    else if (rel.below.has(p.unitId)) relation = 'below';
    else if (rel.manager.has(p.unitId)) relation = 'manager';
    if (relation) out.push({ ...p, relation });
  });
  return out;
}

function groupByRelation(candidates) {
  return RELATION_ORDER.map(([key, label]) => ({ key, label, items: candidates.filter((c) => c.relation === key) })).filter((g) => g.items.length);
}

const parseIds = (value) => [...new Set([].concat(value || []).map(Number))].filter(Number.isInteger);

function setAllowedContacts(id, ids) {
  const users = getUsers();
  const user = users.find((u) => u.id === Number(id));
  if (user) {
    user.allowedContacts = ids;
    writeJson('users.json', users);
  }
}

/**
 * The ONLY accounts this user may see and contact: what they chose AND what the
 * hierarchy currently allows (so a stale choice can never bypass the structure).
 */
function getContactsFor(user) {
  const allowed = new Set(user.allowedContacts || []);
  return getCandidates(user.unitId, user.id).filter((c) => allowed.has(c.id));
}

const canContact = (user, id) => getContactsFor(user).some((p) => p.id === Number(id));

module.exports = {
  toProfile,
  getAllProfiles,
  findProfile,
  findUserById,
  findUserByUsername,
  verifyPassword,
  burnVerify,
  createUser,
  setStatus,
  getCandidates,
  groupByRelation,
  parseIds,
  setAllowedContacts,
  getContactsFor,
  canContact,
};
