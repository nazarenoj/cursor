const { z } = require('zod');

const fechaYYYYMMDD = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe ser YYYY-MM-DD');

const adherenteSchema = z.object({
  apellido: z.string().min(1, 'Apellido es requerido').max(100).trim(),
  nombre: z.string().min(1, 'Nombre es requerido').max(100).trim(),
  parentesco: z.string().min(1, 'Parentesco es requerido').max(100).trim(),
  dni: z.string().max(15).trim().optional().nullable().or(z.literal('')),
  fechaNacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable().or(z.literal('')),
});

const adherentesSchema = z.union([
  z.string().transform((s) => {
    try {
      const parsed = JSON.parse(s);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }),
  z.array(adherenteSchema),
]);

/** Esquema para crear un socio (POST). Campos obligatorios: apellido, nombre, fechaAlta, categoriaId. */
const socioCreateSchema = z.object({
  numeroSocio: z.union([z.number(), z.string().transform(Number)]).optional(),
  apellido: z.string().min(2, 'Apellido demasiado corto').max(255).trim(),
  nombre: z.string().min(2, 'Nombre demasiado corto').max(255).trim(),
  dni: z.string().max(15).trim().optional().nullable().or(z.literal('')),
  fechaNacimiento: fechaYYYYMMDD.optional().nullable().or(z.literal('')),
  calle: z.string().max(255).trim().optional().nullable().or(z.literal('')),
  numeroCasa: z.string().max(50).trim().optional().nullable().or(z.literal('')),
  localidad: z.string().max(255).trim().optional().nullable().or(z.literal('')),
  provincia: z.string().max(255).trim().optional().nullable().or(z.literal('')),
  codigoPostal: z.string().max(20).optional().nullable().or(z.literal('')),
  telefono: z.string().max(50).optional().nullable().or(z.literal('')),
  email: z.string().email('Formato de email inválido').optional().nullable().or(z.literal('')),
  categoriaId: z.union([z.number(), z.string().transform(Number)]),
  obraSocial: z.string().max(255).trim().optional().nullable().or(z.literal('')),
  numeroAfiliado: z.string().max(255).trim().optional().nullable().or(z.literal('')),
  fechaAlta: fechaYYYYMMDD,
  fechaBaja: fechaYYYYMMDD.optional().nullable().or(z.literal('')),
  foto: z.string().nullable().optional().or(z.literal('')),
  adherentes: adherentesSchema.optional().default([]),
});

/** Esquema para actualizar un socio (PUT). Todos los campos opcionales. */
const socioUpdateSchema = socioCreateSchema.partial();

/**
 * Middleware de validación con Zod. Asigna req.body al resultado de schema.parse(req.body).
 * En caso de error responde 400 con message y details (campo, mensaje).
 */
function validate(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body ?? {});
      next();
    } catch (error) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          message: 'Error de validación de datos',
          details: error.errors.map((e) => ({
            campo: e.path.join('.'),
            mensaje: e.message,
          })),
        });
      }
      throw error;
    }
  };
}

module.exports = {
  validate,
  socioCreateSchema,
  socioUpdateSchema,
  adherenteSchema,
};
