"""Build a dependency-free, offline replay.html from the editable web sources."""
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parent

def build():
    examples = {key: json.loads((ROOT / 'data' / f'{name}.json').read_text(encoding='utf-8'))
                for key, name in [('cooperation', 'cooperation'), ('scarcity', 'scarcity'), ('memory', 'memory'), ('counterpart', 'counterpart')]}
    serialized = json.dumps(examples, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')
    (ROOT / 'data' / 'examples.mjs').write_text('export const EXAMPLES = ' + serialized + ';\n', encoding='utf-8')
    scripts = []
    for name in ['replay.mjs', 'insights.mjs', 'scene.mjs', 'studio.mjs', 'app.mjs']:
        source = (ROOT / name).read_text(encoding='utf-8')
        source = re.sub(r'^import .*?;\s*', '', source, flags=re.MULTILINE)
        source = re.sub(r'^export ', '', source, flags=re.MULTILINE)
        if name == 'app.mjs':
            source = 'const esc = escapeHTML;\nconst EXAMPLES = ' + serialized + ';\n' + source
        scripts.append(source)
    document = (ROOT / 'index.html').read_text(encoding='utf-8')
    document = document.replace('<link rel="stylesheet" href="styles.css">', '<style>\n' + (ROOT / 'styles.css').read_text(encoding='utf-8') + '\n</style>')
    document = document.replace('<link rel="stylesheet" href="studio.css">', '<style>\n' + (ROOT / 'studio.css').read_text(encoding='utf-8') + '\n</style>')
    document = document.replace('<script type="module" src="app.mjs"></script>', '<script>\n(() => {\n' + '\n'.join(scripts) + '\n})();\n</script>')
    (ROOT / 'replay.html').write_text(document, encoding='utf-8')
    print(f'Built {ROOT / "replay.html"} ({len(document.encode("utf-8")):,} bytes)')
    return document

if __name__ == '__main__':
    build()
