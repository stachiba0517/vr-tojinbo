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
    
    // スタート看板用Canvas
    const createStartSignCanvas = () => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = 600; // 幅を広げる
      canvas.height = 300; // 高さも少し広げる
      
      // 背景（看板の板）
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      // 枠線
      context.strokeStyle = '#ff6b00';
      context.lineWidth = 15;
      context.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
      
      // テキスト（中央）
      context.fillStyle = '#ff0000';
      context.font = 'bold 80px Arial';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText('🦀スタート🦀', canvas.width / 2, canvas.height / 2);
      

      return canvas;
    };
    
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
    
    // 左の柱（地面からそびえ立つ）
    {
      const pillarHeight = 50; // 柱の高さ
      const geometry = new THREE.CylinderGeometry(1, 1.5, pillarHeight, 16);
      const material = new THREE.MeshPhongMaterial({ 
        color: 0xff6b00,
        emissive: 0x331100,
        emissiveIntensity: 0.2
      });
      const mesh = new THREE.Mesh(geometry, material);
      
      // 左側に配置、地面から立つ
      const pillarPos = new THREE.Vector3().copy(gatePos).add(right.clone().multiplyScalar(-12));
      mesh.position.copy(pillarPos);
      mesh.position.y = pillarHeight / 2; // 地面から立つように調整
      
      scene.add(mesh);
      
      // 柱の上のキャップ
      const capGeometry = new THREE.CylinderGeometry(1.5, 1, 2, 16);
      const capMaterial = new THREE.MeshPhongMaterial({ color: 0xffaa00 });
      const capMesh = new THREE.Mesh(capGeometry, capMaterial);
      capMesh.position.copy(pillarPos);
      capMesh.position.y = pillarHeight + 1;
      scene.add(capMesh);
    }
    
    // 右の柱（地面からそびえ立つ）
    {
      const pillarHeight = 50; // 柱の高さ
      const geometry = new THREE.CylinderGeometry(1, 1.5, pillarHeight, 16);
      const material = new THREE.MeshPhongMaterial({ 
        color: 0xff6b00,
        emissive: 0x331100,
        emissiveIntensity: 0.2
      });
      const mesh = new THREE.Mesh(geometry, material);
      
      // 右側に配置、地面から立つ
      const pillarPos = new THREE.Vector3().copy(gatePos).add(right.clone().multiplyScalar(12));
      mesh.position.copy(pillarPos);
      mesh.position.y = pillarHeight / 2; // 地面から立つように調整
      
      scene.add(mesh);
      
      // 柱の上のキャップ
      const capGeometry = new THREE.CylinderGeometry(1.5, 1, 2, 16);
      const capMaterial = new THREE.MeshPhongMaterial({ color: 0xffaa00 });
      const capMesh = new THREE.Mesh(capGeometry, capMaterial);
      capMesh.position.copy(pillarPos);
      capMesh.position.y = pillarHeight + 1;
      scene.add(capMesh);
      
      // 柱の土台（ベースプレート）
      const baseGeometry = new THREE.CylinderGeometry(2, 2.5, 3, 8);
      const baseMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x666666,
        metalness: 0.5,
        roughness: 0.7
      });
      const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
      baseMesh.position.copy(pillarPos);
      baseMesh.position.y = 1.5;
      scene.add(baseMesh);
    }
    
    // 横梁（上部）- 2本の柱をつなぐ
    {
      const beamWidth = 24; // 柱の間の距離
      const beamGeometry = new THREE.BoxGeometry(beamWidth, 1.5, 1.5);
      const beamMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xff6b00,
        emissive: 0x331100,
        emissiveIntensity: 0.2
      });
      const beamMesh = new THREE.Mesh(beamGeometry, beamMaterial);
      beamMesh.position.copy(gatePos);
      beamMesh.position.y = 52; // 柱の上部
      
      // 横梁を進行方向に対して垂直に配置
      const beamRotation = Math.atan2(right.z, right.x);
      beamMesh.rotation.y = beamRotation;
      
      scene.add(beamMesh);
      
      // 装飾用の上部横梁
      const topBeamGeometry = new THREE.BoxGeometry(beamWidth + 2, 0.8, 2);
      const topBeamMaterial = new THREE.MeshPhongMaterial({ color: 0xffaa00 });
      const topBeamMesh = new THREE.Mesh(topBeamGeometry, topBeamMaterial);
      topBeamMesh.position.copy(gatePos);
      topBeamMesh.position.y = 53;
      topBeamMesh.rotation.y = beamRotation;
      scene.add(topBeamMesh);
    }
    
    // 補強の斜め梁（左側）
    {
      const braceGeometry = new THREE.CylinderGeometry(0.3, 0.3, 15, 8);
      const braceMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xcc5500,
        metalness: 0.3
      });
      
      // 左下から右上への斜め梁
      const braceMesh1 = new THREE.Mesh(braceGeometry, braceMaterial);
      const leftPillarPos = new THREE.Vector3().copy(gatePos).add(right.clone().multiplyScalar(-12));
      braceMesh1.position.copy(leftPillarPos);
      braceMesh1.position.y = 12;
      braceMesh1.position.add(right.clone().multiplyScalar(3));
      braceMesh1.rotation.z = Math.PI / 6; // 30度傾ける
      scene.add(braceMesh1);
      
      // 左上から右下への斜め梁
      const braceMesh2 = new THREE.Mesh(braceGeometry, braceMaterial);
      braceMesh2.position.copy(leftPillarPos);
      braceMesh2.position.y = 20;
      braceMesh2.position.add(right.clone().multiplyScalar(3));
      braceMesh2.rotation.z = -Math.PI / 6; // -30度傾ける
      scene.add(braceMesh2);
    }
    
    // 補強の斜め梁（右側）
    {
      const braceGeometry = new THREE.CylinderGeometry(0.3, 0.3, 15, 8);
      const braceMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xcc5500,
        metalness: 0.3
      });
      
      // 右下から左上への斜め梁
      const braceMesh1 = new THREE.Mesh(braceGeometry, braceMaterial);
      const rightPillarPos = new THREE.Vector3().copy(gatePos).add(right.clone().multiplyScalar(12));
      braceMesh1.position.copy(rightPillarPos);
      braceMesh1.position.y = 12;
      braceMesh1.position.add(right.clone().multiplyScalar(-3));
      braceMesh1.rotation.z = -Math.PI / 6; // -30度傾ける
      scene.add(braceMesh1);
      
      // 右上から左下への斜め梁
      const braceMesh2 = new THREE.Mesh(braceGeometry, braceMaterial);
      braceMesh2.position.copy(rightPillarPos);
      braceMesh2.position.y = 20;
      braceMesh2.position.add(right.clone().multiplyScalar(-3));
      braceMesh2.rotation.z = Math.PI / 6; // 30度傾ける
      scene.add(braceMesh2);
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
