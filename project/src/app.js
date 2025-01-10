const express = require('express');
const { create } = require('express-handlebars'); // Cambiar la importación
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const session = require('express-session'); // Importar express-session
const multer = require('multer'); // Importar multer para manejar errores relacionados
const formRoutes = require('./routes/formRoutes');

dotenv.config({ path: path.join(__dirname, '../.env') });

// Verificar las variables de entorno cargadas
//console.log('MONGO_URI:', process.env.MONGO_URI);
//console.log('MAIL_USER:', process.env.MAIL_USER);
//console.log('EMAIL_PASS:', process.env.EMAIL_PASS);

const app = express();

// Middleware para parsear requests
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Servir archivos estáticos desde la carpeta public
app.use(express.static(path.join(__dirname, '../public')));

// Configuración de sesiones
app.use(
    session({
        secret: process.env.SESSION_SECRET || 'mySecretKey', // Utilizar una clave secreta desde el .env
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false }, // Cambiar a true si usas HTTPS
    })
);

// Configuración de Handlebars
const hbs = create({
    extname: '.handlebars', // Extensión de las vistas
    layoutsDir: path.join(__dirname, 'views', 'layout'), // Cambia a 'layout'
    defaultLayout: 'main', // Archivo de diseño principal
    helpers: {
        eq: (a, b) => a === b, // Helper para comparar valores
        gt: (a, b) => a > b    // Helper para comparar si un valor es mayor
    },
});
app.engine('handlebars', hbs.engine); // Cambiar método de inicialización
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views')); // Ruta correcta para las vistas

// Conexión a la base de datos
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('Error connecting to MongoDB:', err));

// Rutas
app.use('/', formRoutes);

// Middleware para manejar errores de Multer
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        console.error('Error de Multer:', err.message);
        return res.status(400).send('Error al procesar los archivos. Inténtalo de nuevo.');
    }
    if (err) {
        console.error('Error en el servidor:', err.message);
        return res.status(500).send('Ocurrió un error en el servidor.');
    }
    next();
});

// Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`App available at: http://localhost:${PORT}`);
});
