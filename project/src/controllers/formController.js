const Form = require('../models/Form');
const ExcelJS = require('exceljs');
const path = require('path');
const nodemailer = require('../services/emailService');
const fs = require('fs');

// Renderizar las páginas del formulario
exports.getPage1 = (req, res) => {
    res.render('forms/page1', { currentPage: 1 });
};

exports.getPage2 = (req, res) => {
    console.log('Datos de la página 1:', req.session.page1Data || 'No hay datos');
    res.render('forms/page2', { currentPage: 2 });
};

exports.getPage3 = (req, res) => {
    console.log('Datos de la página 2 (Familiares):', req.session.familyData || 'No hay datos');
    res.render('forms/page3', { currentPage: 3 });
};

exports.getPage4 = (req, res) => {
    console.log('Datos de la página 3:', req.session.page3Data || 'No hay datos');
    res.render('forms/page4', { currentPage: 4 });
};

exports.getPage5 = (req, res) => {
    console.log('Datos de la página 4:', req.session.page4Data || 'No hay datos');
    res.render('forms/page5', { currentPage: 5 });
};

// Manejar los datos de la página 1
exports.handlePage1Data = (req, res) => {
    req.session.page1Data = req.body; // Guardar los datos de la página 1 en la sesión
    console.log('Datos guardados de la página 1:', req.session.page1Data);
    res.redirect('/form/page2'); // Redirigir a la página 2
};

// Manejar los datos de la página 2 (Familiares)
exports.handleFamilyData = (req, res) => {
    req.session.familyData = req.body.family || []; // Guardar datos de la página 2 en la sesión
    console.log('Datos guardados de la familia:', req.session.familyData);
    res.redirect('/form/page3'); // Redirigir a la página 3
};

// Manejar los datos de la página 3
exports.handlePage3Data = (req, res) => {
    req.session.page3Data = req.body; // Guardar los datos en la sesión
    console.log('Datos guardados de la página 3:', req.session.page3Data);
    res.redirect('/form/page4'); // Redirigir a la página 4
};

// Manejar los datos de la página 4
exports.handlePage4Data = (req, res) => {
    const { files } = req;

    const backgroundCheckPath = files.backgroundCheck ? files.backgroundCheck[0].path : null;
    const disqualificationRecordPath = files.disqualificationRecord ? files.disqualificationRecord[0].path : null;

    // Verificar si los archivos existen
    if (backgroundCheckPath && !fs.existsSync(backgroundCheckPath)) {
        return res.status(400).send('Error: No se pudo encontrar el archivo de antecedentes.');
    }
    if (disqualificationRecordPath && !fs.existsSync(disqualificationRecordPath)) {
        return res.status(400).send('Error: No se pudo encontrar el archivo de registro de inhabilidades.');
    }

    req.session.page4Data = {
        backgroundCheck: backgroundCheckPath,
        disqualificationRecord: disqualificationRecordPath,
    };

    console.log('Datos guardados de la página 4:', req.session.page4Data);
    res.redirect('/form/page5');
};

// Manejar los datos de la página 5
exports.handlePage5Data = (req, res) => {
    req.session.page5Data = {
        allergies: req.body.allergies || null,
        emergencyMeds: req.body.emergencyMeds || null,
        healthIssues: req.body.healthIssues || null,
        continuousTreatment: req.body.continuousTreatment || null,
        medicalInsurance: req.body.medicalInsurance || null,
        emergencyContacts: req.body.emergencyContacts || [],
    };

    console.log('Datos guardados de la página 5:', req.session.page5Data);

    // En lugar de redirigir a /form/submit con GET, ejecutamos la lógica de envío directamente
    res.redirect('/form/confirm');
};

