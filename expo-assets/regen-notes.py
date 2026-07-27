#!/usr/bin/env python3
"""Regenerate the Script / Run of Show / Slide Notes panels of talk2.html from the
three markdown sources. Panels p3-p5 (live demo, handout, booth) are left untouched."""
import re, html, pathlib
D = pathlib.Path(__file__).parent
SRC = {"p0": "talk2-ai-script.md", "p1": "talk2-runofshow.md", "p2": "talk2-ai-slides.md"}

def inline(t):
    t = html.escape(t, quote=False)
    t = re.sub(r'`([^`]+)`', r'<code>\1</code>', t)
    t = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', t)
    t = re.sub(r'(?<!\*)\*([^*\n]+)\*(?!\*)', r'<em>\1</em>', t)
    return t

def md(text):
    out, lines, i = [], text.split("\n"), 0
    while i < len(lines):
        ln = lines[i]
        if not ln.strip():
            i += 1; continue
        if ln.startswith("|"):                                    # table
            rows = []
            while i < len(lines) and lines[i].startswith("|"):
                rows.append([c.strip() for c in lines[i].strip().strip("|").split("|")]); i += 1
            head, body = rows[0], [r for r in rows[1:] if not set("".join(r)) <= set("-: ")]
            out.append("<table><thead><tr>" + "".join(f"<th>{inline(c)}</th>" for c in head) + "</tr></thead><tbody>")
            for r in body:
                out.append("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>")
            out.append("</tbody></table>"); continue
        if ln.startswith("> "):                                   # blockquote (joined)
            buf = []
            while i < len(lines) and (lines[i].startswith(">") or lines[i].strip() == ""):
                if lines[i].strip() in (">", ""):
                    if lines[i].strip() == "": break
                    buf.append("")
                else:
                    buf.append(lines[i].lstrip("> ").rstrip())
                i += 1
            out.append("<blockquote>" + inline(" ".join(x for x in buf if x)) + "</blockquote>"); continue
        m = re.match(r'^(#{1,4}) (.*)', ln)
        if m:
            lvl = min(len(m.group(1)), 4)
            out.append(f"<h{lvl}>{inline(m.group(2))}</h{lvl}>"); i += 1; continue
        if re.match(r'^\s*[-*] ', ln):                            # list
            out.append("<ul>")
            while i < len(lines) and re.match(r'^\s*[-*] ', lines[i]):
                out.append("<li>" + inline(re.sub(r'^\s*[-*] ', '', lines[i])) + "</li>"); i += 1
            out.append("</ul>"); continue
        if ln.strip() == "---":
            out.append("<hr>"); i += 1; continue
        buf = []
        while i < len(lines) and lines[i].strip() and not lines[i].startswith(("|", ">", "#", "---")) \
              and not re.match(r'^\s*[-*] ', lines[i]):
            buf.append(lines[i].strip()); i += 1
        out.append("<p>" + inline(" ".join(buf)) + "</p>")
    return "\n".join(out)

page = (D / "talk2.html").read_text(encoding="utf-8")
for pid, fn in SRC.items():
    body = md((D / fn).read_text(encoding="utf-8"))
    pat = re.compile(r'(<section class="panel[^"]*" id="%s">)(.*?)(</section>)' % pid, re.S)
    assert pat.search(page), pid
    page = pat.sub(lambda m: m.group(1) + "\n" + body + "\n" + m.group(3), page, count=1)
page = page.replace("Deck = <strong>31 slides</strong>", "Deck = <strong>37 slides</strong>")
(D / "talk2.html").write_text(page, encoding="utf-8")
print("talk2.html panels p0/p1/p2 regenerated")
