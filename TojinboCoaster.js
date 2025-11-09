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

export class Curve extends THREE.Curve {
	vector = new THREE.Vector3();
	vector2 = new THREE.Vector3();
	vector3 = new THREE.Vector3();
  _isLogging = false; // 無限再帰防止フラグ
  
  // ループの開始と終了位置
  loopStart = 0.45;
  loopEnd = 0.55;
  loopRadius = 30; // ループの半径（2倍に拡大）
  
  // THREE.Curveの必須メソッド
  getPoint(t, optionalTarget = new THREE.Vector3()) {
    return this.getPointAt(t, optionalTarget);
  }
  
  getPointAt(t, optionalTarget) {
    const target = optionalTarget || this.vector;
    // 通常のコース
    const tScaled = t * Math.PI;
    const baseX = Math.sin(tScaled * 4) * 40;
    const baseY = Math.sin(tScaled * 10) * 6 + 32;
    const baseZ = Math.cos(tScaled * 2) * 40;
    
    // ループ区間の処理
    if (t >= this.loopStart && t <= this.loopEnd) {
      return this.getLoopPoint(t, target);
    }
    
    // ループ終了後の遷移区間（滝のような急落を防ぐ）
    const transitionLength = 0.16; // 遷移区間の長さ（加速を1/2にするため2倍に延長）
    if (t > this.loopEnd && t <= this.loopEnd + transitionLength) {
      // ループ出口の高さを取得
      const tScaledStart = this.loopStart * Math.PI;
      const loopExitY = Math.sin(tScaledStart * 10) * 6 + 32; // ループ入口と同じ高さ
      
      // 遷移の進行度（0〜1）
      const transitionProgress = (t - this.loopEnd) / transitionLength;
      // smoothstepで滑らかに
      const smoothProgress = transitionProgress * transitionProgress * (3 - 2 * transitionProgress);
      
      // ループ出口の高さから通常コースの高さへ徐々に遷移
      const transitionY = loopExitY * (1 - smoothProgress) + baseY * smoothProgress;
      
      return target.set(baseX, transitionY, baseZ);
    }
    
    return target.set(baseX, baseY, baseZ);
  }
  


  getLoopPoint(t, optionalTarget) {
    const target = optionalTarget || this.vector;
    // ループ内での進行度（0から1）
    const rawProgress = (t - this.loopStart) / (this.loopEnd - this.loopStart);
    
    // 滑らかなイージング（smoothstep関数）を適用
    const loopProgress = rawProgress * rawProgress * (3 - 2 * rawProgress);
    
    // ループの開始点での通常コースの位置を取得
    const tScaledStart = this.loopStart * Math.PI;
    const startX = Math.sin(tScaledStart * 4) * 40;
    const startY = Math.sin(tScaledStart * 10) * 6 + 32;
    const startZ = Math.cos(tScaledStart * 2) * 40;
    
    // ループ区間では、通常コースの高さを入口の高さで固定（急加速を防ぐ）
    const tScaled = t * Math.PI;
    const baseX = Math.sin(tScaled * 4) * 40;
    const baseY = startY; // 高さを入口で固定
    const baseZ = Math.cos(tScaled * 2) * 40;
    
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
    
    // らせん状オフセット：進行度に応じて右から左へ移動
    // 入口（progress=0）: 右側 (0), 出口（progress=1）: 左側へ
    const spiralOffset = (1 - loopProgress) * 0 - loopProgress * 10; // 右から左へ（ループサイズに合わせて調整）
    
    // ループの中心位置（らせん状オフセットを追加）
    const centerX = startX + localUpX * this.loopRadius + normRightX * spiralOffset;
    const centerY = startY + localUpY * this.loopRadius + normRightY * spiralOffset;
    const centerZ = startZ + localUpZ * this.loopRadius + normRightZ * spiralOffset;
    
    // 円周上の位置を計算
    const loopX = centerX + forwardX * Math.cos(loopAngle) * this.loopRadius + localUpX * Math.sin(loopAngle) * this.loopRadius;
    const loopY = centerY + forwardY * Math.cos(loopAngle) * this.loopRadius + localUpY * Math.sin(loopAngle) * this.loopRadius;
    const loopZ = centerZ + forwardZ * Math.cos(loopAngle) * this.loopRadius + localUpZ * Math.sin(loopAngle) * this.loopRadius;
    
    // 通常コースとループの間を滑らかに補間
    // 入口と出口でsmoothstepを使用してより滑らかに
    const blendStart = 0.2; // 入口のブレンド範囲を広げる
    const blendEnd = 0.8;   // 出口のブレンド範囲を広げる（レールの伸びを防ぐ）
    
    let blendFactor;
    if (rawProgress < blendStart) {
      // 入口: 0から1への滑らかな遷移（smoothstep）
      const t = rawProgress / blendStart;
      blendFactor = t * t * (3 - 2 * t);
    } else if (rawProgress > blendEnd) {
      // 出口: 1から0への滑らかな遷移（smoothstep）
      const t = (1 - rawProgress) / (1 - blendEnd);
      blendFactor = t * t * (3 - 2 * t);
    } else {
      // 中間: 完全にループ
      blendFactor = 1;
    }
    
    const x = baseX * (1 - blendFactor) + loopX * blendFactor;
    const y = baseY * (1 - blendFactor) + loopY * blendFactor;
    const z = baseZ * (1 - blendFactor) + loopZ * blendFactor;
    
    return target.set(x, y, z);
  }
  
