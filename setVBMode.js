import * as THREE from "three";

export const setVBMode = (scene) => {
	const color = new THREE.Color(0xb00000);
	const material = new THREE.MeshBasicMaterial({
		color,
		wireframe: true,
		transparent: false,
	});
	scene.traverse(obj => {
		obj.material = material;
	});
	scene.background = new THREE.Color(0x000000);
};
