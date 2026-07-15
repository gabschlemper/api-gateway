import { Injectable, Logger, NestMiddleware } from '@nestjs/common';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');
  
  use(req: any, res: any, next: () => void) {
    const { method, originalurl, ip } = req;
    const userAgent = req.get('User-Agent') || '';
    const startTime = Date.now();

    this.logger.log(`Incoming request ${method} ${originalurl} - IP: ${ip} - User-Agent: ${userAgent}` )

    res.on('finish', () => {
      const { statusCode } = res;
      const contentLenght = res.get('Content-Lenght');
      const duration = Date.now() - startTime;

      this.logger.log(`Outgoing response ${method} ${originalurl} - ${statusCode} - ${contentLenght || 0}b - ${duration}ms` )

      if (statusCode >= 400) {
        this.logger.error(
          `Error response: ${method} ${originalurl} - ${statusCode} - ${duration}`
        )
      }
    });

    res.on('error', (error) => {
      this.logger.error(
        `Response error: ${method} ${originalurl} - ${error.message}`
      )
    });

    req.on('timout', () => {
      this.logger.warn(
        `Response time: ${method} ${originalurl} - ${Date.now() - startTime}ms`
      )
    });

    next();
  }
}
