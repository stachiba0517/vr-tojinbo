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

export const addCoaster = async (
  scene,
  curve,
  skyurl = "https://code4fukui.github.io/vr-fukui/img/vr-tojinbo.jpg",
  modelurl = "https://code4fukui.github.io/vr-tojinbo/tojinbo-base1.glb",
  modelpos = null,
) => {
  if (skyurl) { // sky
    //const url = "https://code4fukui.github.io/vr-fukui/img/vr-tojinbo.jpg";
    const url = skyurl;
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
  const glb = await loader.promiseLoad(modelurl);
  const obj = glb.scene;
  if (modelpos) {
    obj.position.x = modelpos.x;
    obj.position.y = modelpos.y;
    obj.position.z = modelpos.z;
  } else {
    obj.position.y = 0;
  }

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

  // スタートゲート（門）の作成
  {
    const startPos = curve.getPointAt(0);
    const tangent = curve.getTangentAt(0); // スタート地点での進行方向
    
    // ゲートの基準位置
    const signOffset = new THREE.Vector3().copy(tangent).multiplyScalar(30);
    const gatePos = new THREE.Vector3().copy(startPos).add(signOffset);
    
    // 進行方向に垂直な方向を計算（左右の方向）
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(tangent, up).normalize();
    
    // カニのロゴ用Canvas
    const createCrabCanvas = () => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = 256;
      canvas.height = 256;
      
      // 背景
      context.fillStyle = '#ff6b00';
      context.beginPath();
      context.arc(128, 128, 120, 0, Math.PI * 2);
      context.fill();
      
      // カニの絵文字風イラスト
      context.fillStyle = '#ffffff';
      context.font = 'bold 150px Arial';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText('🦀', 128, 138);
      
      return canvas;
    };
    
    // スタート看板用Canvas
    const createStartSignCanvas = () => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = 512;
      canvas.height = 256;
      
      // 背景（看板の板）
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      // 枠線
      context.strokeStyle = '#ff6b00';
      context.lineWidth = 15;
      context.strokeRect(7, 7, canvas.width - 14, canvas.height - 14);
      
      // テキスト
      context.fillStyle = '#ff0000';
      context.font = 'bold 100px Arial';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText('スタート', canvas.width / 2, canvas.height / 2);
      
      return canvas;
    };
    
    // 左側のカニロゴ
    {
      const canvas = createCrabCanvas();
      const texture = new THREE.CanvasTexture(canvas);
      const geometry = new THREE.PlaneGeometry(6, 6);
      const material = new THREE.MeshBasicMaterial({ 
        map: texture, 
        side: THREE.DoubleSide,
        transparent: true
      });
      const mesh = new THREE.Mesh(geometry, material);
      
      // 左側に配置
      mesh.position.copy(gatePos).add(right.clone().multiplyScalar(-12));
      mesh.position.y = gatePos.y + 8;
      
      const lookAtPos = new THREE.Vector3().copy(mesh.position).sub(tangent);
      mesh.lookAt(lookAtPos);
      
      scene.add(mesh);
    }
    
    // 右側のカニロゴ
    {
      const canvas = createCrabCanvas();
      const texture = new THREE.CanvasTexture(canvas);
      const geometry = new THREE.PlaneGeometry(6, 6);
      const material = new THREE.MeshBasicMaterial({ 
        map: texture, 
        side: THREE.DoubleSide,
        transparent: true
      });
      const mesh = new THREE.Mesh(geometry, material);
      
      // 右側に配置
      mesh.position.copy(gatePos).add(right.clone().multiplyScalar(12));
      mesh.position.y = gatePos.y + 8;
      
      const lookAtPos = new THREE.Vector3().copy(mesh.position).sub(tangent);
      mesh.lookAt(lookAtPos);
      
      scene.add(mesh);
    }
    
    // 中央のスタート看板
    {
      const canvas = createStartSignCanvas();
      const texture = new THREE.CanvasTexture(canvas);
      const geometry = new THREE.PlaneGeometry(20, 10);
      const material = new THREE.MeshBasicMaterial({ 
        map: texture, 
        side: THREE.DoubleSide,
        transparent: false
      });
      const mesh = new THREE.Mesh(geometry, material);
      
      mesh.position.copy(gatePos);
      mesh.position.y = gatePos.y + 5;
      
      const lookAtPos = new THREE.Vector3().copy(mesh.position).sub(tangent);
      mesh.lookAt(lookAtPos);
      
      scene.add(mesh);
    }
    
    // 左の柱
    {
      const geometry = new THREE.CylinderGeometry(0.5, 0.5, 15, 16);
      const material = new THREE.MeshPhongMaterial({ color: 0xff6b00 });
      const mesh = new THREE.Mesh(geometry, material);
      
      mesh.position.copy(gatePos).add(right.clone().multiplyScalar(-12));
      mesh.position.y = gatePos.y;
      
      scene.add(mesh);
    }
    
    // 右の柱
    {
      const geometry = new THREE.CylinderGeometry(0.5, 0.5, 15, 16);
      const material = new THREE.MeshPhongMaterial({ color: 0xff6b00 });
      const mesh = new THREE.Mesh(geometry, material);
      
      mesh.position.copy(gatePos).add(right.clone().multiplyScalar(12));
      mesh.position.y = gatePos.y;
      
      scene.add(mesh);
    }
  }


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
