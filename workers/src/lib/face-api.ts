import * as faceapi from "@vladmandic/face-api/dist/face-api.node-wasm.js";
import * as tf from "@tensorflow/tfjs";
import { setWasmPaths } from "@tensorflow/tfjs-backend-wasm";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let loading: Promise<void> | undefined;
export function loadFaceModels() {
  return (loading ??= (async () => {
    setWasmPaths(
      path.dirname(
        require.resolve("@tensorflow/tfjs-backend-wasm/package.json"),
      ) + "/dist/",
    );
    await tf.setBackend("wasm");
    await tf.ready();
    const modelPath =
      process.env.FACE_MODEL_DIR ||
      path.join(
        path.dirname(require.resolve("@vladmandic/face-api/package.json")),
        "model",
      );
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);
  })().catch((error) => {
    loading = undefined;
    throw error;
  }));
}
export { faceapi };
