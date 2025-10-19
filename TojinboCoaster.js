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
  
  // ループの開始と終了位置
  loopStart = 0.45;
  loopEnd = 0.55;
  loopRadius = 15; // ループの半径
  
  getPointAt(t) {
    // 通常のコース
    const tScaled = t * Math.PI;
    const baseX = Math.sin(tScaled * 4) * 40;
    const baseY = Math.sin(tScaled * 10) * 6 + 32;
    const baseZ = Math.cos(tScaled * 2) * 40;
    
    // ループ区間の処理
    if (t >= this.loopStart && t <= this.loopEnd) {
      return this.getLoopPoint(t);
    }
    
    return this.vector.set(baseX, baseY, baseZ);
  }
  


  getLoopPoint(t) {
    // ループ内での進行度（0から1）
    const rawProgress = (t - this.loopStart) / (this.loopEnd - this.loopStart);
    
    // 滑らかなイージング（smoothstep関数）を適用
    const loopProgress = rawProgress * rawProgress * (3 - 2 * rawProgress);
    
    // 通常コースの位置を取得（現在のt値から）
    const tScaled = t * Math.PI;
    const baseX = Math.sin(tScaled * 4) * 40;
    const baseY = Math.sin(tScaled * 10) * 6 + 32;
    const baseZ = Math.cos(tScaled * 2) * 40;
    
    // ループの開始点での通常コースの位置
    const tScaledStart = this.loopStart * Math.PI;
    const startX = Math.sin(tScaledStart * 4) * 40;
    const startY = Math.sin(tScaledStart * 10) * 6 + 32;
    const startZ = Math.cos(tScaledStart * 2) * 40;
    
    // 進行方向ベクトルを計算（微分）
    const dx = Math.cos(tScaledStart * 4) * 4;
    const dy = Math.cos(tScaledStart * 10) * 10;
    const dz = -Math.sin(tScaledStart * 2) * 2;
    
    // 進行方向を正規化
    const dirLength = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const forwardX = dx / dirLength;
    const forwardY = dy / dirLength;
    const forwardZ = dz / dirLength;
    
    // 右方向ベクトル（進行方向と世界の上方向の外積）
    const worldUpX = 0, worldUpY = 1, worldUpZ = 0;
    const rightX = forwardY * worldUpZ - forwardZ * worldUpY;
    const rightY = forwardZ * worldUpX - forwardX * worldUpZ;
    const rightZ = forwardX * worldUpY - forwardY * worldUpX;
    
    // 右方向を正規化
    const rightLength = Math.sqrt(rightX * rightX + rightY * rightY + rightZ * rightZ);
    const normRightX = rightX / rightLength;
    const normRightY = rightY / rightLength;
    const normRightZ = rightZ / rightLength;
    
    // ローカル上方向（右方向と進行方向の外積）
    const localUpX = normRightY * forwardZ - normRightZ * forwardY;
    const localUpY = normRightZ * forwardX - normRightX * forwardZ;
    const localUpZ = normRightX * forwardY - normRightY * forwardX;
    
    // ループの角度（-π/2から開始して一周）下から入って上へ
    const loopAngle = -Math.PI / 2 + loopProgress * Math.PI * 2;
    
    // ループの横方向のオフセット（徐々に左に少しずれていく）
    const horizontalShift = -loopProgress * this.loopRadius * 0.5; // 入口(0)から出口(-0.5*radius)まで
    
    // ループの中心位置（進行に応じて横にずれる）
    const centerX = startX + localUpX * this.loopRadius + normRightX * horizontalShift;
    const centerY = startY + localUpY * this.loopRadius + normRightY * horizontalShift;
    const centerZ = startZ + localUpZ * this.loopRadius + normRightZ * horizontalShift;
    
    // 円周上の位置を計算
    const loopX = centerX + forwardX * Math.cos(loopAngle) * this.loopRadius + localUpX * Math.sin(loopAngle) * this.loopRadius;
    const loopY = centerY + forwardY * Math.cos(loopAngle) * this.loopRadius + localUpY * Math.sin(loopAngle) * this.loopRadius;
    const loopZ = centerZ + forwardZ * Math.cos(loopAngle) * this.loopRadius + localUpZ * Math.sin(loopAngle) * this.loopRadius;
    
    // 通常コースとループの間を滑らかに補間（rawProgressを使用）
    const blendFactor = rawProgress < 0.1 ? rawProgress / 0.1 : (rawProgress > 0.9 ? (1 - rawProgress) / 0.1 : 1);
    
    const x = baseX * (1 - blendFactor) + loopX * blendFactor;
    const y = baseY * (1 - blendFactor) + loopY * blendFactor;
    const z = baseZ * (1 - blendFactor) + loopZ * blendFactor;
    
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
    
    // 看板用Canvas作成関数（文字を切り替え可能）
    const createSignCanvas = (text) => {
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
      context.fillText(text, canvas.width / 2, canvas.height / 2);
      

      return canvas;
    };
    
    // テクスチャを更新する関数
    const updateSignTexture = (texture, text) => {
      const canvas = createSignCanvas(text);
      texture.image = canvas;
      texture.needsUpdate = true;
    };
    
    // 中央のスタート看板（風でひらひら動く布）
    {
      const canvas = createSignCanvas('🦀スタート🦀');
      const texture = new THREE.CanvasTexture(canvas);
      
      // 細かく分割したジオメトリで布を表現
      const geometry = new THREE.PlaneGeometry(20, 10, 40, 20);
      
      // 元の位置を保存
      const originalPositions = geometry.attributes.position.array.slice();
      geometry.userData.originalPositions = originalPositions;
      
      const material = new THREE.MeshStandardMaterial({ 
        map: texture, 
        side: THREE.DoubleSide,
        transparent: false,
        roughness: 0.85,
        metalness: 0.05,
        emissive: 0xffffff,
        emissiveMap: texture,
        emissiveIntensity: 0.7  // 自己発光で明るく見せる
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      
      // 看板を横梁の下に配置（高さ52mの横梁の下）
      const pillarHeight = 50;
      mesh.position.copy(gatePos);
      mesh.position.y = pillarHeight + 2 - 5 - 2.5; // 横梁の下から2.5m下に看板の上端
      
      const lookAtPos = new THREE.Vector3().copy(mesh.position).sub(tangent);
      mesh.lookAt(lookAtPos);
      
      // アニメーション用のデータを保存
      mesh.userData.isCloth = true;
      mesh.userData.time = 0;
      mesh.userData.baseRotation = mesh.rotation.clone();
      
      scene.add(mesh);
      
      // テクスチャ更新関数をシーンに保存
      if (!scene.userData.signControl) {
        scene.userData.signControl = {
          texture: texture,
          material: material,
          updateTexture: updateSignTexture,
          isGoal: false
        };
      }
      
      // 看板の上端の高さを計算
      const bannerTopY = pillarHeight + 2 - 2.5; // 横梁から2.5m下
      
      // 看板を吊り下げるチェーン
      const chainGeometry = new THREE.CylinderGeometry(0.08, 0.08, 2.5, 8);
      const chainMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x888888,
        shininess: 60,
        specular: 0x444444
      });
      
      // 左のチェーン
      const leftChain = new THREE.Mesh(chainGeometry, chainMaterial);
      leftChain.position.copy(gatePos).add(right.clone().multiplyScalar(-8));
      leftChain.position.y = (pillarHeight + 2 + bannerTopY) / 2; // 横梁と看板の間
      scene.add(leftChain);
      
      // 右のチェーン
      const rightChain = new THREE.Mesh(chainGeometry, chainMaterial);
      rightChain.position.copy(gatePos).add(right.clone().multiplyScalar(8));
      rightChain.position.y = (pillarHeight + 2 + bannerTopY) / 2;
      scene.add(rightChain);
      
      // チェーンの接続金具（横梁側）
      const hookGeometry = new THREE.SphereGeometry(0.15, 8, 8);
      const hookMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xcccccc,
        shininess: 80,
        specular: 0x888888
      });
      
      const leftHookTop = new THREE.Mesh(hookGeometry, hookMaterial);
      leftHookTop.position.copy(gatePos).add(right.clone().multiplyScalar(-8));
      leftHookTop.position.y = pillarHeight + 2;
      scene.add(leftHookTop);
      
      const rightHookTop = new THREE.Mesh(hookGeometry, hookMaterial);
      rightHookTop.position.copy(gatePos).add(right.clone().multiplyScalar(8));
      rightHookTop.position.y = pillarHeight + 2;
      scene.add(rightHookTop);
      
      // チェーンの接続金具（看板側）
      const leftHookBottom = new THREE.Mesh(hookGeometry, hookMaterial);
      leftHookBottom.position.copy(gatePos).add(right.clone().multiplyScalar(-8));
      leftHookBottom.position.y = bannerTopY;
      scene.add(leftHookBottom);
      
      const rightHookBottom = new THREE.Mesh(hookGeometry, hookMaterial);
      rightHookBottom.position.copy(gatePos).add(right.clone().multiplyScalar(8));
      rightHookBottom.position.y = bannerTopY;
      scene.add(rightHookBottom);
      
      // 看板の上端に接続リング（視覚的な接続を強調）
      const ringGeometry = new THREE.TorusGeometry(0.3, 0.08, 8, 16);
      const ringMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xff6b00,
        shininess: 50,
        specular: 0xcc5500
      });
      
      const leftRing = new THREE.Mesh(ringGeometry, ringMaterial);
      leftRing.position.copy(gatePos).add(right.clone().multiplyScalar(-8));
      leftRing.position.y = bannerTopY;
      leftRing.rotation.x = Math.PI / 2;
      scene.add(leftRing);
      
      const rightRing = new THREE.Mesh(ringGeometry, ringMaterial);
      rightRing.position.copy(gatePos).add(right.clone().multiplyScalar(8));
      rightRing.position.y = bannerTopY;
      rightRing.rotation.x = Math.PI / 2;
      scene.add(rightRing);
      
      // シーンに布メッシュの参照を保存
      if (!scene.userData.animatedMeshes) {
        scene.userData.animatedMeshes = [];
      }
      scene.userData.animatedMeshes.push(mesh);
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
    }
    
    // 横梁（上部）- 2本の柱をつなぐ
    {
      const pillarHeight = 50;
      const beamWidth = 24; // 柱の間の距離
      const beamGeometry = new THREE.BoxGeometry(beamWidth, 1.5, 1.5);
      const beamMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xff6b00,
        emissive: 0x331100,
        emissiveIntensity: 0.2,
        shininess: 30
      });
      const beamMesh = new THREE.Mesh(beamGeometry, beamMaterial);
      beamMesh.position.copy(gatePos);
      beamMesh.position.y = pillarHeight + 2; // 柱の上部
      
      // 横梁を進行方向に対して垂直に配置
      const beamRotation = Math.atan2(right.z, right.x);
      beamMesh.rotation.y = beamRotation;
      
      scene.add(beamMesh);
      
      // 装飾用の上部横梁（金色）
      const topBeamGeometry = new THREE.BoxGeometry(beamWidth + 2, 0.8, 2);
      const topBeamMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xffaa00,
        emissive: 0x885500,
        emissiveIntensity: 0.3,
        shininess: 60
      });
      const topBeamMesh = new THREE.Mesh(topBeamGeometry, topBeamMaterial);
      topBeamMesh.position.copy(gatePos);
      topBeamMesh.position.y = pillarHeight + 3.2;
      topBeamMesh.rotation.y = beamRotation;
      scene.add(topBeamMesh);
    }
    
    // ゲート全体を照らすライト
    {
      // 正面から看板を照らすスポットライト
      const spotLight1 = new THREE.SpotLight(0xffffff, 1.5);
      spotLight1.position.copy(gatePos);
      spotLight1.position.y = gatePos.y + 15;
      spotLight1.position.add(tangent.clone().multiplyScalar(-10));
      spotLight1.target.position.copy(gatePos);
      spotLight1.target.position.y = gatePos.y + 5;
      spotLight1.angle = Math.PI / 6;
      spotLight1.penumbra = 0.3;
      spotLight1.castShadow = false;
      scene.add(spotLight1);
      scene.add(spotLight1.target);
      
      // 後ろからも照らす（リムライト効果）
      const spotLight2 = new THREE.SpotLight(0xffd080, 0.8);
      spotLight2.position.copy(gatePos);
      spotLight2.position.y = gatePos.y + 10;
      spotLight2.position.add(tangent.clone().multiplyScalar(15));
      spotLight2.target.position.copy(gatePos);
      spotLight2.target.position.y = gatePos.y + 5;
      spotLight2.angle = Math.PI / 5;
      spotLight2.penumbra = 0.4;
      scene.add(spotLight2);
      scene.add(spotLight2.target);
      
      // 柱を照らす左右のライト
      const leftLight = new THREE.PointLight(0xffaa00, 0.8, 30);
      leftLight.position.copy(gatePos).add(right.clone().multiplyScalar(-12));
      leftLight.position.y = 45;
      scene.add(leftLight);
      
      const rightLight = new THREE.PointLight(0xffaa00, 0.8, 30);
      rightLight.position.copy(gatePos).add(right.clone().multiplyScalar(12));
      rightLight.position.y = 45;
      scene.add(rightLight);
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
