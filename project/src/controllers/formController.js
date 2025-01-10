const Form = require('../models/Form');
const ExcelJS = require('exceljs');
const path = require('path');
const nodemailer = require('../services/emailService');
const fs = require('fs');

// Crear la carpeta uploads si no existe
const ensureUploadsDir = () => {
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log('Carpeta /uploads creada correctamente.');
    }
};

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
    req.session.page1Data = req.body;
    console.log('Datos guardados de la página 1:', req.session.page1Data);
    res.redirect('/form/page2');
};

// Manejar los datos de la página 2 (Familiares)
exports.handleFamilyData = (req, res) => {
    req.session.familyData = req.body.family || [];
    console.log('Datos guardados de la familia:', req.session.familyData);
    res.redirect('/form/page3');
};

// Manejar los datos de la página 3
exports.handlePage3Data = (req, res) => {
    req.session.page3Data = req.body;
    console.log('Datos guardados de la página 3:', req.session.page3Data);
    res.redirect('/form/page4');
};

// Manejar los datos de la página 4
exports.handlePage4Data = (req, res) => {
    const { files } = req;

    const backgroundCheckPath = files.backgroundCheck ? files.backgroundCheck[0].path : null;
    const disqualificationRecordPath = files.disqualificationRecord ? files.disqualificationRecord[0].path : null;
    const photoPath = files.photo ? files.photo[0].path : null;

    // Verificar existencia de archivos
    if (backgroundCheckPath && !fs.existsSync(backgroundCheckPath)) {
        return res.status(400).send('Error: No se pudo encontrar el archivo de antecedentes.');
    }
    if (disqualificationRecordPath && !fs.existsSync(disqualificationRecordPath)) {
        return res.status(400).send('Error: No se pudo encontrar el archivo de registro de inhabilidades.');
    }
    if (photoPath && !fs.existsSync(photoPath)) {
        return res.status(400).send('Error: No se pudo encontrar la fotografía.');
    }

    req.session.page4Data = {
        backgroundCheck: backgroundCheckPath,
        disqualificationRecord: disqualificationRecordPath,
        photo: photoPath,
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
    res.redirect('/form/confirm');
};

// Renderizar página de confirmación
exports.getConfirm = (req, res) => {
    try {
        const formData = {
            ...req.session.page1Data,
            family: req.session.familyData || [],
            education: req.session.page3Data || {},
            documentation: req.session.page4Data || {},
            medicalHistory: req.session.page5Data || {}
        };

        console.log('Datos para la confirmación:', formData);
        res.render('forms/confirm', { formData });
    } catch (error) {
        console.error('Error al cargar la confirmación:', error.message);
        res.status(500).send('Error al cargar la confirmación');
    }
};

// Manejar el envío final del formulario
exports.submitForm = async (req, res) => {
    try {
        ensureUploadsDir(); // Asegurar que la carpeta uploads exista

        const formData = {
            ...req.session.page1Data,
            family: req.session.familyData || [],
            education: req.session.page3Data || {},
            documentation: req.session.page4Data || {},
            medicalHistory: req.session.page5Data || {},
        };

        // Guardar los datos en la base de datos
        const newForm = new Form(formData);
        await newForm.save();
        console.log('Datos guardados en la base de datos:', newForm);

        //Crea excelnpm rund e
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

        const excelPath = path.join(__dirname, '../../uploads/Volunteers.xlsx');
        await workbook.xlsx.writeFile(excelPath);

        const attachments = [
            { filename: 'Volunteers.xlsx', path: excelPath },
        ];

        const documentation = formData.documentation;
        if (documentation.backgroundCheck && fs.existsSync(documentation.backgroundCheck)) {
            attachments.push({ filename: 'Certificado de Antecedentes.pdf', path: documentation.backgroundCheck });
        }
        if (documentation.disqualificationRecord && fs.existsSync(documentation.disqualificationRecord)) {
            attachments.push({ filename: 'Registro de Inhabilidades.pdf', path: documentation.disqualificationRecord });
        }
        if (documentation.photo && fs.existsSync(documentation.photo)) {
            attachments.push({ filename: 'Fotografía.png', path: documentation.photo });
        }

        const fullName = formData.fullName || 'Voluntario';
        const emailSubject = `Ficha de Voluntario: ${fullName}`;

        await nodemailer.sendEmail(
            'volunteerskidstweens@armglobal.org',
            emailSubject,
            'Adjunto encontrarás el formulario enviado y los documentos asociados.',
            attachments
        );

        req.session.destroy();
        res.redirect('/form/page1');
    } catch (error) {
        console.error('Error al enviar el formulario:', error.message);
        res.status(400).send(error.message);
    }
};
