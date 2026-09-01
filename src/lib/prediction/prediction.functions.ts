import { createServerFn } from "@tanstack/react-start";
import type { ModelStatus } from "./config";

/**
 * Reports whether local model files are present. Safe to call from any UI.
 */
export const fetchModelStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<ModelStatus> => {
    const { getModelStatus } = await import("./model-loader.server");
    return getModelStatus();
  },
);
