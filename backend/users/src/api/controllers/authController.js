const authService = require("../services/authService");
const { trace, SpanStatusCode, context, propagation } = require('@opentelemetry/api');

const authController = {
  async authenticateUser(req, res) {
    const parentContext = propagation.extract(context.active(), req.headers);
    const tracer = trace.getTracer('backend');
    const span = tracer.startSpan('Process Login', {
      attributes: { 'http.method': req.method },
  }, parentContext);;

    try {
      const activeContext = trace.setSpan(context.active(), span);
      const carrier = {};
      propagation.inject(activeContext, carrier, {
          set: (carrier, key, value) => carrier[key] = value,
      });
      const { email, password } = req.body;
      span.setAttribute("user.email", email); // Only if it's safe to log email
      const token = await authService.authenticateUser(email, password,carrier);
      res.status(200).json({ message: "Authentication successful", token });
      span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message
      });
      res.status(500).json({ message: "Auth Controller: " + error.message });
    } finally {
      span.end();
    }
  },
};


module.exports = authController;
