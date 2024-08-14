const HttpStatus = require("../../utils/HttpStatus");
const userService = new (require("../services/userService"))();
const customerService = new (require("../services/customerService"))();
const customerValidationSchema = require("../validations/customerSchema");
const Joi = require("joi");
const { trace, context, propagation, SpanStatusCode } = require('@opentelemetry/api');

// Utility function to send responses
const sendResponse = (res, status, message, data = null) => {
  const responseData = { message, data };
  res.status(status).json(responseData);
};

const CustomerController = {
async createCustomer(req, res) {
  const tracer = trace.getTracer('customer-service');
  const span = tracer.startSpan('Create Customer');

  try {
      const activeContext = trace.setSpan(context.active(), span);
      
      const carrier = {};
      propagation.inject(activeContext, carrier, {
          set: (carrier, key, value) => carrier[key] = value,
      });

      const role = req.body.role && req.body.role.trim() !== "" ? req.body.role : "customer";
      const userData = {
          email: req.body.email,
          password: req.body.password,
          role,
      };

      // Pass the trace context to userService through headers
      const userInfo = await userService.createUser(userData, carrier);
      
      if (userInfo?.result) {
          const userId = userInfo.data.id;
          const customerData = { ...req.body, user_id: userId };
          const customer = await customerService.createCustomer(customerData);
          sendResponse(res, HttpStatus.CREATED, "Customer has been created successfully.", customer);
      } else {
          sendResponse(res, HttpStatus.BAD_REQUEST, userInfo.message);
      }

      span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      sendResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, `Error: ${error.message}`);
  } finally {
      span.end();
  }
},

  async listCustomers(req, res) {
    const tracer = trace.getTracer('customer-service');
    const span = tracer.startSpan('getAllCustomers');
    try {
      const activeContext = trace.setSpan(context.active(), span);
      
      const carrier = {};
      propagation.inject(activeContext, carrier, {
          set: (carrier, key, value) => carrier[key] = value,
      });
      const customers = await customerService.viewCustomers();
      sendResponse(
        res,
        HttpStatus.OK,
        "User details have been fetched successfully.",
        customers
      );
      span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      sendResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        `Error: ${error.message}`
      );
    }finally {
      span.end();
    }
  },

  async viewCustomer(req, res) {
    const tracer = trace.getTracer('customer-service');
    const span = tracer.startSpan('getAllCustomers');
    const customer_id = req.params.id;
    try {
      const customerInfo = await customerService.viewCustomerById(customer_id);
      if (null != customerInfo) {
        sendResponse(
          res,
          HttpStatus.OK,
          "User details have been fetched successfully.",
          customerInfo
        );
      } else {
        sendResponse(res, HttpStatus.BAD_REQUEST, "User is Empty!");
      }
      span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      sendResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        `Error: ${error.message}`
      );
    }finally {
      span.end();
    }
  },

  async viewCustomerByUserId(req, res) {
  const user_id = req.params.id;
  const parentContext = propagation.extract(context.active(), req.headers);
  const tracer = trace.getTracer('customer-service');
  const span = tracer.startSpan('Create User', undefined, parentContext);
    try {
      
      const customerInfo = await customerService.viewCustomerByUserId(user_id,req.headers);
      if (null != customerInfo) {
        sendResponse(
          res,
          HttpStatus.OK,
          "Customer details have been fetched successfully.",
          customerInfo
        );
        span.setStatus({ code: SpanStatusCode.OK });
      } else {
        sendResponse(res, HttpStatus.BAD_REQUEST, "Customer not found!");
      }
    } catch (error) {
      span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
      });
      sendResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        `Error: ${error.message}`
      );
    }finally {
      span.end();
  }
  },

  async viewCustomerEnrollments(req, res) {
    try {
      const userInfo = await customerService.getUserInfo(
        req.headers.authorization.split(" ")[1]
      );
      const customerEnrollments = await customerService.viewCustomerEnrollments(
        userInfo[0].profile.id
      );

      if (null != customerEnrollments) {
        sendResponse(
          res,
          HttpStatus.OK,
          "Customer Enrollments have been fetched successfully.",
          customerEnrollments
        );
      } else {
        sendResponse(res, HttpStatus.BAD_REQUEST, "Customer not found!");
      }
    } catch (error) {
      sendResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        `Error viewCustomerEnrollments : ${error.message}`
      );
    }
  },

  async deleteCustomer(req, res) {
    const customer_id = req.params.id;

    try {
      const customerInfo = await customerService.viewCustomerById(customer_id);
      if (customerInfo.length > 0) {
        const customerResponse = await customerService.deleteCustomer(
          customer_id
        );

        if (customerResponse) {
          await userService.deleteUser(customerInfo[0].user_id);
          sendResponse(res, HttpStatus.OK, `Customer deleted successfully`);
        } else {
          sendResponse(res, HttpStatus.BAD_REQUEST, "User is Empty!");
        }
      } else {
        sendResponse(res, HttpStatus.BAD_REQUEST, "User is Empty!");
      }
    } catch (error) {
      sendResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        `Error: ${error.message}`
      );
    }
  },

  async updateCustomer(req, res) {
    const customer_id = req.params.id;
    try {
      const updateResponse = await customerService.updateCustomer(
        req.body,
        customer_id
      );

      if (updateResponse !== 409) {
        sendResponse(
          res,
          HttpStatus.OK,
          `Customer details updated successfully`,
          req.body
        );
      } else {
        sendResponse(res, HttpStatus.BAD_REQUEST, "User not exists!");
      }
    } catch (error) {
      sendResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        `Error: ${error.message}`
      );
    }
  },
};

module.exports = CustomerController;