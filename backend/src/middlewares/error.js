export function notFound(req, res) {
  res.status(404).json({ message: "Not found" });
}

export function errorHandler(err, req, res, next) {
  // eslint-disable-next-line no-unused-vars
  void next;
  const status = err.statusCode || err.status || 500;
  const message = err.expose ? err.message : err.message || "Internal server error";
  res.status(status).json({ message });
}

