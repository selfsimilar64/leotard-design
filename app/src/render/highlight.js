// What the pointer is over in Select (ui/tools.js hover, Engine.setHover): pieces, straps and logos
// get an outline of their 3D shape, stones a ring each. Shown only while the editing overlay is (so
// never in a capture or thumbnail: App.withoutOverlay, and not while H previews the look).
//  - outline: the parts' meshes drawn into a mask (R everywhere, G where nothing stands in front of
//    them), then a screen-space edge drawn after the tone mapping, so its colour and width do not
//    depend on the lights. Same displacement as the fabric's vertex shader (materials/fabric.js:
//    position + normal * uOffset + aLift * uGarment; keep the two in step).
//  - rings: points in the overlay's group, sized from the stones; where a stone is too small on
//    screen to show a ring it is a soft dot, so a dense group reads as a tint.
import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { RENDERER } from './webgpu.js';
import { OutlineNode } from './outline-node.js';
import { ringSprite } from './rings-node.js';
import { uniform } from 'three/tsl';

const CLEAR = 0.006;          // m: what stands closer than this to the part (stones, straps) does not hide it
const OUTLINE_PX = 1.5;       // CSS pixels
const STONE_ROOM = 0.0005;    // m above the stone's centre: a ring is not cut by its own stone
const COLOUR = 'vec3(1.0)', DARK = 'vec3(0.03, 0.03, 0.05)';

function maskMaterial(source, box, depth) {
	const u = source.userData.u;
	return new THREE.ShaderMaterial({
		uniforms: {
			uOffset: u.uOffset, uGarment: u.uGarment, uClip: u.uClip, // the part's own, so it follows them
			uBox: { value: box ?? new THREE.Matrix4() }, uUseBox: { value: box ? 1 : 0 },
			tDepth: depth, uRes: { value: new THREE.Vector2() }, uNear: { value: 0.01 }, uFar: { value: 40 },
		},
		vertexShader: /* glsl */`
			attribute vec3 aLift; attribute vec3 aRef; attribute vec4 aKeepForm; // keep in x (materials/fabric-attributes.js)
			uniform float uOffset, uGarment;
			varying vec3 vRef; varying float vKeep, vZ;
			void main() {
				vRef = aRef; vKeep = aKeepForm.x;
				vec4 mv = modelViewMatrix * vec4( position + normal * uOffset + aLift * uGarment, 1. );
				vZ = - mv.z;
				gl_Position = projectionMatrix * mv;
			}`,
		fragmentShader: /* glsl */`
			#include <packing>
			uniform sampler2D tDepth; uniform mat4 uBox; uniform vec2 uRes;
			uniform float uUseBox, uClip, uNear, uFar;
			varying vec3 vRef; varying float vKeep, vZ;
			void main() {
				if ( uClip > .5 && vKeep < 0. ) discard;
				if ( uUseBox > .5 ) { vec3 d = ( uBox * vec4( vRef, 1. ) ).xyz; if ( abs( d.x ) > .5 || abs( d.y ) > .5 || abs( d.z ) > 1. ) discard; }
				float front = - perspectiveDepthToViewZ( texture2D( tDepth, gl_FragCoord.xy / uRes ).x, uNear, uFar );
				gl_FragColor = vec4( 1., vZ - front < ${CLEAR.toFixed(4)} ? 1. : 0., 0., 1. );
			}`,
		side: THREE.DoubleSide, depthTest: false, depthWrite: false, transparent: true,
		blending: THREE.CustomBlending, blendEquation: THREE.MaxEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
	});
}

