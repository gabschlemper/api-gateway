import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { serviceConfig } from 'src/config/gateway.config';

type ProxyHeaders = Record<string, string | number | boolean | undefined>;

type UserInfo = {
  userId?: string | number;
  email?: string;
  role?: string;
};

type ServiceHealthResult =
  | {
      status: 'healthy';
      data: unknown;
    }
  | {
      status: 'unhealthy';
      error: string;
    };

function getErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const maybeError = error as {
      message?: unknown;
      response?: {
        data?: unknown;
      };
    };

    if (typeof maybeError.response?.data === 'string') {
      return maybeError.response.data;
    }

    if (typeof maybeError.message === 'string') {
      return maybeError.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error';
}

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);

  constructor(private readonly httpService: HttpService) {}

  async proxyRequest(
    serviceName: keyof typeof serviceConfig,
    method: string,
    path: string,
    data?: unknown,
    headers?: ProxyHeaders,
    userInfo?: UserInfo,
  ): Promise<any> {
    const service = serviceConfig[serviceName];
    const url = `${service.url}${path}`;

    this.logger.log(`Proxying ${method} request to ${serviceName}: ${url}`);

    try {
      const enhancedHeaders = {
        ...headers,
        'x-user-id': userInfo?.userId,
        'x-user-email': userInfo?.email,
        'x-user-role': userInfo?.role,
      };

      const response = await firstValueFrom(
        this.httpService.request({
          method: method.toLowerCase(),
          url,
          data,
          headers: enhancedHeaders,
          timeout: service.timeout,
        }),
      );

      return response;
    } catch (error) {
      this.logger.error(
        `Error proxying ${method} request to ${serviceName}: ${url}`,
      );
      throw error;
    }
  }

  async getServiceHealth(
    serviceName: keyof typeof serviceConfig,
  ): Promise<ServiceHealthResult> {
    try {
      const service = serviceConfig[serviceName];
      const response = await firstValueFrom(
        this.httpService.get<unknown>(`${service.url}/health`, {
          timeout: 3000,
        }),
      );
      return {
        status: 'healthy',
        data: response.data,
      };
    } catch (error: unknown) {
      return {
        status: 'unhealthy',
        error: getErrorMessage(error),
      };
    }
  }
}
