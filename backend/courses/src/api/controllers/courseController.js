const { search } = require("../routes/courseRoutes");
const CourseService = require("../services/courseService");
const courseService = require("../services/courseService");
const courseValidationSchema = require("../validations/courseSchema");
const service = new courseService();
const { propagation, context,trace, SpanStatusCode } = require('@opentelemetry/api');

const CourseController = {
  /**
   * This function validate the given request and trigger the Course Service
   * @param {*} req
   * @param {*} res
   * @returns JsonResponse
   */
  async createCourse(req, res) {
    const tracer = trace.getTracer('course-service');
    const span = tracer.startSpan('Create course');
    const { error } = courseValidationSchema.validate(req.body);

    if (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.details[0].message });
      span.end();
      return res.status(400).json({ message: error.details[0].message });
    } else {
      try {
        const course = await service.createCourse(req.body);
        res.status(201).send({
          message: "Course has been created successfully",
          data: course,
        });
        span.setStatus({ code: SpanStatusCode.OK });
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message
        });
        res
          .status(500)
          .send({ message: "Error creating Course", error: error.message });
      }finally {
        span.end();
      }
    }
  },
  async editCourse(req, res) {
    const { error } = courseValidationSchema.validate(req.body);

    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    } else {
      try {
        const courseId = req.params.id;
        const updateCourse = await service.editCourse(courseId, req.body);
        res.status(201).send({
          message: "Course has been updated successfully",
          data: updateCourse,
        });
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    }
  },

  async getCourseDetails(req, res) {
    const tracer = trace.getTracer('course-service');
    const span = tracer.startSpan('getAllCourse');
    const courseId = req.params.id;

    try {
      const courseInfo = await service.getCourseDetails(courseId);
      res.status(201).send({
        message: "Course has been fetched successfully",
        data: courseInfo,
      });
      span.setStatus({ code: SpanStatusCode.OK });

    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      res.status(500).json({ message: error.message });
    }finally {
      span.end();
    }
  },

  async deleteCourse(req, res) {
    try {
      const courseId = req.params.id;
      const updateCourse = await service.deleteCourse(courseId);
      if (updateCourse) {
        res.status(201).send({
          message: "Course has been trashed successfully",
          data: updateCourse,
        });
      } else {
        res.status(500).send({
          message: "Unable to delete the Course",
          data: updateCourse,
        });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  async getAllCourses(req, res) {
    let tracer;
    let span;
    let courses;
    try {
    tracer = trace.getTracer('course-service');
    if(!req.headers.traceparent){
      span = tracer.startSpan('getAllcourses');
      courses = await service.getAllCourses(
        req.query.search,
        req.query.order_by,
        req.query.sort
        );
      }else{
        const parentContext = propagation.extract(context.active(), req.headers);
        span = tracer.startSpan('customer Fetch', undefined, parentContext);
        courses = await service.getAllCoursesUser(
          req.query.search,
          req.query.order_by,
          req.query.sort,
          req.headers
          );
      }
      if (courses) { console.log("Course has been fetched successfully");
          res.status(201).send({
            message: "Course has been fetched successfully",
            data: courses,
          });
          span.setStatus({ code: SpanStatusCode.OK });
      } else {
          res.status(500).send({
            message: "Unable to fetch the courses",
            data: [],
          });
      }
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      res.status(500).json({ message: "Error in Fetching Courses" , error: error.message });
    }finally {
    span.end();
  }
  },

};

module.exports = CourseController;