class OutlinePass extends Pass {
	constructor(viewport, isOn) {
		super();
		this.viewport = viewport; this.isOn = isOn;
		this.enabled = false;
		this.mask = new THREE.WebGLRenderTarget(1, 1, { samples: 4, depthBuffer: false });
		this.scene = new THREE.Scene();
		this.depth = { value: null };
		this.quad = new FullScreenQuad(new THREE.ShaderMaterial({
			uniforms: { tDiffuse: { value: null }, tMask: { value: this.mask.texture }, uTexel: { value: new THREE.Vector2() }, uR: { value: 2 }, uOn: { value: 0 } },
			vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
			fragmentShader: /* glsl */`
				uniform sampler2D tDiffuse, tMask; uniform vec2 uTexel; uniform float uR, uOn;
				varying vec2 vUv;
				void main() {
					vec3 c = texture2D( tDiffuse, vUv ).rgb;
					vec2 m = uOn > .5 ? texture2D( tMask, vUv ).rg : vec2( 1. );
					float near = 0., far = 0., hid = 0.;
					if ( m.g < 1. && uOn > .5 ) for ( int i = 0; i < 16; i ++ ) {
						float a = float( i ) * .3927;
						vec2 d = vec2( cos( a ), sin( a ) ) * uTexel;
						vec2 s0 = texture2D( tMask, vUv + d * uR * .5 ).rg, s1 = texture2D( tMask, vUv + d * uR ).rg;
						near = max( near, max( s0.g, s1.g ) );
						far = max( far, texture2D( tMask, vUv + d * uR * 1.9 ).g );
						hid = max( hid, max( s0.r, s1.r ) );
					}
					float line = near * ( 1. - m.g );                        // outside the shape as seen
					float halo = far * ( 1. - m.g ) * ( 1. - line ) * .5;    // so it shows on white cloth too
					float behind = hid * ( 1. - m.r ) * ( 1. - near ) * .4;  // the part that runs behind something: faint
					c = mix( c, ${DARK}, halo );
					c = mix( c, ${COLOUR}, max( line, behind ) );
					gl_FragColor = vec4( c, 1. );
				}`,
			depthTest: false, depthWrite: false, blending: THREE.NoBlending,
		}));
	}

	// parts: [{ mesh, box? }]; box: reference space -> a logo's box (the mesh only inside it)
	set(parts) {
		for (const p of [...this.scene.children]) { this.scene.remove(p); p.material.dispose(); }
		for (const { mesh, box } of parts) {
			const p = new THREE.Mesh(mesh.geometry, maskMaterial(mesh.material, box, this.depth));
			p.userData.source = mesh;
			p.matrixAutoUpdate = false; p.matrixWorldAutoUpdate = false; p.frustumCulled = false;
			this.scene.add(p);
		}
		this.enabled = parts.length > 0;
	}

	setSize(w, h) { this.mask.setSize(w, h); this.quad.material.uniforms.uTexel.value.set(1 / w, 1 / h); }

	render(renderer, writeBuffer, readBuffer) {
		const U = this.quad.material.uniforms, cam = this.viewport.camera, on = this.isOn();
		if (on) {
			this.depth.value = this.viewport.scenePass.depthTexture;
			for (const p of this.scene.children) {
				p.matrixWorld.copy(p.userData.source.matrixWorld);
				const u = p.material.uniforms;
				u.uRes.value.set(this.mask.width, this.mask.height); u.uNear.value = cam.near; u.uFar.value = cam.far;
			}
			const clear = renderer.getClearColor(new THREE.Color()), alpha = renderer.getClearAlpha();
			renderer.setRenderTarget(this.mask);
			renderer.setClearColor(0x000000, 0); renderer.clear();
			renderer.render(this.scene, cam);
			renderer.setClearColor(clear, alpha);
		}
		U.tDiffuse.value = readBuffer.texture; U.uOn.value = on ? 1 : 0;
		U.uR.value = OUTLINE_PX * renderer.getPixelRatio();
		renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
		this.quad.render(renderer);
	}

	dispose() { this.set([]); this.mask.dispose(); this.quad.dispose(); }
}

