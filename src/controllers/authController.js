const crypto = require('crypto');
const accountService = require('../services/accountService');
const { safeNext } = require('../middleware/auth');

const clean = (v, max = 100) => String(v || '').replace(/\s+/g, ' ').trim().slice(0, max);
const unique = (list, key) => [...new Set(list.map((p) => p[key]).filter(Boolean))];

function startSession(req, user) {
  // Fresh session object (new CSRF token) on every login.
  req.session = { userId: user.id, csrf: crypto.randomBytes(24).toString('hex') };
}

function showLogin(req, res) {
  res.render('pages/login', { title: 'تسجيل الدخول', next: safeNext(req.query.next), errors: [], values: {} });
}

function login(req, res) {
  const username = clean(req.body.username, 30);
  const password = String(req.body.password || '');
  const next = safeNext(req.body.next);
  const user = accountService.findUserByUsername(username);

  let ok = false;
  if (user) ok = accountService.verifyPassword(password, user);
  else accountService.burnVerify(password);

  if (!ok) {
    return res.status(401).render('pages/login', {
      title: 'تسجيل الدخول', next, errors: ['اسم المستخدم أو كلمة المرور غير صحيحة.'], values: { username },
    });
  }
  startSession(req, user);
  accountService.setStatus(user.id, 'online');
  return res.redirect(next);
}

function renderRegister(res, status, errors, values) {
  const profiles = accountService.getAllProfiles();
  res.status(status).render('pages/register', {
    title: 'إنشاء حساب',
    errors,
    values,
    profiles,
    departments: unique(profiles, 'department'),
    regions: unique(profiles, 'region'),
  });
}

function showRegister(req, res) {
  renderRegister(res, 200, [], { contacts: [] });
}

function register(req, res) {
  const b = req.body;
  const password = String(b.password || '');
  const profiles = accountService.getAllProfiles();
  const departments = unique(profiles, 'department');
  const regions = unique(profiles, 'region');
  const availableIds = new Set(profiles.map((p) => p.id));

  const contacts = [...new Set([].concat(b.contacts || []).map(Number))].filter((id) => Number.isInteger(id) && availableIds.has(id));

  const values = {
    name: clean(b.name, 60),
    username: clean(b.username, 30),
    title: clean(b.title, 60),
    department: clean(b.department),
    region: clean(b.region),
    section: clean(b.section, 60),
    office: clean(b.office, 60),
    contacts,
  };

  const errors = [];
  if (values.name.length < 3) errors.push('الاسم الكامل مطلوب (3 أحرف على الأقل).');
  if (!/^[A-Za-z0-9_.-]{3,30}$/.test(values.username)) errors.push('اسم المستخدم يجب أن يتكوّن من 3–30 حرفًا إنجليزيًا أو أرقامًا أو (_ . -).');
  else if (accountService.findUserByUsername(values.username)) errors.push('اسم المستخدم مستخدم بالفعل، اختر اسمًا آخر.');
  if (password.length < 8) errors.push('كلمة المرور يجب ألا تقل عن 8 أحرف.');
  if (password.length > 72) errors.push('كلمة المرور طويلة جدًا (72 حرفًا كحد أقصى).');
  if (password !== String(b.confirm || '')) errors.push('تأكيد كلمة المرور غير مطابق.');
  if (values.title.length < 2) errors.push('المسمى الوظيفي مطلوب.');
  if (!departments.includes(values.department)) errors.push('اختر الإدارة من القائمة.');
  if (!regions.includes(values.region)) errors.push('اختر المنطقة من القائمة.');
  if (contacts.length === 0) errors.push('اختر حسابًا واحدًا على الأقل من الحسابات التي يمكنك التواصل معها.');

  if (errors.length) return renderRegister(res, 400, errors, values);

  const user = accountService.createUser({ ...values, password, allowedContacts: contacts });
  startSession(req, user);
  return res.redirect('/');
}

function logout(req, res) {
  if (req.user) accountService.setStatus(req.user.id, 'offline');
  req.session = null;
  res.redirect('/login');
}

module.exports = { showLogin, login, showRegister, register, logout };
