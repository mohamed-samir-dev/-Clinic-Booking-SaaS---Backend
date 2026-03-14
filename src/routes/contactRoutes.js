const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');

router.post('/', contactController.createContactMessage);
router.get('/', contactController.getAllContactMessages);
router.get('/:id', contactController.getContactMessageById);
router.patch('/:id/status', contactController.updateContactMessageStatus);
router.delete('/:id', contactController.deleteContactMessage);

module.exports = router;
