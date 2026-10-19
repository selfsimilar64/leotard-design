#!/usr/bin/env python3
"""Checker and index generator for this OKF v0.2 bundle (the parent directory of scripts/).

    python scripts/okf.py check    # conformance (SPEC §11) plus this bundle's own house rules
    python scripts/okf.py index    # regenerate every index.md from concept frontmatter

Zero dependencies (no PyYAML on the dev machine). Frontmatter is parsed by a small parser for
the YAML subset the bundle conventions allow (see /bundle-conventions.md, "Frontmatter subset"):
  key: scalar | "quoted" | 'quoted'
  key: [a, b, "c, d"]
  key: { by: x, at: y }
  key:                      (block list; items are scalars, flow maps, or indented block maps)
    - id: x
      resource: y
  key:                      (block map, one level)
    from: x
Anything else is reported as a parse error, which keeps every file readable by any consumer.
"""
import os, re, sys
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RESERVED = {'index.md', 'log.md'}
SKIP_DIRS = {'.git', 'scripts', 'node_modules'}
OKF_VERSION = '0.2'

# House rules: recommended keys every concept should carry (warnings, never errors: SPEC §11).
RECOMMENDED = ('title', 'description', 'generated')


class ParseError(Exception):
    pass


def split_flow(s):
    """Split 'a, b, {c: d}, "e, f"' on top-level commas."""
    out, depth, quote, cur = [], 0, None, ''
    for ch in s:
        if quote:
            cur += ch
            if ch == quote:
                quote = None
        elif ch in '"\'':
            quote = ch; cur += ch
        elif ch in '[{':
            depth += 1; cur += ch
        elif ch in ']}':
            depth -= 1; cur += ch
        elif ch == ',' and depth == 0:
            out.append(cur.strip()); cur = ''
        else:
            cur += ch
    if quote or depth:
        raise ParseError(f'unbalanced flow value: {s!r}')
    if cur.strip():
        out.append(cur.strip())
    return out


def scalar(s):
    s = s.strip()
    if not s:
        return None
    if s[0] in '"\'':
        if len(s) < 2 or s[-1] != s[0]:
            raise ParseError(f'unterminated quote: {s!r}')
        return s[1:-1]
    if s.startswith('['):
        if not s.endswith(']'):
            raise ParseError(f'unterminated list: {s!r}')
        return [scalar(x) for x in split_flow(s[1:-1])]
    if s.startswith('{'):
        if not s.endswith('}'):
            raise ParseError(f'unterminated map: {s!r}')
        m = {}
        for item in split_flow(s[1:-1]):
            k, sep, v = item.partition(':')
            if not sep:
                raise ParseError(f'bad flow map entry: {item!r}')
            m[k.strip()] = scalar(v)
        return m
    if ': ' in s and not s.startswith('http'):
        raise ParseError(f'unquoted ": " inside a scalar (quote it): {s!r}')
    if s in ('true', 'false'):
        return s == 'true'
    if re.fullmatch(r'-?\d+', s):
        return int(s)
    return s


KEY = re.compile(r'^([A-Za-z_][\w-]*):(?:\s+(.*))?$')


def parse_frontmatter(text):
    lines = [l for l in text.split('\n') if l.strip() and not l.lstrip().startswith('#')]
    data, i = {}, 0
    while i < len(lines):
        line = lines[i]
        if line[0] == ' ':
            raise ParseError(f'unexpected indentation: {line!r}')
        m = KEY.match(line.rstrip())
        if not m:
            raise ParseError(f'not a "key: value" line: {line!r}')
        key, rest = m.group(1), m.group(2)
        i += 1
        if rest is not None and rest.strip():
            data[key] = scalar(rest)
            continue
        block = []
        while i < len(lines) and lines[i].startswith(' '):
            block.append(lines[i]); i += 1
        if not block:
            data[key] = None
        elif block[0].lstrip().startswith('- '):
            data[key] = parse_block_list(block)
        else:
            data[key] = parse_block_map(block)
    return data


def parse_block_list(block):
    ind = len(block[0]) - len(block[0].lstrip())
    items, cur = [], None
    for l in block:
        li = len(l) - len(l.lstrip())
        body = l.strip()
        if li == ind and body.startswith('- '):
            item = body[2:].strip()
            m = KEY.match(item)
            if m and not item.startswith('{'):
                cur = {m.group(1): scalar(m.group(2) or '')}
                items.append(cur)
            else:
                cur = None
                items.append(scalar(item))
        elif li > ind and isinstance(cur, dict):
            m = KEY.match(body)
            if not m:
                raise ParseError(f'bad list-item field: {l!r}')
            cur[m.group(1)] = scalar(m.group(2) or '')
        else:
            raise ParseError(f'bad block list line: {l!r}')
    return items


def parse_block_map(block):
    ind = len(block[0]) - len(block[0].lstrip())
    m_out = {}
    for l in block:
        if len(l) - len(l.lstrip()) != ind:
            raise ParseError(f'nested block maps deeper than one level are not allowed: {l!r}')
        m = KEY.match(l.strip())
        if not m:
            raise ParseError(f'bad block map line: {l!r}')
        m_out[m.group(1)] = scalar(m.group(2) or '')
    return m_out


def read(path):
    with open(path, encoding='utf-8') as f:
        text = f.read()
    if not text.startswith('---\n'):
        return None, text
    end = text.find('\n---\n', 4)
    if end < 0:
        raise ParseError('frontmatter not closed with ---')
    return parse_frontmatter(text[4:end]), text[end + 5:]