export class HoverHighlight {
	constructor(viewport, parent, isOn) {
		this.viewport = viewport; this.parent = parent;
		// (WebGPU: its twin, render/outline-node.js, drawn by render/webgpu-post.js)
		this.pass = RENDERER === 'webgpu' ? new OutlineNode(viewport, isOn) : new OutlinePass(viewport, isOn);
		viewport.composer.addPass(this.pass); // after the tone mapping
		this.rings = null;
		// (render/warmup.js compiles it at the start on a stand-in with aSize and aStrong: change both)
		this.ringMat = new THREE.ShaderMaterial({
			uniforms: { uPx: { value: 1000 }, uPr: { value: 1 } },
			vertexShader: /* glsl */`
				attribute float aSize, aStrong;
				uniform float uPx, uPr;
				varying float vR, vStrong, vBox;
				void main() {
					vec4 mv = modelViewMatrix * vec4( position, 1. );
					float d = aSize * 1.3 * uPx / - mv.z;
					d = aStrong > .5 ? max( d * 1.15, 11. * uPr ) : max( d, 3. * uPr );
					vR = d * .5; vStrong = aStrong;
					vBox = d + 6. * uPr;
					gl_PointSize = vBox;
					gl_Position = projectionMatrix * mv;
				}`,
			fragmentShader: /* glsl */`
				uniform float uPr;
				varying float vR, vStrong, vBox;
				void main() {
					float r = length( gl_PointCoord - .5 ) * vBox;
					vec4 c;
					if ( vR < 3.5 * uPr && vStrong < .5 ) {
						// too small on screen for a ring
						c = vec4( ${COLOUR}, .6 * ( 1. - smoothstep( vR - 1., vR, r ) ) );
					} else {
						float w = ( vStrong > .5 ? 1.1 : .7 ) * uPr;
						float line = 1. - smoothstep( w - .7, w + .7, abs( r - vR ) );
						float halo = .55 * ( 1. - smoothstep( w - .7, w + .7, abs( r - vR - 1.6 * w - .6 ) ) );
						c = vec4( mix( ${DARK}, ${COLOUR}, line ), max( line, halo ) );
					}
					if ( c.a < .01 ) discard;
					gl_FragColor = c;
				}`,
			transparent: true, depthWrite: false,
			// the image's alpha stays: it marks skin for the skin pass (render/postfx.js)
			blending: THREE.CustomBlending, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
		});
	}

	setParts(parts) { this.pass.set(parts); }

	// stones: from StoneView (s.at, s.up, s.size); strong: the one under the pointer
	setStones(stones, strong = null) {
		// (a WebGPU ring sprite's own geometry is three's shared quad: its attributes' geometry goes instead)
		if (this.rings) { this.parent.remove(this.rings); (this.rings.isSprite ? this.rings.userData.geo : this.rings.geometry).dispose(); this.rings = null; }
		if (!stones.length) return;
		const n = stones.length, pos = new Float32Array(n * 3), size = new Float32Array(n), str = new Float32Array(n);
		stones.forEach((s, i) => {
			const lift = s.size * 0.5 + STONE_ROOM;
			pos[i * 3] = s.at.x + s.up.x * lift; pos[i * 3 + 1] = s.at.y + s.up.y * lift; pos[i * 3 + 2] = s.at.z + s.up.z * lift;
			size[i] = s.size; str[i] = s === strong ? 1 : 0;
		});
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
		g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
		g.setAttribute('aStrong', new THREE.BufferAttribute(str, 1));
		if (RENDERER === 'webgpu') {
			// (WebGPU draws points a pixel wide: each ring an instanced quad, render/rings-node.js)
			this.ringU ??= { px: uniform(1000), pr: uniform(1) };
			const rings = this.rings = ringSprite(g.attributes.position, g.attributes.aSize, g.attributes.aStrong, this.ringU);
			rings.frustumCulled = false; rings.renderOrder = 13; rings.userData.geo = g;
			rings.onBeforeRender = (renderer, scene, camera) => {
				this.ringU.px.value = renderer.getDrawingBufferSize(new THREE.Vector2()).y * camera.projectionMatrix.elements[5] / 2;
				this.ringU.pr.value = renderer.getPixelRatio();
			};
			this.parent.add(rings);
			return;
		}
		const rings = this.rings = new THREE.Points(g, this.ringMat);
		rings.frustumCulled = false; rings.renderOrder = 13;
		rings.onBeforeRender = (renderer, scene, camera) => {
			const pr = renderer.getPixelRatio(), U = this.ringMat.uniforms;
			U.uPx.value = renderer.getDrawingBufferSize(new THREE.Vector2()).y * camera.projectionMatrix.elements[5] / 2;
			U.uPr.value = pr;
			this.ringMat.uniformsNeedUpdate = true;
		};
		this.parent.add(rings);
	}
}
