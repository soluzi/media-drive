# Media Library - Async Jobs with BullMQ

This document explains how to use the async job processing functionality for image conversions in the media library.

## Overview

The media library supports asynchronous processing of image conversions using BullMQ and Redis. This allows you to:

- Process large images without blocking the main application
- Scale conversion workers independently
- Retry failed conversions automatically
- Monitor job progress and queue statistics

## Setup

### 1. Install Dependencies

```bash
npm install bullmq ioredis
```

### 2. Redis Configuration

Make sure you have Redis running and configure the connection:

```typescript
import Redis from "ioredis";

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || "0"),
});
```

### 3. Initialize Media Library with Queue

```typescript
import {
  initMediaLibrary,
  MediaLibrary,
  createMediaQueue,
  createMediaConversionWorker,
} from "media-storage";
import { PrismaClient } from "@prisma/client";

// Initialize media library
initMediaLibrary({
  default_disk: "local",
  local: {
    root: "uploads",
    public_base_url: "http://localhost:3000/uploads",
  },
});

// Setup queue and service
const prisma = new PrismaClient();
const mediaQueue = createMediaQueue(redis);
const mediaLibrary = new MediaLibrary(prisma, mediaQueue);

// Start worker (in a separate process)
const worker = createMediaConversionWorker(prisma, redis);
```

## Usage

### Starting Async Conversions

Instead of processing conversions synchronously, you can queue them for background processing:

```typescript
// Queue conversions for async processing
const jobId = await mediaLibrary.processConversionsAsync("media-123", {
  thumb: { width: 150, height: 150, quality: 80 },
  medium: { width: 500, height: 500, quality: 90 },
  large: { width: 1200, height: 1200, quality: 95 },
});

console.log(`Conversion job started with ID: ${jobId}`);
```

### Monitoring Job Progress

```typescript
// Check job status
const status = await mediaLibrary.getConversionJobStatus(jobId);
console.log(
  `Job ${status.jobId} is ${status.status} (${status.progress}% complete)`
);

// Get queue statistics
const stats = await mediaLibrary.getQueueStats();
console.log(`Queue stats:`, stats);
```

### Job Routes

The library includes REST endpoints for job management:

```typescript
import { createJobRoutes } from "media-storage";

const jobRoutes = createJobRoutes(mediaLibrary, mediaQueue);
app.use("/media", jobRoutes);
```

Available endpoints:

- `POST /media/:id/convert` - Start async conversion
- `GET /media/jobs/:jobId/status` - Get job status
- `GET /media/jobs/stats` - Get queue statistics
- `GET /media/jobs` - List jobs by status
- `POST /media/jobs/pause` - Pause queue
- `POST /media/jobs/resume` - Resume queue
- `DELETE /media/jobs/clean` - Clean completed/failed jobs

## Worker Process

Run the worker in a separate process:

```bash
# job-worker.ts
import { createMediaConversionWorker } from 'media-storage';

const worker = createMediaConversionWorker(prisma, redis);
console.log('Worker started');
```

Or use PM2 for process management:

```bash
pm2 start job-worker.ts --name media-worker
```

## Job Configuration

### Default Job Options

```typescript
const mediaQueue = createMediaQueue(redis, "media-conversions", {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 2000,
  },
  removeOnComplete: 100,
  removeOnFail: 50,
});
```

### Custom Job Options

```typescript
const job = await mediaQueue.addConversionJob(jobData, {
  attempts: 5,
  delay: 5000, // Delay job start by 5 seconds
  removeOnComplete: false, // Keep completed jobs
});
```

## Error Handling

Jobs automatically retry on failure with exponential backoff. Failed jobs can be inspected:

```typescript
const failedJobs = await mediaQueue.getJobsByStatus("failed");
failedJobs.forEach((job) => {
  console.log(`Job ${job.id} failed:`, job.failedReason);
});
```

## Scaling

### Multiple Workers

Run multiple worker processes to increase throughput:

```bash
# Terminal 1
node job-worker.ts

# Terminal 2
node job-worker.ts

# Terminal 3
node job-worker.ts
```

### Worker Concurrency

Adjust worker concurrency in the worker configuration:

```typescript
const worker = new MediaConversionWorker(prisma, redis, "media-conversions", {
  concurrency: 10, // Process up to 10 jobs simultaneously
});
```

## Monitoring

### Queue Statistics

```typescript
const stats = await mediaQueue.getQueueStats();
console.log({
  waiting: stats.waiting,
  active: stats.active,
  completed: stats.completed,
  failed: stats.failed,
});
```

### Job Progress

```typescript
worker.getWorker().on("progress", (job, progress) => {
  console.log(`Job ${job.id} progress: ${progress}%`);
});
```

## Best Practices

1. **Separate Worker Process**: Run workers in separate processes from your main application
2. **Monitor Queue**: Set up monitoring for queue depth and failed jobs
3. **Resource Limits**: Configure appropriate concurrency limits based on your server resources
4. **Cleanup**: Regularly clean completed/failed jobs to prevent memory issues
5. **Error Handling**: Implement proper error handling and alerting for failed jobs

## Environment Variables

```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_DB=0
```

## Example: Complete Setup

```typescript
// app.ts
import express from "express";
import {
  initMediaLibrary,
  createMediaRouter,
  createJobRoutes,
  MediaLibrary,
  createMediaQueue,
} from "media-storage";

const app = express();
const redis = new Redis();
const prisma = new PrismaClient();

// Initialize media library
initMediaLibrary({
  default_disk: "local",
  local: { root: "uploads", public_base_url: "http://localhost:3000/uploads" },
});

// Setup queue and service
const mediaQueue = createMediaQueue(redis);
const mediaLibrary = new MediaLibrary(prisma, mediaQueue);

// Setup routes
app.use("/media", createMediaRouter());
app.use("/media", createJobRoutes(mediaLibrary, mediaQueue));

app.listen(3000);
```

```typescript
// worker.ts (separate process)
import { createMediaConversionWorker } from "media-storage";

const worker = createMediaConversionWorker(prisma, redis);
console.log("Media conversion worker started");
```
