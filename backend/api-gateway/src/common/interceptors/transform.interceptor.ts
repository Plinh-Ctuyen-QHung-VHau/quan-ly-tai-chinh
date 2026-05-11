import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { successResponse } from "@shared/response/successResponse";

export interface Response<T> {
  data: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  Response<T>
> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    if (request.url.includes("/health") || request.url.includes("/metrics")) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        if (data && typeof data.success === "boolean") {
          return data;
        }
        return successResponse(data, "Request successful");
      }),
    );
  }
}
