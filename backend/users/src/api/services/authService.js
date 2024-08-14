const jwt = require("jsonwebtoken");
const User = require("../../models/userModel");
const { use } = require("../routes/userRoutes");
const bcrypt = require("bcrypt");
const Op = require("sequelize");
const { APP_SECRET, CUSTOMER_SERVICE_END_POINT, COURSE_SERVICE_END_POINT } = require("../../config");
const axios = require("axios");
const { trace, SpanStatusCode, propagation, context} = require('@opentelemetry/api');

const authService = {
  async authenticateUser(email, password,carrier) {
    const tracer = trace.getTracer('auth-service');
    const span = tracer.startSpan('authenticateUser');
    try {
      const user = await User.findOne({
        where: { email_id: email, status: 1 },
      });
      if (user) {
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        throw new Error("Invalid credentials");
      }else{
        span.addEvent('Password verified');
        const userDetails = await this.getCustomerProfile(user.id,carrier);
        const userData = {
          id: user.id,
          profile: userDetails.data || [],
        };
        const CourseDetails = await this.getCourseDetails(carrier);
        const token = jwt.sign(userData, APP_SECRET, {
          expiresIn: "1h",
        });
        return token;
      }
    }
    else{
      span.addEvent('User found');
      throw new Error("User not found");
      }
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  },

  async getCustomerProfile(user_id,carrier) {
    const tracer = trace.getTracer('auth-service');
    const span = tracer.startSpan('getCustomerProfile');
    try {
      const response = await axios.get(`${CUSTOMER_SERVICE_END_POINT}/user/${user_id}`,{
        headers: carrier
      });
      span.addEvent('API Customer response received');
      if (response.data) {
        span.end();
        return response.data;
      } else {
        throw new Error('Profile not found');
      }
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  },

  async getCourseDetails(carrier) {
    const tracer = trace.getTracer('auth-service');
    const span = tracer.startSpan('getCourseDetails');
    try {
    const Courseresponse = await axios.get(`${COURSE_SERVICE_END_POINT}`,{
        headers: carrier,
        timeout: 10000 // 10 seconds timeout
      });
      span.addEvent('API Course response received');
      if (Courseresponse.data) {
        span.end();
        return Courseresponse.data;
      } else {
        throw new Error('Course not found');
      }
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  },
};

module.exports = authService;
