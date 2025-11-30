export interface ApiErrorDetail {
  code?: string;
  field?: string;
  info?: any;
}

export interface ApiErrorPayload {
  error?: {
    message?: string;
    details?: ApiErrorDetail | ApiErrorDetail[] | string;
  };
}

export interface NormalizedApiErrorInfo {
  status?: number;
  message: string;
  details?: ApiErrorDetail | ApiErrorDetail[] | string;
}