// Renderizar una página de confirmación previa al envío
exports.getConfirm = (req, res) => {
    try {
        // Combina todos los datos de la sesión para pasarlos a la vista
        const formData = {
            ...req.session.page1Data,
            family: req.session.familyData || [],
            education: req.session.page3Data || {},
            documentation: req.session.page4Data || {},
            medicalHistory: req.session.page5Data || {}
        };

        console.log('Datos para la confirmación:', formData); // Asegúrate de que los datos sean correctos
        res.render('forms/confirm', { formData }); // Renderiza la vista de confirmación con los datos
    } catch (error) {
        console.error('Error al cargar la confirmación:', error.message);
        res.status(500).send('Error al cargar la confirmación');
    }
};

// Manejar el envío final del formulario
exports.submitForm = async (req, res) => {
    try {
        // Combinar todos los datos de la sesión
        const formData = {
            ...req.session.page1Data,
            family: req.session.familyData || [],
            education: req.session.page3Data || {},
            documentation: req.session.page4Data || {},
            medicalHistory: req.session.page5Data || {},
        };

        console.log('Datos completos para guardar:', formData);

        // Validar campos obligatorios de antecedentes médicos
        const medicalHistory = formData.medicalHistory;
        if (
            !medicalHistory.allergies ||
            !medicalHistory.emergencyMeds ||
            !medicalHistory.healthIssues ||
            !medicalHistory.continuousTreatment ||
            !medicalHistory.emergencyContacts.length
        ) {
            throw new Error('Todos los campos de antecedentes médicos son obligatorios.');
        }

        // Guardar los datos en la base de datos
        const newForm = new Form(formData);
        await newForm.save();

        // Crear archivo Excel
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Volunteers');
        worksheet.columns = [
            { header: 'Campo', key: 'campo', width: 30 },
            { header: 'Respuesta', key: 'respuesta', width: 50 },
        ];

        Object.entries(formData).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                value.forEach((item, index) =>
                    worksheet.addRow({ campo: `${key}[${index}]`, respuesta: JSON.stringify(item) })
                );
            } else if (typeof value === 'object') {
                Object.entries(value).forEach(([subKey, subValue]) => {
                    worksheet.addRow({ campo: `${key}.${subKey}`, respuesta: subValue });
                });
            } else {
                worksheet.addRow({ campo: key, respuesta: value });
            }
        });

        // Ruta del archivo Excel
        const excelPath = path.join(__dirname, '../../uploads/Volunteers.xlsx');
        await workbook.xlsx.writeFile(excelPath);

        // Configurar adjuntos para el correo
        const attachments = [
            {
                filename: 'Volunteers.xlsx',
                path: excelPath,
            },
        ];

        // Adjuntar los documentos PDF si existen y verificar sus rutas
        const documentation = formData.documentation;

        if (documentation.backgroundCheck && fs.existsSync(documentation.backgroundCheck)) {
            console.log('Adjuntando Certificado de Antecedentes:', documentation.backgroundCheck);
            attachments.push({
                filename: 'Certificado de Antecedentes.pdf',
                path: documentation.backgroundCheck,
            });
        } else {
            console.warn('El archivo de antecedentes no existe o la ruta es inválida.');
        }

        if (documentation.disqualificationRecord && fs.existsSync(documentation.disqualificationRecord)) {
            console.log('Adjuntando Registro de Inhabilidades:', documentation.disqualificationRecord);
            attachments.push({
                filename: 'Registro de Inhabilidades.pdf',
                path: documentation.disqualificationRecord,
            });
        } else {
            console.warn('El archivo de inhabilidades no existe o la ruta es inválida.');
        }

        console.log('Adjuntos finales:', attachments);

        // Personalizar el asunto del correo con el nombre completo
        const fullName = formData.fullName || 'Voluntario';
        const emailSubject = `Ficha de Voluntario: ${fullName}`;

        // Enviar correo
        await nodemailer.sendEmail(
            'volunteerskidstweens@armglobal.org',
            emailSubject,
            'Adjunto encontrarás el formulario enviado y los documentos asociados.',
            attachments
        );

        // Limpiar la sesión y redirigir al inicio
        req.session.destroy();
        res.redirect('/form/page1');
    } catch (error) {
        console.error('Error al enviar el formulario:', error.message);
        res.status(400).send(error.message);
    }
};
