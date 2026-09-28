const crypto = require('crypto');
const { readJson, writeJson } = require('./dataService');

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
    department: a.department || '',
    section: a.section || '',
    office: a.office || '',
    region: a.region || '',
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
    department: data.department,
    section: data.section,
    office: data.office,
    region: data.region,
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

/** The ONLY accounts this user may see and contact. */
function getContactsFor(user) {
  const allowed = new Set(user.allowedContacts || []);
  return getAllProfiles().filter((p) => allowed.has(p.id) && p.id !== user.id);
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
  getContactsFor,
  canContact,
};
