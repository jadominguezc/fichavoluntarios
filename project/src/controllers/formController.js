const Form = require('../models/Form');
const nodemailer = require('nodemailer');
const ExcelJS = require('exceljs');
const path = require('path');

// Render form pages
exports.getPage1 = (req, res) => res.render('forms/page1', { currentPage: 1 });
exports.getPage2 = (req, res) => res.render('forms/page2', { currentPage: 2 });
exports.getPage3 = (req, res) => res.render('forms/page3', { currentPage: 3 });
exports.getPage4 = (req, res) => res.render('forms/page4', { currentPage: 4 });
exports.getPage5 = (req, res) => res.render('forms/page5', { currentPage: 5 });

// Handle family data from page 2
exports.handleFamilyData = async (req, res) => {
    try {
        const familyData = req.body.family || [];
        console.log('Family Data:', familyData);

        // Filtrar familiares vacíos
        const validFamilyData = familyData.filter(f => f.name || f.relationship || f.age || f.activeParticipant || f.service);

        await Form.updateOne(
            { _id: req.session.formId || '64c60e1fa3e8b5c7c5d1babc' }, // Reemplaza con el ID correcto
            { $push: { family: { $each: validFamilyData } } }
        );

        res.redirect('/form/page3');
    } catch (error) {
        console.error('Error al manejar los datos de la familia:', error.message);
        res.status(500).send('Error del servidor');
    }
};

exports.submitForm = async (req, res) => {
    try {
        const formData = new Form(req.body);
        await formData.save();

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Volunteers');
        worksheet.columns = [
            { header: 'Campo', key: 'campo', width: 30 },
            { header: 'Respuesta', key: 'respuesta', width: 50 },
        ];

        Object.keys(req.body).forEach((key) => {
            if (key === 'family') {
                req.body[key].forEach((family, index) => {
                    worksheet.addRow({ campo: `Familiar ${index + 1}`, respuesta: JSON.stringify(family) });
                });
            } else {
                worksheet.addRow({ campo: key, respuesta: req.body[key] });
            }
        });

        const filePath = path.join(__dirname, '../../public/Volunteers.xlsx');
        await workbook.xlsx.writeFile(filePath);

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        await transporter.sendMail({
            from: process.env.MAIL_USER,
            to: 'volunteerskidstweens@armglobal.org',
            subject: 'Formulario de Voluntarios',
            text: 'Adjunto encontrarás el formulario enviado.',
            attachments: [{ filename: 'Volunteers.xlsx', path: filePath }],
        });

        res.redirect('/form/page1');
    } catch (error) {
        console.error('Error al enviar el formulario:', error);
        res.status(500).send('Error del servidor');
    }
};
