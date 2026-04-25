import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Response } from "express";
import { errorResponse } from "@shared/response/errorResponse";
import { ERROR_CODES } from "@shared/errors/errorCodes";
import { AppError } from "@shared/errors/AppError";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "An unexpected error occurred";
    let code = ERROR_CODES.INTERNAL_SERVER_ERROR;
    let details: any;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const error: any = exception.getResponse();
      message = error.message || exception.message;
      code = error.code || code;
      details = error.details || error;
    } else if (exception instanceof AppError) {
      status = this.mapCodeToStatus(exception.code);
      message = exception.message;
      code = exception.code;
      details = exception.details;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    response.status(status).json(errorResponse(message, code, details));
  }

  private mapCodeToStatus(code: string): HttpStatus {
    switch (code) {
      case ERROR_CODES.VALIDATION_ERROR:
        return HttpStatus.BAD_REQUEST;
      case ERROR_CODES.UNAUTHORIZED:
        return HttpStatus.UNAUTHORIZED;
      case ERROR_CODES.FORBIDDEN:
        return HttpStatus.FORBIDDEN;
      case ERROR_CODES.NOT_FOUND:
        return HttpStatus.NOT_FOUND;
      case ERROR_CODES.CONFLICT:
        return HttpStatus.CONFLICT;
      case ERROR_CODES.RATE_LIMIT_EXCEEDED:
        return HttpStatus.TOO_MANY_REQUESTS;
      default:
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }
  }
}
