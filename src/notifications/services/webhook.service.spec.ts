import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { WebhookService } from './webhook.service';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';

describe('WebhookService', () => {
  let service: WebhookService;
  // just some random hookbin url
  const hookbinUrl = 'https://hookbin.net';

  const mockHttpService = {
    post: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConfigService.get.mockReturnValue(hookbinUrl);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw error if HOOKBIN_URL is not configured', async () => {
    mockConfigService.get.mockReturnValue(undefined);

    await expect(async () => {
      await Test.createTestingModule({
        providers: [
          WebhookService,
          { provide: HttpService, useValue: mockHttpService },
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();
    }).rejects.toThrow('Missing HOOKBIN_URL environment variable');
  });

  describe('sendBirthdayMessage', () => {
    it('should send birthday message successfully', async () => {
      const mockResponse: Partial<AxiosResponse> = {
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {
          headers: {},
        } as never,
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      await service.sendBirthdayMessage('John', 'Doe');

      expect(mockHttpService.post).toHaveBeenCalledWith(hookbinUrl, {
        message: "Hey, John Doe it's your birthday",
      });
      expect(mockHttpService.post).toHaveBeenCalledTimes(1);
    });

    it('should throw error when HTTP request fails', async () => {
      const error = new Error('Network error');
      mockHttpService.post.mockReturnValue(throwError(() => error));

      await expect(service.sendBirthdayMessage('John', 'Doe')).rejects.toThrow(
        'Network error',
      );

      expect(mockHttpService.post).toHaveBeenCalledWith(hookbinUrl, {
        message: "Hey, John Doe it's your birthday",
      });
    });
  });
});
