import * as faceapi from '@vladmandic/face-api';
import '@tensorflow/tfjs';
import path from 'path';

let isModelsLoaded = false;

export async function loadFaceModels() {
  if (isModelsLoaded) return;
  
  try {
    // Determine the path to the pre-trained models packaged with @vladmandic/face-api
    const faceApiPkgPath = require.resolve('@vladmandic/face-api/package.json');
    const modelPath = path.join(path.dirname(faceApiPkgPath), 'model');
    
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);
    
    isModelsLoaded = true;
    console.log('✅ Face-API models loaded from disk.');
  } catch (error) {
    console.error('Failed to load Face-API models:', error);
    throw error;
  }
}

export { faceapi };
