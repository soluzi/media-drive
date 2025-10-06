import path from "path";
import { randomFileName } from "./randomFileName";

/**
 * Generate a path for storing media objects
 */
export function objectPath(
  modelType: string,
  modelId: string,
  collectionName: string,
  fileName: string
): string {
  const sanitizedModelType = modelType.replace(/[^a-zA-Z0-9]/g, "_");
  const sanitizedCollection = collectionName.replace(/[^a-zA-Z0-9]/g, "_");

  return path.posix.join(
    sanitizedModelType,
    modelId,
    sanitizedCollection,
    fileName
  );
}

/**
 * Generate a path for storing conversions
 */
export function conversionPath(
  modelType: string,
  modelId: string,
  collectionName: string,
  fileName: string,
  conversionName: string
): string {
  const basePath = objectPath(modelType, modelId, collectionName, fileName);
  const dir = path.posix.dirname(basePath);
  const ext = path.extname(fileName);
  const name = path.basename(fileName, ext);

  return path.posix.join(dir, "conversions", `${name}-${conversionName}${ext}`);
}

/**
 * Generate a random path for storing media objects
 */
export function randomObjectPath(
  modelType: string,
  modelId: string,
  collectionName: string,
  originalFileName: string
): { path: string; fileName: string } {
  const fileName = randomFileName(originalFileName);
  const objectPathValue = objectPath(
    modelType,
    modelId,
    collectionName,
    fileName
  );

  return {
    path: objectPathValue,
    fileName,
  };
}
