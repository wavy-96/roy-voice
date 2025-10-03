const Joi = require('joi');

/**
 * Validation middleware factory
 * Creates middleware to validate request data against a Joi schema
 */
function validate(schema, property = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false, // Return all errors, not just the first one
      stripUnknown: true, // Remove unknown fields
      convert: true // Convert types when possible (e.g., string to number)
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type
      }));

      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    // Replace request data with validated (and sanitized) data
    req[property] = value;
    next();
  };
}

// ============================================================================
// Organization Validation Schemas
// ============================================================================

const createOrganizationSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Organization name must be at least 2 characters',
      'string.max': 'Organization name must not exceed 100 characters',
      'any.required': 'Organization name is required'
    }),
  
  retell_api_key: Joi.string()
    .pattern(/^key_[a-zA-Z0-9]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Retell API key must start with "key_"',
      'any.required': 'Retell API key is required'
    }),
  
  retell_agent_id: Joi.string()
    .pattern(/^agent_[a-zA-Z0-9]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Retell Agent ID must start with "agent_"',
      'any.required': 'Retell Agent ID is required'
    }),
  
  settings: Joi.object({
    metrics_lookback_days: Joi.number()
      .integer()
      .min(1)
      .max(365)
      .default(30),
    
    timezone: Joi.string()
      .max(50)
      .default('UTC'),
    
    currency: Joi.string()
      .length(3)
      .uppercase()
      .default('USD')
  }).optional()
});

const updateOrganizationSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .optional(),
  
  retell_api_key: Joi.string()
    .pattern(/^key_[a-zA-Z0-9]+$/)
    .optional(),
  
  retell_agent_id: Joi.string()
    .pattern(/^agent_[a-zA-Z0-9]+$/)
    .optional(),
  
  settings: Joi.object({
    metrics_lookback_days: Joi.number()
      .integer()
      .min(1)
      .max(365)
      .optional(),
    
    timezone: Joi.string()
      .max(50)
      .optional(),
    
    currency: Joi.string()
      .length(3)
      .uppercase()
      .optional()
  }).optional()
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

// ============================================================================
// Metrics Query Validation Schemas
// ============================================================================

const metricsQuerySchema = Joi.object({
  from: Joi.date()
    .iso()
    .max('now')
    .optional()
    .messages({
      'date.max': 'From date cannot be in the future'
    }),
  
  to: Joi.date()
    .iso()
    .min(Joi.ref('from'))
    .max('now')
    .optional()
    .messages({
      'date.min': 'To date must be after from date',
      'date.max': 'To date cannot be in the future'
    }),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(1000)
    .default(50)
    .messages({
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 1000'
    }),
  
  offset: Joi.number()
    .integer()
    .min(0)
    .default(0)
    .messages({
      'number.min': 'Offset cannot be negative'
    }),
  
  cursor: Joi.date()
    .iso()
    .optional()
    .messages({
      'date.base': 'Cursor must be a valid ISO 8601 date'
    }),
  
  organizationId: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.guid': 'Organization ID must be a valid UUID'
    })
});

// ============================================================================
// Webhook Validation Schemas
// ============================================================================

const webhookSchema = Joi.object({
  event: Joi.string()
    .valid('call_started', 'call_ended', 'call_analyzed')
    .required(),
  
  call_id: Joi.string()
    .required(),
  
  agent_id: Joi.string()
    .optional(),
  
  timestamp: Joi.date()
    .iso()
    .optional(),
  
  data: Joi.object()
    .unknown(true)
    .required()
});

// ============================================================================
// UUID Validation (for path parameters)
// ============================================================================

const uuidParamSchema = Joi.object({
  id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'ID must be a valid UUID'
    })
});

const organizationIdParamSchema = Joi.object({
  organizationId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Organization ID must be a valid UUID'
    })
});

// ============================================================================
// Pagination Validation
// ============================================================================

const paginationSchema = Joi.object({
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20),
  
  offset: Joi.number()
    .integer()
    .min(0)
    .default(0),
  
  cursor: Joi.string()
    .optional()
});

// ============================================================================
// Date Range Validation
// ============================================================================

const dateRangeSchema = Joi.object({
  from: Joi.date()
    .iso()
    .required(),
  
  to: Joi.date()
    .iso()
    .min(Joi.ref('from'))
    .required()
    .messages({
      'date.min': 'End date must be after start date'
    })
});

// ============================================================================
// Export Validation Schemas
// ============================================================================

const validateCreateOrganization = validate(createOrganizationSchema);
const validateUpdateOrganization = validate(updateOrganizationSchema);
const validateMetricsQuery = validate(metricsQuerySchema, 'query');
const validateWebhook = validate(webhookSchema);
const validateUuidParam = validate(uuidParamSchema, 'params');
const validateOrganizationIdParam = validate(organizationIdParamSchema, 'params');
const validatePagination = validate(paginationSchema, 'query');
const validateDateRange = validate(dateRangeSchema, 'query');

module.exports = {
  // Middleware functions
  validate,
  validateCreateOrganization,
  validateUpdateOrganization,
  validateMetricsQuery,
  validateWebhook,
  validateUuidParam,
  validateOrganizationIdParam,
  validatePagination,
  validateDateRange,
  
  // Schemas (for custom validation)
  schemas: {
    createOrganization: createOrganizationSchema,
    updateOrganization: updateOrganizationSchema,
    metricsQuery: metricsQuerySchema,
    webhook: webhookSchema,
    uuidParam: uuidParamSchema,
    organizationIdParam: organizationIdParamSchema,
    pagination: paginationSchema,
    dateRange: dateRangeSchema
  }
};