  getTangentAt(t) {
    const delta = 0.0001;
    const t1 = Math.max(0, t - delta);
    const t2 = Math.min(1, t + delta);
    return this.vector2.copy(this.getPointAt(t2)).sub(this.getPointAt(t1)).normalize();
  }
  
  // レールの「上方向」を明示的に指定するメソッド
  getBinormalAt(t) {
    // ループ区間の場合
    if (t >= this.loopStart && t <= this.loopEnd) {
      // ループ内での進行度（0から1）
      const rawProgress = (t - this.loopStart) / (this.loopEnd - this.loopStart);
      const loopProgress = rawProgress * rawProgress * (3 - 2 * rawProgress);
      
      // ループの角度（-π/2から開始して2π回転）
      const loopAngle = -Math.PI / 2 + loopProgress * Math.PI * 2;
      
      // ループ開始点での座標系（ループ平面の基準）
      const tScaledStart = this.loopStart * Math.PI;
      
      const dx = Math.cos(tScaledStart * 4) * 4;
      const dy = Math.cos(tScaledStart * 10) * 10;
      const dz = -Math.sin(tScaledStart * 2) * 2;
      
      const dirLength = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const forwardX = dx / dirLength;
      const forwardY = dy / dirLength;
      const forwardZ = dz / dirLength;
      
      const worldUpX = 0, worldUpY = 1, worldUpZ = 0;
      const rightX = forwardY * worldUpZ - forwardZ * worldUpY;
      const rightY = forwardZ * worldUpX - forwardX * worldUpZ;
      const rightZ = forwardX * worldUpY - forwardY * worldUpX;
      
      const rightLength = Math.sqrt(rightX * rightX + rightY * rightY + rightZ * rightZ);
      const normRightX = rightX / rightLength;
      const normRightY = rightY / rightLength;
      const normRightZ = rightZ / rightLength;
      
      const localUpX = normRightY * forwardZ - normRightZ * forwardY;
      const localUpY = normRightZ * forwardX - normRightX * forwardZ;
      const localUpZ = normRightX * forwardY - normRightY * forwardX;
      
      // ループの中心位置を取得（getLoopPointと同じ計算）
      const startX = Math.sin(tScaledStart * 4) * 40;
      const startY = Math.sin(tScaledStart * 10) * 6 + 32;
      const startZ = Math.cos(tScaledStart * 2) * 40;
      
      const spiralOffset = (1 - loopProgress) * 0 - loopProgress * 10; // ループサイズに合わせて調整
      
      const centerX = startX + localUpX * this.loopRadius + normRightX * spiralOffset;
      const centerY = startY + localUpY * this.loopRadius + normRightY * spiralOffset;
      const centerZ = startZ + localUpZ * this.loopRadius + normRightZ * spiralOffset;
      
      // 現在の位置を取得
      const currentPos = this.getPointAt(t);
      
      // 現在の位置から中心への方向ベクトル（内向き）= binormal
      // 通常区間でbinormal=上向きなので、ループでは中心方向（上/内側）を指す
      // 0度：中心は上なのでbinormal=上向き、90度：中心は下なのでbinormal=下向き
      const binormalX = centerX - currentPos.x;
      const binormalY = centerY - currentPos.y;
      const binormalZ = centerZ - currentPos.z;
      
      return this.vector3.set(binormalX, binormalY, binormalZ).normalize();
    }
    
    // 遷移範囲の計算（ループ外）
    const transitionRangeStart = 0.03; // ループ開始前の遷移範囲
    const transitionRangeEnd = 0.16;   // ループ終了後の遷移範囲（加速を1/2にするため2倍に延長）
    const tScaledStart = this.loopStart * Math.PI;
    const startX = Math.sin(tScaledStart * 4) * 40;
    const startY = Math.sin(tScaledStart * 10) * 6 + 32;
    const startZ = Math.cos(tScaledStart * 2) * 40;
    
    const dx = Math.cos(tScaledStart * 4) * 4;
    const dy = Math.cos(tScaledStart * 10) * 10;
    const dz = -Math.sin(tScaledStart * 2) * 2;
    
    const dirLength = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const forwardX = dx / dirLength;
    const forwardY = dy / dirLength;
    const forwardZ = dz / dirLength;
    
    const worldUpX = 0, worldUpY = 1, worldUpZ = 0;
    const rightX = forwardY * worldUpZ - forwardZ * worldUpY;
    const rightY = forwardZ * worldUpX - forwardX * worldUpZ;
    const rightZ = forwardX * worldUpY - forwardY * worldUpX;
    
    const rightLength = Math.sqrt(rightX * rightX + rightY * rightY + rightZ * rightZ);
    const normRightX = rightX / rightLength;
    const normRightY = rightY / rightLength;
    const normRightZ = rightZ / rightLength;
    
    const localUpX = normRightY * forwardZ - normRightZ * forwardY;
    const localUpY = normRightZ * forwardX - normRightX * forwardZ;
    const localUpZ = normRightX * forwardY - normRightY * forwardX;
    
    // 遷移範囲（ループ開始前）では、ループ開始時点のlocalUp方向を返す
    // これにより、通常コースからループ座標系への滑らかな遷移が可能になる
    if (t >= this.loopStart - transitionRangeStart && t < this.loopStart) {
      // ループ開始時点での上方向（localUp）を返す
      return this.vector3.set(localUpX, localUpY, localUpZ).normalize();
    }
    
    // ループ終了後の遷移範囲：ループ座標系から世界の上方向へ徐々に遷移
    if (t > this.loopEnd && t <= this.loopEnd + transitionRangeEnd) {
      // ループ終了時点での座標系を計算
      const tScaledEnd = this.loopEnd * Math.PI;
      const dxEnd = Math.cos(tScaledEnd * 4) * 4;
      const dyEnd = Math.cos(tScaledEnd * 10) * 10;
      const dzEnd = -Math.sin(tScaledEnd * 2) * 2;
      
      const dirLengthEnd = Math.sqrt(dxEnd * dxEnd + dyEnd * dyEnd + dzEnd * dzEnd);
      const forwardXEnd = dxEnd / dirLengthEnd;
      const forwardYEnd = dyEnd / dirLengthEnd;
      const forwardZEnd = dzEnd / dirLengthEnd;
      
      const worldUpX = 0, worldUpY = 1, worldUpZ = 0;
      const rightXEnd = forwardYEnd * worldUpZ - forwardZEnd * worldUpY;
      const rightYEnd = forwardZEnd * worldUpX - forwardXEnd * worldUpZ;
      const rightZEnd = forwardXEnd * worldUpY - forwardYEnd * worldUpX;
      
      const rightLengthEnd = Math.sqrt(rightXEnd * rightXEnd + rightYEnd * rightYEnd + rightZEnd * rightZEnd);
      const normRightXEnd = rightXEnd / rightLengthEnd;
      const normRightYEnd = rightYEnd / rightLengthEnd;
      const normRightZEnd = rightZEnd / rightLengthEnd;
      
      const localUpXEnd = normRightYEnd * forwardZEnd - normRightZEnd * forwardYEnd;
      const localUpYEnd = normRightZEnd * forwardXEnd - normRightXEnd * forwardZEnd;
      const localUpZEnd = normRightXEnd * forwardYEnd - normRightYEnd * forwardXEnd;
      
      // 遷移の進行度（0〜1）
      const transitionProgress = (t - this.loopEnd) / transitionRangeEnd;
      const smoothProgress = transitionProgress * transitionProgress * (3 - 2 * transitionProgress);
      
      // ループ終了時点の上方向から世界の上方向へ滑らかに補間
      const binormalX = localUpXEnd * (1 - smoothProgress) + worldUpX * smoothProgress;
      const binormalY = localUpYEnd * (1 - smoothProgress) + worldUpY * smoothProgress;
      const binormalZ = localUpZEnd * (1 - smoothProgress) + worldUpZ * smoothProgress;
      
      return this.vector3.set(binormalX, binormalY, binormalZ).normalize();
    }
    
    // 通常区間では世界の上方向を返す
    return this.vector3.set(0, 1, 0);
  }
  
