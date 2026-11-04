// Fat lines for either renderer (render/webgpu.js RENDERER): the WebGL addons' Line2, LineSegments2 and LineMaterial, or
// their WebGPU twins with Line2NodeMaterial, which takes the same parameters and needs no resolution (it reads the viewport).
import { Line2NodeMaterial } from 'three/webgpu';
import { Line2 as GLLine2 } from 'three/addons/lines/Line2.js';
import { LineSegments2 as GLLineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { Line2 as GPULine2 } from 'three/addons/lines/webgpu/Line2.js';
import { LineSegments2 as GPULineSegments2 } from 'three/addons/lines/webgpu/LineSegments2.js';
import { RENDERER } from './webgpu.js';

const gpu = RENDERER === 'webgpu';
export const Line2 = gpu ? GPULine2 : GLLine2;
export const LineSegments2 = gpu ? GPULineSegments2 : GLLineSegments2;
// resolution: the WebGL material's (shared Vector2, kept up to date by the caller); ignored on WebGPU
export function lineMaterial(params, resolution) {
	if (gpu) return new Line2NodeMaterial(params);
	const m = new LineMaterial(params);
	if (resolution) m.resolution = resolution;
	return m;
}
