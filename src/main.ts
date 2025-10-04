import * as THREE from 'three';
import { MovableCamera } from './camera';
import { Input } from './input';
// import { Pane } from 'tweakpane';

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animate);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const clock = new THREE.Clock();
const input = new Input(renderer.domElement);
const camera = new MovableCamera(input);
input.registerMouseCb(evt => camera.tickMouse(evt));

const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

function animate() {
	const dt = clock.getDelta();
	camera.tick(dt);
  renderer.render(scene, camera.inner);
}

// const PARAMS = {
// 	factor: 123,
// 	title: 'hello',
// 	color: '#ff0055',
// };
//
// const pane = new Pane();
//
// pane.addBinding(PARAMS, 'factor');
// pane.addBinding(PARAMS, 'title');
// pane.addBinding(PARAMS, 'color');
