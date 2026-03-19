const { ZodError } = require("zod");

function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: "Validation error",
      errors: err.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
    });
  }

  if (err.statusCode) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  console.error(err);
  return res.status(500).json({ message: "Internal server error" });
}

module.exports = { errorHandler };