const express = require('express');
const router = express.Router();
const ownerController = require('../controllers/ownerController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/profile', ownerController.getProfile);
router.get('/stats', ownerController.getStats);
router.get('/dashboard', ownerController.getDashboard);
router.get('/clinics', ownerController.getClinics);
router.get('/clinics/:id', ownerController.getClinic);
router.post('/clinics', ownerController.createClinic);
router.put('/clinics/:id', ownerController.updateClinic);
router.get('/doctors', ownerController.getDoctors);
router.post('/doctors', ownerController.createDoctor);
router.put('/doctors/:id', ownerController.updateDoctor);
router.delete('/doctors/:id', ownerController.deleteDoctor);
router.get('/managers', ownerController.getManagers);
router.get('/managers/:id', ownerController.getManager);
router.post('/managers', ownerController.createManager);
router.put('/managers/:id', ownerController.updateManager);
router.delete('/managers/:id', ownerController.deleteManager);
router.put('/profile', ownerController.updateProfile);
router.get('/main-clinic', ownerController.getMainClinic);
router.put('/main-clinic', ownerController.updateMainClinic);
router.get('/business', ownerController.getBusiness);
router.put('/business', ownerController.updateBusiness);

module.exports = router;
