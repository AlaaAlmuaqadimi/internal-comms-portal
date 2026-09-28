const dataService = require('../services/dataService');
const accountService = require('../services/accountService');

const unique = (list, key) => [...new Set(list.map((p) => p[key]).filter(Boolean))];

/** Recent calls, restricted to contacts this user is allowed to reach. */
function callsFor(user) {
  const contacts = new Map(accountService.getContactsFor(user).map((c) => [c.id, c]));
  return dataService
    .getCalls()
    .filter((call) => contacts.has(call.contactId))
    .map((call) => ({ ...call, contact: contacts.get(call.contactId) }));
}

function homePage(req, res) {
  const contacts = accountService.getContactsFor(req.user);
  const calls = callsFor(req.user);
  res.render('pages/home', {
    title: 'الرئيسية',
    active: 'home',
    stats: {
      contacts: contacts.length,
      online: contacts.filter((c) => c.status === 'online').length,
      missed: calls.filter((c) => c.type === 'missed').length,
      unread: dataService.getNotifications().filter((n) => n.unread).length,
    },
    onlineContacts: contacts.filter((c) => c.status === 'online').slice(0, 6),
  });
}

function callsPage(req, res) {
  res.render('pages/calls', { title: 'المكالمات الأخيرة', active: 'calls', calls: callsFor(req.user) });
}

function callActivePage(req, res, next) {
  if (!req.query.contact) return res.redirect('/calls');
  const id = Number(req.query.contact);
  // Server-side permission check: only accounts chosen at registration.
  if (!Number.isInteger(id) || !accountService.canContact(req.user, id)) {
    const err = new Error('لا يمكنك التواصل مع هذا الحساب. يمكنك التواصل فقط مع الحسابات التي اخترتها عند إنشاء حسابك.');
    err.status = 403;
    return next(err);
  }
  const contacts = accountService.getContactsFor(req.user);
  return res.render('pages/call-active', {
    title: 'مكالمة صوتية',
    active: 'calls',
    caller: contacts.find((c) => c.id === id),
    participants: contacts.filter((c) => c.id !== id),
  });
}

function directoryPage(req, res) {
  const employees = accountService.getContactsFor(req.user);
  res.render('pages/directory', {
    title: 'دليل الموظفين',
    active: 'directory',
    employees,
    options: {
      departments: unique(employees, 'department'),
      sections: unique(employees, 'section'),
      regions: unique(employees, 'region'),
      titles: unique(employees, 'title'),
    },
  });
}

function notificationsPage(req, res) {
  res.render('pages/notifications', { title: 'الإشعارات', active: 'notifications', notifications: dataService.getNotifications() });
}

function settingsPage(req, res) {
  res.render('pages/settings', { title: 'الإعدادات', active: 'settings', contacts: accountService.getContactsFor(req.user), me: req.user });
}

module.exports = { callsFor, homePage, callsPage, callActivePage, directoryPage, notificationsPage, settingsPage };
