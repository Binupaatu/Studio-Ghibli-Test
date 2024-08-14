const Customer = require("../../models/customerModel");
const { QueryTypes } = require("sequelize");
const axios = require("axios");
const dB = require("../../config/database");
const ApiService = require("./apiService");
const UserService = require("./userService");
const { USER_SERVICE_END_POINT } = require("../../config");
const { trace, SpanStatusCode } = require('@opentelemetry/api');

class CustomerService {
  constructor() {
    this.apiService = new ApiService(process.env.USER_SERVICE_END_POINT);
    this.userService = new UserService();
  }

  async createCustomer(data) {
    const tracer = trace.getTracer('customer-service');
    const span = tracer.startSpan('CreateCustomer');
    try {
      const customer = await Customer.create(this._extractCustomerFields(data));
      span.addEvent('New Customer created');
      span.setStatus({ code: SpanStatusCode.OK });
      return customer;
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw new Error(error.message);
    } finally {
      span.end();
    }
  }

  async viewCustomers() {
    const tracer = trace.getTracer('customer-service');
    const span = tracer.startSpan('viewCustomers');
    try {
      const customers = await this._queryDB(
        "SELECT c.*, u.id as user_id, u.email_id, u.role FROM `customers` c INNER JOIN `users` u ON u.id = c.user_id"
      );
      span.setStatus({ code: SpanStatusCode.OK });
      return customers;
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  }

  async viewCustomerById(id,carrier) {
    const parentContext = propagation.extract(context.active(), carrier);
    const tracer = trace.getTracer('user-service');
    
    const span = tracer.startSpan('fetch User email', {
      attributes: { 'http.method': 'get' },
    }, parentContext);
    
  return context.with(trace.setSpan(context.active(), span), async () => {
    try {
      const customer = await this._findCustomer(id);
      span.addEvent('user fetched');
      span.setStatus({ code: SpanStatusCode.OK });
      return customer;
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  });
  }

  async viewCustomerByUserId(id) {
    const tracer = trace.getTracer('customer-service');
    const span = tracer.startSpan('viewCustomerByUserId');
    try {
      const customer = await this._findCustomerByUserId(id);
      span.setStatus({ code: SpanStatusCode.OK });
      return customer;
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  }

  async deleteCustomer(id) {
    const tracer = trace.getTracer('customer-service');
    const span = tracer.startSpan('deleteCustomer');
    try {
      const success = await this._deleteCustomer({ id });
      span.setStatus({ code: SpanStatusCode.OK });
      return success;
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  }

  async updateCustomer(customerDetail, customer_id) {
    const tracer = trace.getTracer('customer-service');
    const span = tracer.startSpan('updateCustomer');
    try {
      const updatedCustomer = await this._updateCustomer(customerDetail, { id: customer_id });
      if (updatedCustomer) {
        span.setStatus({ code: SpanStatusCode.OK });
        return updatedCustomer;
      } else {
        span.setStatus({ code: SpanStatusCode.ERROR });
        return null;
      }
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  }

  async viewCustomerEnrollments(id) {
    const tracer = trace.getTracer('customer-service');
    const span = tracer.startSpan('viewCustomerEnrollments');
    try {
      const enrollments = await this._findEnrollmentsByCustomer(id);
      span.setStatus({ code: SpanStatusCode.OK });
      return enrollments;
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
    
  }

  async getUserInfo(token) {
    console.log(`${USER_SERVICE_END_POINT}/verify/token`);
    try {
      const user_info = await axios.get(
        `${USER_SERVICE_END_POINT}/verify/token`,
        {
          headers: {
            Authorization: "Bearer " + token,
          },
        }
      );
      if (null != user_info.data) {
        return user_info.data;
      } else {
        return 404;
      }
    } catch (error) {
      throw new Error(error.message);
    }
  }

  // Private methods for internal use
  _extractCustomerFields(data) {
    return {
      user_id: data.user_id,
      full_name: data.full_name,
      phone_no: data.phone_no,
      area_of_interests: data.area_of_interests,
      status: data.status,
    };
  }

  async _queryDB(query, options = {}) {
    try {
      return await dB.query(query, { type: QueryTypes.SELECT, ...options });
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async _findCustomer(id) {
    try {
      return this._queryDB(
        "SELECT c.*, u.id as user_id, u.email_id, u.role FROM `customers` c INNER JOIN `users` u ON u.id = c.user_id WHERE c.id=" +
          id
      );
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async _findCustomerByUserId(id) {
    console.log( "SELECT c.*, u.id as user_id, u.email_id, u.role FROM `customers` c INNER JOIN `users` u ON u.id = c.user_id WHERE c.user_id=" +
          id);
    try {
      return this._queryDB(
        "SELECT c.*, u.id as user_id, u.email_id, u.role FROM `customers` c INNER JOIN `users` u ON u.id = c.user_id WHERE c.user_id=" +
          id
      );
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async _findEnrollmentsByCustomer(id) {
    try {
      return this._queryDB(
        "SELECT e.customer_id, c.title, c.course_content FROM `enrollments` e INNER JOIN customers ct on ct.id = e.customer_id INNER JOIN courses c on c.id = e.course_id WHERE e.customer_id=" +
          id
      );
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async _deleteCustomer(condition) {
    try {
      await Customer.destroy({ where: condition });
      return true;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async _updateCustomer(updateValues, condition) {
    try {
      const result = await Customer.update(updateValues, {
        where: condition,
        returning: true,
      });

      const updateCount = result[0];
      const updatedCustomers = result[1]; // This would be an array of updated customers

      if (updateCount === 1 && updatedCustomers.length > 0) {
        return updatedCustomers[0]; // Return the first (and should be only) updated customer
      } else {
        return null; // No customers updated, or conditions matched more than one.
      }
    } catch (error) {
      throw new Error(error.message);
    }
  }
}

module.exports = CustomerService;