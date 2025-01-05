const express = require('express');
const router = express.Router();
const formController = require('../controllers/formController');

// Ruta raíz: renderiza directamente page1.handlebars
router.get('/', formController.getPage1);

// Routes for each form page (GET)
router.get('/form/page1', formController.getPage1);
router.get('/form/page2', formController.getPage2);
router.get('/form/page3', formController.getPage3);
router.get('/form/page4', formController.getPage4);
router.get('/form/page5', formController.getPage5);

// POST routes for form submissions
router.post('/form/page2', formController.handleFamilyData); // POST para procesar los datos de la familia
router.post('/form/page3', formController.getPage3); // Si necesitas procesar algo en page3, puedes ajustar aquí
router.post('/form/page4', formController.getPage4);
router.post('/form/page5', formController.getPage5);

// Form submission route (Final)
router.post('/form/submit', formController.submitForm);

module.exports = router;
