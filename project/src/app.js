const express = require('express');
const { create } = require('express-handlebars'); // Cambiar la importación
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const session = require('express-session'); // Importar express-session
const formRoutes = require('./routes/formRoutes');

dotenv.config({ path: path.join(__dirname, '../.env') });

// Verificar las variables de entorno cargadas
console.log('MONGO_URI:', process.env.MONGO_URI);
console.log('MAIL_USER:', process.env.MAIL_USER);
console.log('EMAIL_PASS:', process.env.EMAIL_PASS);

const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../public'))); // Ruta estática corregida

// Configuración de sesiones
app.use(
    session({
        secret: process.env.SESSION_SECRET || 'mySecretKey', // Utilizar una clave secreta desde el .env
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false }, // Cambiar a true si usas HTTPS
    })
);

// Handlebars setup
const hbs = create({
    extname: '.handlebars', // Extensión de las vistas
    layoutsDir: path.join(__dirname, 'views', 'layout'), // Cambia a 'layout'
    defaultLayout: 'main', // Archivo de diseño principal
});
app.engine('handlebars', hbs.engine); // Cambiar método de inicialización
app.set('view engine', 'handlebars');

app.set('views', path.join(__dirname, 'views')); // Ruta correcta

// Database connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('Error connecting to MongoDB:', err));

// Routes
app.use('/', formRoutes);

// Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`App available at: http://localhost:${PORT}`);
});
