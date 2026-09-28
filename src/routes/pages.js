const express = require('express');
const { requireAuth } = require('../middleware/auth');
const pages = require('../controllers/pagesController');

const router = express.Router();

router.get('/', requireAuth, pages.homePage);
router.get('/calls', requireAuth, pages.callsPage);
router.get('/call/active', requireAuth, pages.callActivePage);
router.get('/directory', requireAuth, pages.directoryPage);
router.get('/notifications', requireAuth, pages.notificationsPage);
router.get('/settings', requireAuth, pages.settingsPage);

module.exports = router;
