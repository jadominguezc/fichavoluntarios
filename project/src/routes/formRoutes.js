const express = require('express');
const router = express.Router();
const formController = require('../controllers/formController');
const upload = require('../middlewares/multerConfig');

// Ruta raíz: redirige a la página 1 del formulario
router.get('/', (req, res) => {
    res.redirect('/form/page1'); // Redirige a la primera página del formulario
});

// Rutas GET para cada página del formulario
router.get('/form/page1', formController.getPage1);
router.get('/form/page2', formController.getPage2);
router.get('/form/page3', formController.getPage3);
router.get('/form/page4', formController.getPage4);
router.get('/form/page5', formController.getPage5);

// Ruta GET para la página de confirmación
router.get('/form/confirm', formController.getConfirm);

// Rutas POST para manejar datos del formulario
router.post('/form/page1', formController.handlePage1Data);
router.post('/form/page2', formController.handleFamilyData);
router.post('/form/page3', formController.handlePage3Data); // Nueva función para manejar datos de la página 3
router.post('/form/page4', upload.fields([
    { name: 'backgroundCheck', maxCount: 1 },
    { name: 'disqualificationRecord', maxCount: 1 },
]), formController.handlePage4Data);
router.post('/form/page5', formController.handlePage5Data); // Nueva función para manejar datos de la página 5

// Envío final del formulario
router.post('/form/submit', formController.submitForm);

module.exports = router;