def walk():
    for d, dirs, files in os.walk(ROOT):
        dirs[:] = sorted(x for x in dirs if x not in SKIP_DIRS and not x.startswith('.'))
        yield d, dirs, sorted(f for f in files if f.endswith('.md'))


def rel(p):
    return os.path.relpath(p, ROOT).replace(os.sep, '/')


LINK = re.compile(r'\[[^\]]*\]\(([^)\s]+)\)')
ISO = re.compile(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})$')


def check():
    errors, warnings, n = [], [], 0
    now = datetime.now(timezone.utc)
    for d, _, files in walk():
        for f in files:
            p = os.path.join(d, f)
            r = rel(p)
            try:
                fm, body = read(p)
            except ParseError as e:
                errors.append(f'{r}: {e}'); continue
            if f == 'index.md':
                if fm is not None and (d != ROOT or set(fm) - {'okf_version'}):
                    errors.append(f'{r}: index.md may only carry okf_version, and only at the bundle root')
                continue
            if f == 'log.md':
                for h in re.findall(r'^## (.+)$', body if fm is None else body, re.M):
                    if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', h.strip()):
                        errors.append(f'{r}: log heading {h!r} is not YYYY-MM-DD')
                continue
            n += 1
            if fm is None:
                errors.append(f'{r}: no frontmatter'); continue
            if not fm.get('type'):
                errors.append(f'{r}: missing required "type"')
            for k in RECOMMENDED:
                if k not in fm:
                    warnings.append(f'{r}: missing recommended "{k}"')
            g = fm.get('generated')
            if g is not None and (not isinstance(g, dict) or 'by' not in g):
                errors.append(f'{r}: generated must be a map with "by"')
            ts = []
            if isinstance(g, dict) and g.get('at'):
                ts.append(g['at'])
            v = fm.get('verified')
            for e in ([v] if isinstance(v, dict) else v or []):
                if not isinstance(e, dict) or 'by' not in e:
                    errors.append(f'{r}: verified entries need "by"')
                elif e.get('at'):
                    ts.append(e['at'])
            if fm.get('stale_after'):
                ts.append(fm['stale_after'])
                if ISO.match(str(fm['stale_after'])) and datetime.fromisoformat(str(fm['stale_after']).replace('Z', '+00:00')) <= now:
                    warnings.append(f'{r}: stale (stale_after {fm["stale_after"]})')
            for t in ts:
                if not ISO.match(str(t)):
                    errors.append(f'{r}: timestamp {t!r} is not ISO 8601 with a UTC offset')
            if fm.get('status') not in (None, 'draft', 'stable', 'deprecated'):
                errors.append(f'{r}: status must be draft | stable | deprecated')
            ids = set()
            for s in fm.get('sources') or []:
                if not isinstance(s, dict) or not s.get('resource'):
                    errors.append(f'{r}: every sources entry needs "resource"')
                elif s.get('id'):
                    ids.add(s['id'])
            body = re.sub(r'```.*?```', '', body, flags=re.S)  # examples in code are not links
            body = re.sub(r'`[^`\n]*`', '', body)
            for fn in set(re.findall(r'\[\^([^\]]+)\]', body)):
                if fn not in ids:
                    warnings.append(f'{r}: footnote [^{fn}] has no matching sources id')
            for target in LINK.findall(body):
                if re.match(r'^[a-z]+:', target) or target.startswith('#'):
                    continue
                t = target.split('#')[0]
                tp = os.path.join(ROOT, t.lstrip('/')) if t.startswith('/') else os.path.join(d, t)
                if not os.path.exists(os.path.normpath(tp)):
                    warnings.append(f'{r}: broken link {target}')
    for w in warnings:
        print('warn ', w)
    for e in errors:
        print('ERROR', e)
    print(f'{n} concepts, {len(errors)} errors, {len(warnings)} warnings')
    return 1 if errors else 0


def title_of(fm, f):
    return (fm or {}).get('title') or f[:-3].replace('-', ' ').capitalize()


def index():
    written = 0
    for d, dirs, files in walk():
        groups = {}
        for f in files:
            if f in RESERVED:
                continue
            try:
                fm, _ = read(os.path.join(d, f))
            except ParseError:
                fm = None
            fm = fm or {}
            t = fm.get('type') or 'Untyped'
            status = fm.get('status')
            suffix = f' ({status})' if status in ('draft', 'deprecated') else ''
            desc = fm.get('description') or ''
            groups.setdefault(t, []).append(f'* [{title_of(fm, f)}]({f}){suffix} - {desc}'.rstrip(' -'))
        subs = []
        for s in dirs:
            blurb = ''
            about = os.path.join(d, s, 'about.md')
            if os.path.exists(about):
                try:
                    blurb = (read(about)[0] or {}).get('description') or ''
                except ParseError:
                    pass
            subs.append(f'* [{s}/]({s}/) - {blurb}'.rstrip(' -'))
        out = []
        if d == ROOT:
            out += ['---', f'okf_version: "{OKF_VERSION}"', '---', '']
        out.append(f'# {"Leotard design knowledge bundle" if d == ROOT else rel(d)}')
        out += ['', '<!-- Generated by scripts/okf.py index. Do not edit by hand. -->', '']
        if subs:
            out += ['# Sections', ''] + subs + ['']
        for t in sorted(groups):
            out += [f'# {t}', ''] + groups[t] + ['']
        with open(os.path.join(d, 'index.md'), 'w', encoding='utf-8', newline='\n') as fh:
            fh.write('\n'.join(out).rstrip() + '\n')
        written += 1
    print(f'wrote {written} index.md files')


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'check'
    sys.exit(check() if cmd == 'check' else index() or 0)
