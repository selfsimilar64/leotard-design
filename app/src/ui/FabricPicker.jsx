// Material picker for a garment piece, strap or band: one row of tiles with every material, the
// app's fabrics then the owner's scanned fabrics (VMOD scans, assets/textures/vmod), each a picture
// of the material on a twisted strip of cloth pre-rendered by src/dev/thumbnails.js (materials:
// public/thumbs/materials for the fabrics, assets/textures/vmod/thumbs/cloth for the scans, kept
// with the licensed scans); then the colour swatches.
import { useState, useEffect } from 'preact/hooks';
import { app } from '../instance.js';
import { FABRICS } from '../materials/fabric.js';
import { baseFabricFor } from '../materials/textures.js';
import { Strip, Line, Swatches } from './Gallery.jsx';
import { Colour } from './controls.jsx';
import { thumbName } from './Inspector.jsx';

const KEYS = Object.keys(FABRICS).filter((k) => k !== 'checker');

// Colours most leotards are made in.
export const PALETTE = ['#0c0c10', '#f4f4f2', '#c8ccd8', '#e6bf58', '#b3122e', '#6b0f22', '#ff4f8b', '#f6b6c8', '#5b2a86', '#b9a3e3',
	'#16205c', '#1b3fb5', '#8cc6ec', '#0b7d7a', '#0b7d55', '#f07a2a', '#d2a48a'];

// the scanned fabrics (filled once the texture manifest has loaded)
function useScans() {
	const [list, setList] = useState([]);
	useEffect(() => { app.engine?.textures?.list().then(setList, () => setList([])); }, []);
	return list;
}
const scanLabel = (f) => { const s = (f.look ?? f.name).split(/[,(]/)[0].trim(); return s.charAt(0).toUpperCase() + s.slice(1); };

// look: { fabric, colour, second, colour2, texture, texMode }; set(patch, gesture?) applies a
// change of the piece ({ fabric }, { texture, fabric }, { colour }, { texMode }).
export function MaterialPicker({ look, set }) {
	const scans = useScans(), scanned = !!look.texture;
	const recolour = !scanned || look.texMode === 'recolour';
	const scan = (k) => scans.find((f) => f.id === k);
	return (
		<>
			<Line label="Material">
				<Strip value={scanned ? look.texture : look.fabric} onPick={(k) => set(scan(k) ? { texture: k, fabric: baseFabricFor(scan(k)) } : { fabric: k, texture: null })}
					items={[
						...KEYS.map((k) => ({ key: k, label: FABRICS[k].label.replace(/ \(.*\)$/, ''), hint: FABRICS[k].label, img: `/thumbs/materials/${thumbName(k)}.jpg` })),
						...scans.map((f) => ({ key: f.id, label: scanLabel(f), hint: `${f.look} (scanned fabric)`, img: `/textures/vmod/thumbs/cloth/${f.id}.jpg` })),
					]} />
			</Line>
			<Line label="Colour">
				<Swatches value={recolour ? look.colour : null} colours={PALETTE}
					onPick={(c) => set(scanned ? { colour: c, texMode: 'recolour' } : { colour: c })}
					custom={<>
						<Colour value={look.colour ?? '#888888'} onChange={(v, g) => set(scanned ? { colour: v, texMode: 'recolour' } : { colour: v }, g)} />
						{scanned ? <button class={`chip ${!recolour ? 'on' : ''}`} title="The fabric's own colours, as scanned" onClick={() => set({ texMode: 'original' })}>As scanned</button> : null}
					</>} />
			</Line>
		</>
	);
}
