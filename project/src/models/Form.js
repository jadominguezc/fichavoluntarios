const mongoose = require('mongoose');

// Esquema del Formulario
const FormSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    address: { type: String, required: true },
    birthDate: { type: String, required: true },
    age: { type: Number, required: true },
    shirtSize: { type: String, required: true },
    nationality: { type: String, required: true },
    documentType: { type: String, required: true },
    documentNumber: { type: String, unique: true, required: true },
    phoneNumber: { type: String, required: true },
    occupation: { type: String, required: true },
    email: { type: String, required: true },
    maritalStatus: { type: String, required: true },
    vehicle: { type: String, required: true },
    gender: { type: String, required: true },
    ministry: { type: String, required: true },
    family: [
        {
            name: { type: String, required: false },
            relationship: { type: String, required: false },
            age: { type: Number, required: false },
            activeParticipant: { type: String, required: false },
            service: { type: String, required: false },
        }
    ],
    
    education: {
        level: { type: String, required: false },
        institution: { type: String, required: false },
        degree: { type: String, required: false },
        certifications: { type: String, required: false },
        additionalDetails: { type: String },
    },
    documentation: {
        backgroundCheck: { type: String, required: true },
        disqualificationRecord: { type: String },
    },
    medicalHistory: {
        allergies: { type: String, required: true },
        emergencyMeds: { type: String, required: true },
        healthIssues: { type: String, required: true },
        continuousTreatment: { type: String, required: true },
        medicalInsurance: { type: String },
        emergencyContacts: [
            {
                name: { type: String, required: true },
                relationship: { type: String, required: true },
                phone: { type: String, required: true },
            }
        ],
    }
});

module.exports = mongoose.model('Form', FormSchema);
