import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export class PromiseGLTFLoader extends GLTFLoader {
  promiseLoad(url, onProgress) {
    return new Promise((resolve, reject) => {
      super.load(url, resolve, onProgress, reject);
    });
  }
};
