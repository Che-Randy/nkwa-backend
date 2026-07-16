// src/middleware/validate.js
// A tiny, dependency-free validator. For each route we pass a list of
// { field, required, type } rules, and this checks the request body against them.
// If something's wrong, it responds with a 400 and a clear error message
// instead of letting the request continue.

function validateBody(rules) {
  return (req, res, next) => {
    const errors = [];

    for (const rule of rules) {
      const value = req.body ? req.body[rule.field] : undefined;

      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`"${rule.field}" is required`);
        continue;
      }

      if (value !== undefined && rule.type) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== rule.type) {
          errors.push(`"${rule.field}" must be of type ${rule.type}`);
        }
      }

      if (value !== undefined && rule.oneOf && !rule.oneOf.includes(value)) {
        errors.push(`"${rule.field}" must be one of: ${rule.oneOf.join(', ')}`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    next();
  };
}

module.exports = { validateBody };
