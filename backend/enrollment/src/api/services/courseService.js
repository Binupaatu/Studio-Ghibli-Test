const Enrollment = require("../../models/enrollmentModel");
const Course = require("../../models/enrollmentModel");
const Joi = require("joi");
const axios = require("axios");

class EnrollmentService {
  async enrollUser(data, user) {
    const tracer = trace.getTracer('course-service');
    const span = tracer.startSpan('createEnrollmentCourse');
    try {
      const insertData = this.extractEnrollFields(data);
      insertData.customer_id = user.id;
      console.log(insertData);
      const enrollment = await Enrollment.create(insertData);
      span.addEvent('Fetch Course');
      span.setStatus({ code: SpanStatusCode.OK });
      return enrollment;
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw new Error(error.message);
    }finally {
      span.end();
    }
  }
  async viewEnrolledUser(data) {
    const tracer = trace.getTracer('course-service');
    const span = tracer.startSpan('creatcourseenroll');
    try {
      const enrollment = await Enrollment.findAll({
        attributes: [
          ["id", "enrollment_id"],
          "customer_id",
          "course_id",
          "status",
          "payment_method",
          "payment_status",
          "enrollment_date",
          "created_at",
          "updated_at",
        ],
      });
      span.setStatus({ code: SpanStatusCode.OK });
      return enrollment;
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      return error.message;
    }finally {
      span.end();
    }
  }
  async viewEnrolledUserByCourseId(id) {
    try {
      const enrollment = await Enrollment.findAll({
        attributes: [
          ["id", "enrollment_id"],
          "customer_id",
          "course_id",
          "status",
          "payment_method",
          "payment_status",
          "enrollment_date",
          "created_at",
          "updated_at",
        ],
        where: {
          course_id: id,
        },
      });
      return enrollment;
    } catch (error) {
      return error.message;
    }
  }
  async viewCourses(data) {
    try {
      const userResponse = await axios.get(
        `${process.env.COURSE_SERVICE_END_POINT}`
      );
      if (userResponse.data) {
        return userResponse.data;
      } else {
        return 409;
      }
    } catch (error) {
      throw new Error(error.message);
    }
  }
  async viewCustomers() {
    try {
      const customerResponse = await axios.get(
        `${process.env.CUSTOMER_SERVICE_END_POINT}`
      );
      if (customerResponse.data) {
        return customerResponse.data;
      } else {
        return 409;
      }
    } catch (error) {
      throw new Error(error.message);
    }
  }
  extractEnrollFields(data) {
    return {
      course_id: data.course_id,
      payment_method: data.payment_method,
      payment_status: 1,
      status: 1,
    };
  }

  async getUserInfo(token) {
    try {
      const user_info = await axios.get(
        `${process.env.USER_SERVICE_END_POINT}/verify/token`,
        {
          headers: {
            Authorization: "Basic " + token,
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
}
module.exports = EnrollmentService;
