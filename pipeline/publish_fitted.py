"""Copy owned fitted garments from the fit's output into the app (app/public/fitted/), where garment/fitted.js lists them.

Only blocks the project owns: the Armstrong drafts (pipeline/draft_armstrong.py), Aldrich's bodyshaper (pipeline/draft_aldrich.py) and
Cole's one-piece (pipeline/draft_cole.py). Fits of the bought block or of blocks using its lines stay in app/captures (git-ignored);
its licence bars redistributing it.
    python pipeline/draft_armstrong.py 6 young
    python pipeline/wrap_block.py --drafted armstrong-6 young
    python pipeline/draft_aldrich.py 6 young
    python pipeline/wrap_block.py --drafted aldrich-6 young
    python pipeline/draft_cole.py young
    python pipeline/wrap_block.py --drafted cole-young young
    python pipeline/publish_fitted.py
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
CAPTURES = os.path.join(HERE, '..', 'app', 'captures')
OUT = os.path.join(HERE, '..', 'app', 'public', 'fitted')
OWNED = ['armstrong-6-block', 'armstrong-6-high-resolved', 'aldrich-6-block', 'cole-young-block']  # twin: FITTED in app/src/garment/fitted.js


def main():
	os.makedirs(OUT, exist_ok=True)
	for name in OWNED:
		with open(os.path.join(CAPTURES, f'wrap-{name}.json'), encoding='utf-8') as f:
			data = json.load(f)
		if not data.get('openings'):
			raise SystemExit(f'{name}: no openings; refit with the current pipeline/wrap_block.py')
		path = os.path.join(OUT, name + '.json')
		with open(path, 'w', encoding='utf-8', newline='\n') as f:
			json.dump(data, f, separators=(',', ':'))
		print(f'{path}: {os.path.getsize(path) / 1e6:.1f} MB, {len(data["cells"])} pieces, {sum(len(c["hostW"]) // 3 for c in data["cells"])} points')


if __name__ == '__main__':
	main()