  // パラレルトランスポート方式でフレームを計算
  // TubeGeometryと同じ方式で、ねじれを最小化
  computeFrenetFrames(segments, closed) {
    const tangents = [];
    const normals = [];
    const binormals = [];
    
    // 各点での接線を計算
    for (let i = 0; i <= segments; i++) {
      const u = i / segments;
      tangents[i] = this.getTangentAt(u).clone();
    }
    
    // 初期フレームを設定
    const normal = new THREE.Vector3();
    let min = Number.MAX_VALUE;
    const tx = Math.abs(tangents[0].x);
    const ty = Math.abs(tangents[0].y);
    const tz = Math.abs(tangents[0].z);
    
    if (tx <= min) {
      min = tx;
      normal.set(1, 0, 0);
    }
    if (ty <= min) {
      min = ty;
      normal.set(0, 1, 0);
    }
    if (tz <= min) {
      normal.set(0, 0, 1);
    }
    
    const vec = new THREE.Vector3().crossVectors(tangents[0], normal).normalize();
    normals[0] = new THREE.Vector3().crossVectors(tangents[0], vec);
    binormals[0] = new THREE.Vector3().crossVectors(tangents[0], normals[0]);
    
    // パラレルトランスポート方式で各点のフレームを計算
    for (let i = 1; i <= segments; i++) {
      const u = i / segments;
      
      // パラレルトランスポートで法線を計算（すべての点で）
      normals[i] = normals[i - 1].clone();
      
      const axis = new THREE.Vector3().crossVectors(tangents[i - 1], tangents[i]);
      
      if (axis.length() > Number.EPSILON) {
        axis.normalize();
        const theta = Math.acos(THREE.MathUtils.clamp(tangents[i - 1].dot(tangents[i]), -1, 1));
        normals[i].applyAxisAngle(axis, theta);
      }
      
      binormals[i] = new THREE.Vector3().crossVectors(tangents[i], normals[i]);
    }
    
    // ループ区間では、パラレルトランスポートの結果を完全に上書き
    for (let i = 0; i <= segments; i++) {
      const u = i / segments;
      
      if (u >= this.loopStart && u <= this.loopEnd) {
        // ループ用の幾何学的に正しい上方向を取得
        const loopBinormal = this.getBinormalAt(u);
        // 正しい外積の順序: normal = binormal × tangent
        const loopNormal = new THREE.Vector3().crossVectors(loopBinormal, tangents[i]).normalize();
        
        // 完全に上書き（ブレンドなし）
        binormals[i].copy(loopBinormal);
        normals[i].copy(loopNormal);
      }
    }
    
    // 閉じたカーブの場合、最初と最後のフレームを一致させる
    // ただし、ループ区間は除外
    if (closed === true) {
      let theta = Math.acos(THREE.MathUtils.clamp(normals[0].dot(normals[segments]), -1, 1));
      theta /= segments;
      
      if (tangents[0].dot(new THREE.Vector3().crossVectors(normals[0], normals[segments])) > 0) {
        theta = -theta;
      }
      
      for (let i = 1; i <= segments; i++) {
        const u = i / segments;
        // ループ区間は除外
        if (u < this.loopStart || u > this.loopEnd) {
          normals[i].applyAxisAngle(tangents[i], theta * i);
          binormals[i].crossVectors(tangents[i], normals[i]);
        }
      }
    }
    
    return {
      tangents: tangents,
      normals: normals,
      binormals: binormals
    };
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
    texture.colorSpace = THREE.SRGBColorSpace; // three.js r150+ の推奨設定
    const material = new THREE.MeshBasicMaterial({ map: texture});
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



  // カスタムレールジオメトリを作成
  {
    // まず、RollerCoasterGeometryは使わず、独自のレールを作成
    // 2本のレール（左右）を作成
    const railRadius = 0.1;
    const railSegments = 1500;
    const railSeparation = 0.8; // レール間の距離
    
    // 左レール用のカーブ
    class OffsetCurve extends THREE.Curve {
      constructor(baseCurve, offset) {
        super();
        this.baseCurve = baseCurve;
        this.offset = offset; // 横方向のオフセット
      }
      
      getPoint(t, optionalTarget = new THREE.Vector3()) {
        const pos = this.baseCurve.getPointAt(t);
        const tangent = this.baseCurve.getTangentAt(t);
        const binormal = this.baseCurve.getBinormalAt ? this.baseCurve.getBinormalAt(t) : new THREE.Vector3(0, 1, 0);
        
        // binormalとtangentの外積でnormal（横方向）を取得
        const normal = new THREE.Vector3().crossVectors(binormal, tangent).normalize();
        
        // 横方向にオフセット
        pos.add(normal.multiplyScalar(this.offset));
        
        return optionalTarget.copy(pos);
      }
    }
    
    const leftRailCurve = new OffsetCurve(curve, -railSeparation / 2);
    const rightRailCurve = new OffsetCurve(curve, railSeparation / 2);
    
    // TubeGeometryでレールを作成
    const leftRailGeometry = new THREE.TubeGeometry(leftRailCurve, railSegments, railRadius, 8, false);
    const rightRailGeometry = new THREE.TubeGeometry(rightRailCurve, railSegments, railRadius, 8, false);
    
    const railMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x888888,
      shininess: 80,
      specular: 0x444444
    });
    
