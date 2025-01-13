const Form = require("../models/Form");
const ExcelJS = require("exceljs");
const path = require("path");
const nodemailer = require("../services/emailService");
const fs = require("fs");

// Crear la carpeta uploads si no existe
const ensureUploadsDir = () => {
  const uploadsDir = path.join(__dirname, "../../uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log("Carpeta /uploads creada correctamente.");
  }
};

// Renderizar las páginas del formulario
exports.getPage1 = (req, res) => {
  res.render("forms/page1", { currentPage: 1 });
};

exports.getPage2 = (req, res) => {
  console.log("Datos de la página 1:", req.session.page1Data || "No hay datos");
  res.render("forms/page2", { currentPage: 2 });
};

exports.getPage3 = (req, res) => {
  console.log(
    "Datos de la página 2 (Familiares):",
    req.session.familyData || "No hay datos"
  );
  res.render("forms/page3", { currentPage: 3 });
};

exports.getPage4 = (req, res) => {
  console.log("Datos de la página 3:", req.session.page3Data || "No hay datos");
  res.render("forms/page4", { currentPage: 4 });
};

exports.getPage5 = (req, res) => {
  console.log("Datos de la página 4:", req.session.page4Data || "No hay datos");
  res.render("forms/page5", { currentPage: 5 });
};

// Manejar los datos de la página 1
exports.handlePage1Data = async (req, res) => {
  try {
    const { documentNumber } = req.body;

    // Verificar si el documentNumber ya existe en la base de datos
    const existingForm = await Form.findOne({ documentNumber: documentNumber });

    if (existingForm) {
      console.log("Documento de identificación ya existe:", documentNumber);
      return res.render("forms/page1", {
        currentPage: 1,
        errorMessage:
          "Documento de Identificación ya existe, contacta con tu líder de ministerio",
        formData: req.body, // Retornar los datos ya ingresados
      });
    }

    // Si no existe, guardar los datos en la sesión y continuar
    req.session.page1Data = req.body;
    console.log("Datos guardados de la página 1:", req.session.page1Data);
    res.redirect("/form/page2");
  } catch (error) {
    console.error("Error al manejar los datos de la página 1:", error.message);
    res.status(500).send("Error al procesar la solicitud");
  }
};

// Manejar los datos de la página 2 (Familiares)
exports.handleFamilyData = (req, res) => {
  req.session.familyData = req.body.family || [];
  console.log("Datos guardados de la familia:", req.session.familyData);
  res.redirect("/form/page3");
};

// Manejar los datos de la página 3
exports.handlePage3Data = (req, res) => {
  req.session.page3Data = req.body;
  console.log("Datos guardados de la página 3:", req.session.page3Data);
  res.redirect("/form/page4");
};

// Manejar los datos de la página 4
exports.handlePage4Data = (req, res) => {
  const { files } = req;

  const backgroundCheckPath = files.backgroundCheck
    ? files.backgroundCheck[0].path
    : null;
  const disqualificationRecordPath = files.disqualificationRecord
    ? files.disqualificationRecord[0].path
    : null;
  const photoPath = files.photo ? files.photo[0].path : null;

  // Verificar existencia de archivos
  if (backgroundCheckPath && !fs.existsSync(backgroundCheckPath)) {
    return res
      .status(400)
      .send("Error: No se pudo encontrar el archivo de antecedentes.");
  }
  if (
    disqualificationRecordPath &&
    !fs.existsSync(disqualificationRecordPath)
  ) {
    return res
      .status(400)
      .send(
        "Error: No se pudo encontrar el archivo de registro de inhabilidades."
      );
  }
  if (photoPath && !fs.existsSync(photoPath)) {
    return res.status(400).send("Error: No se pudo encontrar la fotografía.");
  }

  req.session.page4Data = {
    backgroundCheck: backgroundCheckPath,
    disqualificationRecord: disqualificationRecordPath,
    photo: photoPath,
  };

  console.log("Datos guardados de la página 4:", req.session.page4Data);
  res.redirect("/form/page5");
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

  console.log("Datos guardados de la página 5:", req.session.page5Data);
  res.redirect("/form/confirm");
};

// Renderizar página de confirmación
exports.getConfirm = (req, res) => {
  try {
    const formData = {
      ...req.session.page1Data,
      family: req.session.familyData || [],
      education: req.session.page3Data || {},
      documentation: req.session.page4Data || {},
      medicalHistory: req.session.page5Data || {},
    };

    console.log("Datos para la confirmación:", formData);
    res.render("forms/confirm", { formData });
  } catch (error) {
    console.error("Error al cargar la confirmación:", error.message);
    res.status(500).send("Error al cargar la confirmación");
  }
};

