import seat_proto as SP, bust_proto as B, numpy as np
from PIL import Image, ImageDraw, ImageFont
out = 'h1'
keys = ['child-6', 'child', 'teen', 'older-teen', 'petite', 'young', 'adult', 'broad']
names = {'child-6': 'Child, about 6', 'child': 'Child, about 9', 'teen': 'Young teen', 'older-teen': 'Older teen', 'petite': 'Petite athlete', 'young': 'Young adult', 'adult': 'Adult, about 30', 'broad': 'Adult, broader'}
views = ['back', 'low', 'back34']
for k in keys:
	P = B.cage(k)
	A, _ = SP.run(P)
	G, _ = SP.run_grid(P, front=1.5, front_soft=3.0, w_lo=3.5, top_soft=6.0, node_all=True)
	objs = {}
	for n, X in (('today', P), ('cloth', A), ('grid', G)):
		B.write_obj(X, '%s/%s-%s.obj' % (out, k, n)); objs['%s-%s' % (k, n)] = (X, '%s/%s-%s.obj' % (out, k, n))
	SP.render(objs, out, P, views=views, res=(400, 500), ortho=0.36 * (P[:, 1].max() - P[:, 1].min()) / 166)
# sheet: rows = bodies, columns = view x version
cols = [(v, n) for v in views for n in ('today', 'cloth', 'grid')]
lab = {'today': 'Today', 'cloth': 'Cloth across the cleft', 'grid': 'Fresh grid across the cleft'}
w, h = 400, 500; L, T = 170, 90
S = Image.new('RGB', (L + len(cols) * (w + 6), T + len(keys) * (h + 6)), (245, 245, 243))
d = ImageDraw.Draw(S); f = ImageFont.truetype('arialbd.ttf', 22); fs = ImageFont.truetype('arial.ttf', 18)
vn = {'back': 'From behind', 'low': 'From behind, low', 'back34': 'Three-quarter back'}
for i, (v, n) in enumerate(cols):
	x = L + i * (w + 6)
	if n == 'today': d.text((x, 10), vn[v], fill=(20, 20, 20), font=f)
	d.text((x + 4, 50), lab[n], fill=(40, 40, 40), font=fs)
for j, k in enumerate(keys):
	d.text((10, T + j * (h + 6) + h / 2), names[k], fill=(20, 20, 20), font=f, anchor='lm')
	for i, (v, n) in enumerate(cols):
		S.paste(Image.open('%s/%s-%s-%s.png' % (out, k, n, v)), (L + i * (w + 6), T + j * (h + 6)))
S.save(out + '/sheet.png')
small = S.resize((S.width // 2, S.height // 2)); small.save(out + '/sheet-small.png')
