import { injectable } from "@needle-di/core";

const VERSION = "2.0.0";

@injectable()
export class HealthService {
  status() {
    return {
      version: VERSION,
      time: new Date(),
    };
  }
}
