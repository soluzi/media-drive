export interface ConversionJobData {
  mediaId: string;
  conversions: Record<
    string,
    {
      width?: number;
      height?: number;
      quality?: number;
      format?: string;
    }
  >;
  originalPath: string;
  modelType: string;
  modelId: string;
  collectionName: string;
  fileName: string;
}

export interface ConversionJobResult {
  success: boolean;
  responsiveImages?: Record<
    string,
    {
      path: string;
      size: number;
    }
  >;
  error?: string;
}

export interface JobProgress {
  jobId: string;
  progress: number;
  status: "waiting" | "active" | "completed" | "failed" | "delayed";
  data?: any;
  error?: string;
}

export interface JobOptions {
  attempts?: number;
  backoff?: {
    type: "fixed" | "exponential";
    delay: number;
  };
  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number;
  delay?: number;
}
