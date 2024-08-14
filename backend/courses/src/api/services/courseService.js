const Course = require("../../models/courseModel");
const Chapter = require("../../models/courseChapterModel");
const { Op } = require("sequelize");
const { propagation,context,trace, SpanStatusCode } = require('@opentelemetry/api');

class CourseService {
  async createCourse(data) {
    try {
      const tracer = trace.getTracer('course-service');
      const span = tracer.startSpan('CreateCourse');
      const course = await Course.create(this.extractCourseFields(data));
      //await this.handleChapters(course.id, data.chapters);
      span.addEvent('New Course created');
      span.setStatus({ code: SpanStatusCode.OK });
      return course;
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw new Error(error.message);
    }finally {
      span.end();
    }
  }

  async editCourse(courseId, data) { console.log("edit Course");
    try {
      const course = await Course.findByPk(courseId);
      if (!course) {
        throw new Error("Course not found!");
      }

      await course.update(this.extractCourseFields(data));
      await this.handleChapters(courseId, data.chapters);
      return course;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  // Extracts course fields from data
  extractCourseFields(data) {
    return {
      title: data.title,
      description: data.description,
      learning_outcomes: data.learning_outcomes,
      course_inclusions: data.course_inclusions,
      is_certified: data.is_certified,
      author: data.author,
      price: data.price,
      rating: data.rating,
      total_enrollments: data.total_enrollments,
      status: data.status,
      course_content: data.course_content,
    };
  }

  // Handle creation and updating of chapters
  async handleChapters(courseId, chapters) {
    if (chapters && 0 < chapters.length) {
      const chapter_data = chapters;
      const chapter_data_with_course = chapter_data.map((chapter) => ({
        ...chapter,
        course_id: courseId,
      }));

      await Chapter.destroy({ where: { course_id: courseId } });
      await Chapter.bulkCreate(chapter_data_with_course);
    }
  }

  //Get indiviadual course details
  async getCourseDetails(courseId) {
    console.log("Get edit Course");
    const tracer = trace.getTracer('course-service');
    const span = tracer.startSpan('viewCourses');
    try {
      let courseInfo = await Course.findByPk(courseId);
      const chapters = await Chapter.findAll({
        where: {
          course_id: courseId,
        },
      });
      courseInfo = courseInfo.get({ plain: true });

      courseInfo.chapters = chapters;
      span.setStatus({ code: SpanStatusCode.OK });
      return courseInfo;
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw new Error("Course not found");
    }finally {
      span.end();
    }
  }
  //Delete a course from the database
  async deleteCourse(courseId) {
    console.log("delete Course");
    const course = await Course.findByPk(courseId);

    if (!course) {
      throw new Error("Course not found");
    } else {
      try {
        course.status = "-1";
        const deleteCourse = await course.save();
        return deleteCourse;
      } catch (error) {
        throw new Error(error.message);
      }
    }
  }

  //Fetch all courses those are not deleted
  async getAllCourses(searchTerm, order, sort) {
    const tracer = trace.getTracer('course-service');
    const span = tracer.startSpan('viewCourses');
    let options = {
      where: {
        status: {
          [Op.ne]: "-1",
        },
      },
    };

    if (searchTerm) {
      options.where.title = {
        [Op.like]: `%${searchTerm}%`,
      };
    }

    if (order && sort) {
      options.order = [[order, sort]];
    }

    try {
      const courses = await Course.findAll(options);
      span.setStatus({ code: SpanStatusCode.OK });
      return courses;
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw new Error(error);
    }finally {
      span.end();
    }
  }
  
  
async getAllCoursesUser(searchTerm, order, sort, carrier) {
  const parentContext = propagation.extract(context.active(), carrier);
  const tracer = trace.getTracer('course-service');
  const span = tracer.startSpan('fetchCourseDetail', {
      attributes: { 'http.method': 'get' },
  }, parentContext);
  return await context.with(trace.setSpan(context.active(), span), async () => {
      try {
          const options = {
              where: {
                  status: { [Op.ne]: "-1" },
              },
          };

          if (searchTerm) {
              options.where.title = {
                  [Op.like]: `%${searchTerm}%`,
              };
          }

          if (order && sort) {
              options.order = [[order, sort]];
          }

          console.log("test connection - before query execution");
          const start = Date.now();
          const courses = await Course.findAll(options);
          const end = Date.now();
          console.log(`Query execution time: ${end - start}ms`);
          console.log("test connection - after query execution");

          span.setStatus({ code: SpanStatusCode.OK });
          return courses;
      } catch (error) {
          span.recordException(error);
          span.setStatus({ code: SpanStatusCode.ERROR });
          throw error;
      } finally {
          span.end();
      }
  });
}


}

module.exports = CourseService;
