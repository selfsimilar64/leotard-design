// The fabric on the WebGPU renderer (render/webgpu.js): materials/fabric.js's shader, rewritten as three.js node code (TSL) on
// a MeshPhysicalNodeMaterial, layer by layer (knowledge/engineering/rendering/webgpu-port.md). Twin of fabric.js PARS_VERTEX,
// BEGIN_VERTEX, BEGIN_NORMAL, FABRIC_FRAGMENT, AO_FRAGMENT and the lighting chunks: a change to one is a change to both.
// The uniforms are fabric.js's own objects (createFabricMaterial's `u`, read here by reference), so applyFabric, bindScan and
// every caller that sets m.userData.u.uX.value work on either renderer unchanged.
// Ported so far: the garment surface (lift, offset, garment normal), the dress-form cut and a lining's clip, the dress-form
// tapes, ambient occlusion. Not yet: zones 0-2 (the legacy painted garment, not shown by the app), the procedural layers
// (knit, mesh, crinkle, glitter and foil, holo, film, ombre, duochrome), seams, folds, wrinkles, finished-edge stitching,
// scans, prints, decals, skin and the satin thread model.
import { MeshPhysicalNodeMaterial } from 'three/webgpu';
import { Fn, If, Discard, attribute, reference, positionLocal, normalLocal, normalize, mix, abs, min, max, fwidth, smoothstep, float, vec3, materialColor } from 'three/tsl';

export function createFabricNodeMaterial(zone, u) {
	const m = new MeshPhysicalNodeMaterial({ transparent: zone !== 3 });
	m.userData.u = u;
	const U = (name, type = 'float') => reference('value', type, u[name]);

	// the packed vertex inputs (materials/fabric-attributes.js)
	const aCoverZone = attribute('aCoverZone', 'vec4'), aKeepForm = attribute('aKeepForm', 'vec4');
	const aLift = attribute('aLift', 'vec3'), aGNormal = attribute('aGNormal', 'vec3'), aRef = attribute('aRef', 'vec3');
	const uOffset = U('uOffset'), uGarment = U('uGarment');

	// BEGIN_VERTEX, BEGIN_NORMAL: the garment surface is the skin pushed out by the lift (and the fabric's offset); its normal
	// the garment surface's
	const normal0 = normalLocal.toVar();
	m.positionNode = Fn(() => {
		normalLocal.assign(normalize(mix(normal0, aGNormal, uGarment)));
		return positionLocal.add(normal0.mul(uOffset)).add(aLift.mul(uGarment));
	})();

	const cover = aCoverZone.x, ao = aCoverZone.y, keep = aKeepForm.x, form = aKeepForm.yz, ref = aRef;
	m.colorNode = Fn(() => {
		If(U('uClip').greaterThan(0.5).and(keep.lessThan(0)), () => { Discard(); });
		const col = materialColor.rgb.toVar();
		// dress-form tapes: centre front and back, side seams, princess lines, waist, bust, hip
		if (zone === 3) {
			const tapeY = U('uTapeY', 'vec4');
			If(U('uTape').greaterThan(0.5), () => {
				const d = min(abs(ref.x), abs(form.x)).toVar();
				If(ref.y.greaterThan(tapeY.z).and(ref.y.lessThan(tapeY.w.sub(0.03))), () => { d.assign(min(d, abs(form.y))); });
				d.assign(min(d, min(abs(ref.y.sub(tapeY.x)), min(abs(ref.y.sub(tapeY.y)), abs(ref.y.sub(tapeY.z))))));
				const aa = max(fwidth(d), 1e-5), w = float(0.0028);
				col.assign(mix(col, U('uTapeColor', 'color'), float(1).sub(smoothstep(w.sub(aa), w.add(aa), d))));
			});
		}
		// a lining never shows past the shell's openings
		If(U('uClipShell').greaterThan(0.5).and(cover.lessThan(0)), () => { Discard(); });
		return col;
	})();

	// AO_FRAGMENT: fabric spans the crevice, so it is barely shaded (WebGL also darkens direct diffuse and specular a little:
	// three's node lighting applies aoNode to indirect light only; to match when the lighting model is ported)
	m.aoNode = mix(ao, float(1).sub(float(1).sub(ao).mul(0.3)), uGarment);
	m.customProgramCacheKey = () => 'leotard-fabric-node-' + zone;
	return m;
}
