const Joi = require('joi');

/**
 * Validation schemas for API inputs
 */

const schemas = {
  // Registration validation
  register: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .lowercase()
      .messages({
        'string.email': 'Email invalide',
        'any.required': 'Email requis'
      }),
    
    password: Joi.string()
      .min(12)
      .max(256)
      .pattern(/[A-Z]/, 'uppercase')
      .pattern(/[0-9]/, 'digit')
      .pattern(/[^a-zA-Z0-9]/, 'special')
      .required()
      .messages({
        'string.min': 'Mot de passe minimum 12 caractères',
        'string.pattern.name': 'Mot de passe doit contenir: majuscule, chiffre, caractère spécial',
        'any.required': 'Mot de passe requis'
      }),
    
    name: Joi.string()
      .max(50)
      .pattern(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'valid-name')
      .messages({
        'string.pattern.name': 'Nom invalide (lettres, espaces, tirets seulement)',
        'string.max': 'Nom maximum 50 caractères'
      })
  }).unknown(false), // Reject unknown fields

  // Login validation
  login: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .lowercase()
      .messages({
        'string.email': 'Email invalide',
        'any.required': 'Email requis'
      }),
    
    password: Joi.string()
      .required()
      .messages({
        'any.required': 'Mot de passe requis'
      })
  }).unknown(false),

  // Chat message validation
  chat: Joi.object({
    message: Joi.string()
      .min(1)
      .max(10000)
      .trim()
      .required()
      .messages({
        'string.min': 'Message non vide requis',
        'string.max': 'Message maximum 10000 caractères',
        'any.required': 'Message requis'
      }),
    language: Joi.string()
      .valid('en', 'fr', 'es', 'de', 'it', 'pt', 'zh', 'ja', 'ru', 'ar', 'he')
      .optional()
      .messages({
        'any.only': 'Langue invalide'
      })
  }).unknown(false),

  // Memory update validation
  memory: Joi.object({
    key: Joi.string()
      .max(100)
      .alphanum()
      .required()
      .messages({
        'string.alphanum': 'Clé doit être alphanumérique',
        'any.required': 'Clé requise'
      }),
    
    value: Joi.string()
      .max(50000)
      .required()
      .messages({
        'any.required': 'Valeur requise'
      })
  }).unknown(false),

  // Refresh token validation
  refresh: Joi.object({
    refreshToken: Joi.string()
      .required()
      .messages({
        'any.required': 'Refresh token requis'
      })
  }).unknown(false)
};

/**
 * Middleware factory for validating request body
 * @param {Joi.ObjectSchema} schema - The Joi schema to validate against
 * @returns {Function} Express middleware
 */
function validateRequest(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      stripUnknown: true,
      convert: true
    });

    if (error) {
      // Return first validation error only (avoid overwhelming user)
      const message = error.details[0].message;
      return res.status(400).json({ error: message });
    }

    // Store validated data in request for later use
    req.validatedBody = value;
    next();
  };
}

/**
 * Sanitize message to prevent XSS
 */
function sanitizeMessage(message) {
  if (!message) return '';
  
  // Remove HTML tags
  return message
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

module.exports = {
  schemas,
  validateRequest,
  sanitizeMessage
};
