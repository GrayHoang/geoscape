import * as THREE from 'three';
import { MovableCamera } from './render/camera';
import { Input } from './input';
// import { Pane } from 'tweakpane';

const webgl = new THREE.WebGLRenderer();
webgl.setSize(window.innerWidth, window.innerHeight);
webgl.setAnimationLoop(animate);
document.body.appendChild(webgl.domElement);

const input = new Input(webgl.domElement);
const camera = new MovableCamera(input);
input.registerMouseCb(evt => camera.tickMouse(evt));

const clock = new THREE.Clock();

const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);

const scene = new THREE.Scene();
scene.add(cube);

function animate() {
	const dt = clock.getDelta();
	camera.tick(dt);
  webgl.render(scene, camera.inner);
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