    const leftRailMesh = new THREE.Mesh(leftRailGeometry, railMaterial);
    const rightRailMesh = new THREE.Mesh(rightRailGeometry, railMaterial);
    
    scene.add(leftRailMesh);
    scene.add(rightRailMesh);
    
    const sleeperURL = '/models/sleeper.glb';

    try {
      const sleepLoader = new PromiseGLTFLoader();
      let sleeperProto = (await sleepLoader.promiseLoad(sleeperURL)).scene;

      // 見た目調整
      sleeperProto.traverse(o => {
        if (o.isMesh) {
          o.castShadow = o.receiveShadow = true;
          if (o.material?.map) o.material.map.colorSpace = THREE.SRGBColorSpace;
        }
      });

      // 原点を中心へ
      {
        const box = new THREE.Box3().setFromObject(sleeperProto);
        const c = box.getCenter(new THREE.Vector3());
        const g = new THREE.Group();
        sleeperProto.position.sub(c);
        g.add(sleeperProto);
        g.updateMatrixWorld(true);
        sleeperProto = g;
      }

      // スケール係数を計算
      const baseBox = new THREE.Box3().setFromObject(sleeperProto);
      const baseSize = baseBox.getSize(new THREE.Vector3());
      const baseLenX = baseSize.x;

      const extra = 0.40;
      const targetLen = railSeparation + extra;
      const kUniform = targetLen / baseLenX;
      const visualScale = 1.05;
    
      // 4) 敷設
      const step = 10;
      for (let i = 0; i < railSegments; i += step) {
        const t = i / railSegments;
      
        // 左右レールの中点
        const L = leftRailCurve.getPoint(t);
        const R = rightRailCurve.getPoint(t);
        const center = new THREE.Vector3().addVectors(L, R).multiplyScalar(0.5);
      
        // 枕木の右方向（長手）= 左右差ベクトル
        const right = new THREE.Vector3().subVectors(R, L).normalize();
        // 上方向 = コースの binormal（なければ世界Up）
        const up = curve.getBinormalAt ? curve.getBinormalAt(t) : new THREE.Vector3(0, 1, 0);
        // 前方向 = right × up（右手系）
        const forward = new THREE.Vector3().crossVectors(right, up).normalize();
      
        // 変換行列 = T * R （スケールは“最初の一回のみ”適用済み）
        const T  = new THREE.Matrix4().makeTranslation(center.x, center.y, center.z);
        const Rm = new THREE.Matrix4().makeBasis(right, up, forward.negate()); // -Z注視系に合わせるなら negate

        const S = new THREE.Matrix4().makeScale(
          kUniform * visualScale,
          kUniform * visualScale,
          kUniform * visualScale
        );
      
        const tie = sleeperProto.clone(true);
        tie.matrixAutoUpdate = false;
        tie.matrix.multiplyMatrices(T, Rm).multiply(S);

        scene.add(tie);
      }
    
        } catch (e) {
          console.error('[sleeper GLB] load failed, fallback to BoxGeometry.', e);
        
          const tieGeometry = new THREE.BoxGeometry(1, 1, 1);
          const tieMaterial = new THREE.MeshStandardMaterial({ color: 0x654321, metalness: 0, roughness: 0.75 });
        
          const extra = 0.40, step = 10;
        
          for (let i = 0; i < railSegments; i += step) {
            const t = i / railSegments;
            const L = leftRailCurve.getPoint(t);
            const R = rightRailCurve.getPoint(t);
            const center = new THREE.Vector3().addVectors(L, R).multiplyScalar(0.5);
          
            const span   = new THREE.Vector3().subVectors(R, L);
            const length = span.length() + extra;
            const right  = span.clone().normalize();
          
            const up = curve.getBinormalAt ? curve.getBinormalAt(t) : new THREE.Vector3(0, 1, 0);
            const forward = new THREE.Vector3().crossVectors(right, up).normalize();
          
            const T  = new THREE.Matrix4().makeTranslation(center.x, center.y, center.z);
            const Rm = new THREE.Matrix4().makeBasis(right, up, forward.negate());
            const S  = new THREE.Matrix4().makeScale(length, 0.1, 0.2); // 高さ/奥行きは固定
          
            const M = new THREE.Matrix4().multiplyMatrices(T, Rm).multiply(S);
          
            const tie = new THREE.Mesh(tieGeometry, tieMaterial);
            tie.matrixAutoUpdate = false;
            tie.matrix.copy(M);
            scene.add(tie);
          }
    }
  }

  { // lifter
    const geometry = new RollerCoasterLiftersGeometry(curve, 50);
    const material = new THREE.MeshPhongMaterial();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = 0.1;
    scene.add(mesh);
  }

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
      const canvas = createSignCanvas('スタート');
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

};