// Función para eliminar todos los archivos de la carpeta /uploads
const clearUploadsFolder = () => {
  const uploadFolder = path.join(__dirname, "../../uploads");
  fs.readdir(uploadFolder, (err, files) => {
    if (err) {
      console.error("Error al leer la carpeta /uploads:", err.message);
      return;
    }
    files.forEach((file) => {
      const filePath = path.join(uploadFolder, file);
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error(`Error al eliminar el archivo ${file}:`, err.message);
        } else {
          console.log(`Archivo eliminado: ${file}`);
        }
      });
    });
  });
};

// Manejar el envío final del formulario
exports.submitForm = async (req, res) => {
  try {
    ensureUploadsDir();

    const formData = {
      ...req.session.page1Data,
      family: req.session.familyData || [],
      education: req.session.page3Data || {},
      documentation: req.session.page4Data || {},
      medicalHistory: req.session.page5Data || {},
    };

    // Guardar en la base de datos
    const newForm = new Form(formData);
    await newForm.save();
    console.log("Datos guardados en la base de datos:", newForm);

    // Crear el archivo Excel con formato ajustado
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Ficha Voluntario");

    // Anchos de las columnas
    worksheet.columns = [
      { width: 4.11 }, // Columna A
      { width: 26.44 }, // Columna B
      { width: 16.56 }, // Columna C
      { width: 11.33 }, // Columna D
      { width: 8.11 }, // Columna E
      { width: 17.0 }, // Columna F
      { width: 17.33 }, // Columna G
    ];

    // Encabezado principal
    worksheet.mergeCells("B2:G2");
    worksheet.getCell("B2").value = "FICHA DE VOLUNTARIOS KIDS / TWEENS";
    worksheet.getCell("B2").alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    worksheet.getCell("B2").fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "CFE2F3" },
    };

    // Encabezado "Datos Personales"
    worksheet.mergeCells("B4:G4");
    worksheet.getCell("B4").value = "DATOS PERSONALES";
    worksheet.getCell("B4").alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    worksheet.getCell("B4").fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "CFE2F3" },
    };

    // Añadir datos personales
    const personalData = [
      ["Nombre Completo:", formData.fullName || ""],
      ["Dirección Domicilio:", formData.address || ""],
      ["Fecha de Nacimiento:", formData.birthDate || ""],
      ["Edad:", formData.age || ""],
      ["Talla Polera/Polerón:", formData.shirtSize || ""],
      ["Nacionalidad:", formData.nationality || ""],
      ["Tipo de Documento:", formData.documentType || ""],
      ["N° de Documento:", formData.documentNumber || ""],
      ["Número de Teléfono:", formData.phoneNumber || ""],
      ["Ocupación:", formData.occupation || ""],
      ["Correo Electrónico:", formData.email || ""],
      ["Estado Civil:", formData.maritalStatus || ""],
      ["Vehículo Propio:", formData.vehicle || ""],
      ["Género:", formData.gender || ""],
      ["Ministerio:", formData.ministry || ""],
    ];

    personalData.forEach((data, index) => {
      const row = worksheet.getRow(5 + index);
      row.getCell(2).value = data[0];
      row.getCell(3).value = data[1];
      row.getCell(2).alignment = { horizontal: "left" };
      row.getCell(3).alignment = { horizontal: "center" };
      worksheet.mergeCells(`C${5 + index}:G${5 + index}`);
    });

    // Encabezado "Núcleo Familiar"
    worksheet.mergeCells("B20:G20");
    worksheet.getCell("B20").value = "NÚCLEO FAMILIAR";
    worksheet.getCell("B20").alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    worksheet.getCell("B20").fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "CFE2F3" },
    };

    // Encabezados de las columnas del núcleo familiar
    const familyHeader = [
      "Familiar",
      "Nombre y Apellido",
      "Parentesco",
      "Edad",
      "Participante Activo",
      "Equipo/Ministerio",
    ];
    worksheet.addRow(["", ...familyHeader]).eachCell((cell) => {
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.font = { bold: true };
      });

    // Datos del núcleo familiar con desplazamiento
    formData.family.forEach((familyMember, index) => {
        const row = worksheet.addRow([
          "", // Columna A vacía
          `Familiar ${index + 1}`, // Familiar 1, Familiar 2, etc.
          familyMember.name || "", // Nombre
          familyMember.relationship || "", // Parentesco
          familyMember.age || "", // Edad
          familyMember.activeParticipant || "", // Participante Activo
          familyMember.service || "", // Equipo/Ministerio
        ]);
  
        row.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
      });

    // Encabezado "Información de Educación"
    worksheet.mergeCells("B32:G32");
    worksheet.getCell("B32").value = "INFORMACIÓN DE EDUCACIÓN";
    worksheet.getCell("B32").alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    worksheet.getCell("B32").fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "CFE2F3" },
    };

    const educationData = [
      ["Nivel Educativo:", formData.education.educationLevel || ""],
      ["Institución:", formData.education.institution || ""],
      ["Título Obtenido:", formData.education.degree || ""],
    ];

    educationData.forEach((data, index) => {
      const row = worksheet.getRow(33 + index);
      row.getCell(2).value = data[0];
      row.getCell(3).value = data[1];
      row.getCell(2).alignment = { horizontal: "left" };
      row.getCell(3).alignment = { horizontal: "center" };
      worksheet.mergeCells(`C${33 + index}:G${33 + index}`);
    });

    // Encabezado "Documentación"
    worksheet.mergeCells("B37:G37");
    worksheet.getCell("B37").value = "DOCUMENTACIÓN";
    worksheet.getCell("B37").alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    worksheet.getCell("B37").fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "CFE2F3" },
    };

    const documentationData = [
      [
        "Certificado de Antecedentes:",
        path.basename(formData.documentation.backgroundCheck || ""),
      ],
      [
        "Registro de Inhabilitaciones:",
        path.basename(formData.documentation.disqualificationRecord || ""),
      ],
      [
        "Fotografía del Voluntario:",
        path.basename(formData.documentation.photo || ""),
      ],
    ];

    documentationData.forEach((data, index) => {
      const row = worksheet.getRow(38 + index);
      row.getCell(2).value = data[0];
      row.getCell(3).value = data[1];
      row.getCell(2).alignment = { horizontal: "left" };
      row.getCell(3).alignment = { horizontal: "center" };
      worksheet.mergeCells(`C${38 + index}:G${38 + index}`);
    });

    // Encabezado "Historial Médico Voluntario"
    worksheet.mergeCells("B42:G42");
    worksheet.getCell("B42").value = "HISTORIAL MÉDICO VOLUNTARIO";
    worksheet.getCell("B42").alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    worksheet.getCell("B42").fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "CFE2F3" },
    };

    const medicalHistoryData = [
      ["Alergias:", formData.medicalHistory.allergies || ""],
      [
        "Medicamentos de Emergencia:",
        formData.medicalHistory.emergencyMeds || "",
      ],
      ["Lesión o Enfermedad:", formData.medicalHistory.healthIssues || ""],
      [
        "Diagnóstico / Tratamiento:",
        formData.medicalHistory.continuousTreatment || "",
      ],
      ["Previsión Médica:", formData.medicalHistory.medicalInsurance || ""],
    ];

    medicalHistoryData.forEach((data, index) => {
      const row = worksheet.getRow(43 + index);
      row.getCell(2).value = data[0];
      row.getCell(3).value = data[1];
      row.getCell(2).alignment = { horizontal: "left" };
      row.getCell(3).alignment = { horizontal: "center" };
      worksheet.mergeCells(`C${43 + index}:G${43 + index}`);
    });

    // Encabezado "Contacto de Emergencia"
    worksheet.mergeCells("B48:G48");
    worksheet.getCell("B48").value = "CONTACTO DE EMERGENCIA";
    worksheet.getCell("B48").alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    worksheet.getCell("B48").fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "CFE2F3" },
    };

    const emergencyContact = formData.medicalHistory.emergencyContacts[0] || {};
    const emergencyData = [
      ["Nombre del Contacto:", emergencyContact.name || ""],
      ["Parentesco:", emergencyContact.relationship || ""],
      ["Teléfono:", emergencyContact.phone || ""],
    ];

    emergencyData.forEach((data, index) => {
      const row = worksheet.getRow(49 + index);
      row.getCell(2).value = data[0];
      row.getCell(3).value = data[1];
      row.getCell(2).alignment = { horizontal: "left" };
      row.getCell(3).alignment = { horizontal: "center" };
      worksheet.mergeCells(`C${49 + index}:G${49 + index}`);
    });

    // Guardar archivo Excel
    const excelPath = path.join(__dirname, "../../uploads/Volunteers.xlsx");
    await workbook.xlsx.writeFile(excelPath);

    // Configurar adjuntos para el correo
    const attachments = [{ filename: "Volunteers.xlsx", path: excelPath }];

    const documentation = formData.documentation;
    if (documentation.backgroundCheck) {
      attachments.push({
        filename: path.basename(documentation.backgroundCheck),
        path: documentation.backgroundCheck,
      });
    }
    if (documentation.disqualificationRecord) {
      attachments.push({
        filename: path.basename(documentation.disqualificationRecord),
        path: documentation.disqualificationRecord,
      });
    }
    if (documentation.photo) {
      attachments.push({
        filename: path.basename(documentation.photo),
        path: documentation.photo,
      });
    }

    // Enviar correo
    const fullName = formData.fullName || "Voluntario";
    await nodemailer.sendEmail(
      "volunteerskidstweens@armglobal.org",
      `Ficha de Voluntario: ${fullName}`,
      "Adjunto encontrarás el formulario enviado y los documentos asociados.",
      attachments
    );

    clearUploadsFolder();
    req.session.destroy();
    res.redirect("/form/page1");
  } catch (error) {
    console.error("Error al enviar el formulario:", error.message);
    res.status(500).send("Error al procesar el formulario");
  }
};
