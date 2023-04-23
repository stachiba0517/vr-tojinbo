import * as THREE from 'three';
import {
	RollerCoasterGeometry,
	RollerCoasterShadowGeometry,
	RollerCoasterLiftersGeometry,
	TreesGeometry,
	SkyGeometry
} from 'three/addons/misc/RollerCoaster.js';
import { PromiseGLTFLoader } from "./PromiseGLTFLoader.js";
//import { makeMeshSkyGround } from "./makeMeshSkyGround.js";

export class Curve {
	vector = new THREE.Vector3();
	vector2 = new THREE.Vector3();
  getPointAt(t) {
    t *= Math.PI;
    const x = Math.sin(t * 4) * 40;
    const y = Math.sin(t * 10) * 6 + 32;
    const z = Math.cos(t * 2) * 40;
    return this.vector.set(x, y, z);
  }
  getTangentAt(t) {
    const delta = 0.0001;
    const t1 = Math.max(0, t - delta);
    const t2 = Math.min(1, t + delta);
    return this.vector2.copy(this.getPointAt(t2)).sub(this.getPointAt(t1)).normalize();
  }
}

export const makeCurve = () => new Curve();

export const addCoaster = async (scene, curve) => {
  { // sky
    const url = "https://code4fukui.github.io/vr-fukui/img/vr-tojinbo.jpg";
    scene.background = new THREE.Color(0xf0f0ff); // sky
    
    const geometry = new THREE.SphereGeometry(300, 60, 40);
    // invert the geometry on the x-axis so that all of the faces point inward
    geometry.scale(-1, 1, 1);
    const texture = new THREE.TextureLoader().load(url);
    const material = new THREE.MeshBasicMaterial({ map: texture });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.y = Math.PI;
    
    /*
    const mesh = makeMeshSkyGround(url, 200);
    mesh.rotation.y = .3;
    */
    scene.add(mesh);
  }
  const light = new THREE.HemisphereLight(0xfff0f0, 0x606066);
  light.position.set(1, 1, 1);
  scene.add(light);

  const loader = new PromiseGLTFLoader();
  loader.crossOrigin = "anonymous";
  const glb = await loader.promiseLoad("./tojinbo-base1.glb");
  const obj = glb.scene;
  obj.position.y = 0;

  scene.add(glb.scene);

  /*
  { // environment
    const geometry = new THREE.PlaneGeometry(500, 500, 15, 15);
    geometry.rotateX(- Math.PI / 2);

    const positions = geometry.attributes.position.array;
    const vertex = new THREE.Vector3();

    for (let i = 0; i < positions.length; i += 3) {
      vertex.fromArray(positions, i);
      vertex.x += Math.random() * 10 - 5;
      vertex.z += Math.random() * 10 - 5;
      const distance = (vertex.distanceTo(scene.position) / 5) - 25;
      vertex.y = Math.random() * Math.max(0, distance);
      vertex.toArray(positions, i);
    }
    geometry.computeVertexNormals();

    const material = new THREE.MeshLambertMaterial({
      color: 0x407000
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    
    { // trees
      const geometry = new TreesGeometry(mesh);
      const material = new THREE.MeshBasicMaterial({
        side: THREE.DoubleSide, vertexColors: true
      });
      const mesh2 = new THREE.Mesh(geometry, material);
      scene.add(mesh2);
    }
  }
  */
  /*
  { // sky
    const geometry = new SkyGeometry();
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
  }
  */

  //


  {
    const geometry = new RollerCoasterGeometry(curve, 1500);
    const material = new THREE.MeshPhongMaterial({
      vertexColors: true
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
  }
  { // lifter
    const geometry = new RollerCoasterLiftersGeometry(curve, 50);
    const material = new THREE.MeshPhongMaterial();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = 0.1;
    scene.add(mesh);
  }
  /*
  { // shadow
    const geometry = new RollerCoasterShadowGeometry(curve, 500);
    const material = new THREE.MeshBasicMaterial({
      color: 0x305000, depthWrite: false, transparent: true
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = 0.1;
    scene.add(mesh);
  }
  */


  /*
  const funfairs = [];
  { // funfairs
    const geometry = new THREE.CylinderGeometry(10, 10, 5, 15);
    const material = new THREE.MeshLambertMaterial({
      color: 0xff8080
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(- 80, 10, - 70);
    mesh.rotation.x = Math.PI / 2;
    scene.add(mesh);
    funfairs.push(mesh);
  }
  {
    const geometry = new THREE.CylinderGeometry(5, 6, 4, 10);
    const material = new THREE.MeshLambertMaterial({
      color: 0x8080ff
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(50, 2, 30);
    scene.add(mesh);
    funfairs.push(mesh);
  }
  */
};
