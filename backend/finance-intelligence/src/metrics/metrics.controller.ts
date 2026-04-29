import { Controller, Get, Res } from "@nestjs/common";
import { register } from "prom-client";
import { Response } from "express";

@Controller("metrics")
export class MetricsController {
  @Get()
  async getMetrics(@Res() res: Response) {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  }
}
