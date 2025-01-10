const nodemailer = require('nodemailer');

console.log('MAIL_USER:', process.env.MAIL_USER);
console.log('EMAIL_PASS:', process.env.EMAIL_PASS);

const sendEmail = async (to, subject, text, attachments) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: process.env.MAIL_USER,
            to,
            subject,
            text,
            attachments,
        };

        await transporter.sendMail(mailOptions);
        console.log('Correo enviado con éxito');
    } catch (error) {
        console.error('Error al enviar correo:', error);
    }
};

module.exports = { sendEmail };
