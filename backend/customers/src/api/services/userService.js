const { USER_SERVICE_END_POINT } = require("../../config");
const ApiService = require("./apiService");
const { trace, SpanStatusCode } = require('@opentelemetry/api');

class UserService {
  constructor() {
    this.apiService = new ApiService(USER_SERVICE_END_POINT);
  }
  // User operations
  async createUser(userData,carrier) {
  console.log("Reached user");
    const tracer = trace.getTracer('user-service');
    const span = tracer.startSpan('createUser');
    try {
      const response = await this.apiService.request("post", "", userData,carrier);
      console.log("user request END");
      span.setStatus({ code: SpanStatusCode.OK });
      return response;
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;  // Re-throw the error after logging it to OpenTelemetry
    } finally {
      span.end();  // Ensure that the span is always closed
    }
  }
  

  async viewUsers() {
    const tracer = trace.getTracer('user-service');
    const span = tracer.startSpan('viewUsers');
    try {
      const users = await this.apiService.request("get", "");
      span.setStatus({ code: SpanStatusCode.OK });
      return users;
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  }

  async viewUsersById(userId) {
    return this.apiService.request("get", userId.toString());
  }

  async deleteUser(userId) {
    return this.apiService.request("delete", userId.toString());
  }
}
module.exports = UserService;
