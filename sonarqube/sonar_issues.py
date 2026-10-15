#!/usr/bin/env python3
"""
sonar_issues.py
ดึงรายการ issue (bug / vulnerability / code smell) จาก SonarQube แล้วแสดงเป็นภาษาไทยที่อ่านง่าย
พร้อมอธิบายว่าแต่ละกฎหมายถึงอะไรและควรแก้ยังไง

การใช้งาน (รันจาก root โปรเจกต์ — token อ่านจากตัวแปร SONAR_TOKEN หรือไฟล์ .env.sonar):
    python sonarqube/sonar_issues.py --project catering-booking-platform
    python sonarqube/sonar_issues.py --project catering-booking-platform --type BUG
    python sonarqube/sonar_issues.py --project catering-booking-platform --severity CRITICAL,MAJOR
    python sonarqube/sonar_issues.py --project catering-booking-platform --format md --output issues.md
    python sonarqube/sonar_issues.py --project catering-booking-platform --format html --output issues.html
    python sonarqube/sonar_issues.py --project catering-booking-platform --format pdf --output issues.pdf

(--format pdf ใช้เบราว์เซอร์ Edge/Chrome ในเครื่องแปลง HTML เป็น PDF แบบ headless — ไม่ต้องติดตั้งไลบรารีเพิ่ม)

ต้องติดตั้ง: pip install requests

หมายเหตุเรื่องคำแปล: ข้อความ (message) ที่ SonarQube ส่งมาเป็นภาษาอังกฤษ สคริปต์ไม่ได้แปลอัตโนมัติ
แต่มีตารางคำอธิบายภาษาไทยของ "กฎ" (rule) ที่พบบ่อยด้านล่าง (RULES_TH) กฎที่ยังไม่อยู่ในตารางจะแสดงชื่อกฎ
ภาษาอังกฤษจาก SonarQube แทน — เพิ่มกฎใหม่ได้โดยเติมใน RULES_TH
"""

import argparse
import html as htmllib
import os
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime
from collections import Counter, defaultdict

import requests

SEVERITY_TH = {
    "BLOCKER": "ร้ายแรงที่สุด",
    "CRITICAL": "ร้ายแรง",
    "MAJOR": "สำคัญ",
    "MINOR": "เล็กน้อย",
    "INFO": "ข้อมูล",
}
SEVERITY_ORDER = ["BLOCKER", "CRITICAL", "MAJOR", "MINOR", "INFO"]

TYPE_TH = {
    "BUG": "บั๊ก (ทำงานผิดพลาดได้)",
    "VULNERABILITY": "ช่องโหว่ความปลอดภัย",
    "CODE_SMELL": "โค้ดไม่สะอาด (ดูแลยาก)",
    "SECURITY_HOTSPOT": "จุดที่ควรตรวจด้านความปลอดภัย",
}

# คำอธิบายภาษาไทยของกฎที่พบบ่อย: rule key -> (ชื่อกฎ, ความหมาย, วิธีแก้)
RULES_TH = {
    "typescript:S1082": (
        "องค์ประกอบที่กดได้ต้องใช้คีย์บอร์ดได้ด้วย",
        "องค์ประกอบที่ไม่ใช่ปุ่ม (เช่น div, img) มี onClick แต่ไม่มีตัวรับคีย์บอร์ด คนที่ใช้คีย์บอร์ดหรือโปรแกรมอ่านหน้าจอจะกดไม่ได้",
        "เปลี่ยนเป็นแท็ก <button> หรือใส่ role=\"button\", tabIndex={0} และ onKeyDown ที่รับ Enter/Space",
    ),
    "typescript:S6479": (
        "ห้ามใช้ index ของอาร์เรย์เป็น key ใน React",
        "key={i} ทำให้ React จำรายการผิดตัวเมื่อลำดับเปลี่ยน/แทรก/ลบ อาจเกิดสถานะหรือ input ค้างผิดแถว",
        "ใช้ค่าที่คงที่และไม่ซ้ำของข้อมูลเป็น key เช่น id หรือชื่อ ถ้าเป็นรายการคงที่ที่ไม่เปลี่ยนลำดับ ปล่อยไว้ได้",
    ),
    "typescript:S6848": (
        "องค์ประกอบที่ไม่ใช่ตัวโต้ตอบไม่ควรมี event",
        "แท็กอย่าง div/span ถูกใส่ onClick ทำให้ผู้ใช้คีย์บอร์ดและโปรแกรมอ่านหน้าจอเข้าถึงไม่ได้",
        "ใช้ <button>/<a> แทน หรือใส่ role, tabIndex และตัวรับคีย์บอร์ดให้ครบ",
    ),
    "typescript:S6847": (
        "องค์ประกอบที่ไม่ใช่ตัวโต้ตอบไม่ควรมี event (a11y)",
        "องค์ประกอบที่ไม่ได้ออกแบบมาให้โต้ตอบถูกผูก event เมาส์/คีย์บอร์ด",
        "เปลี่ยนเป็นแท็กที่โต้ตอบได้ หรือกำหนด role ให้เหมาะสม",
    ),
    "typescript:S6819": (
        "ใช้แท็ก HTML ตรงความหมายแทน role ของ ARIA",
        "เช่น <div role=\"dialog\"> ควรใช้ <dialog>, <div role=\"button\"> ควรใช้ <button> เพราะเบราว์เซอร์รองรับการเข้าถึงให้ในตัว",
        "เปลี่ยนเป็นแท็ก HTML มาตรฐานที่ตรงกับ role นั้น",
    ),
    "typescript:S5906": (
        "ใช้ matcher ของ Jest ที่เจาะจงกว่า",
        "เช่น expect(a === b).toBe(true) อ่านยากและข้อความ error ไม่ชัด",
        "ใช้ expect(a).toBe(b), toBeNull(), toHaveLength() ฯลฯ ที่ตรงกับสิ่งที่ตรวจ",
    ),
    "typescript:S6353": (
        "ใช้ regex แบบสั้นให้กระชับ",
        "เช่น [0-9] เขียนสั้นกว่าได้เป็น \\d และ [^0-9] เป็น \\D",
        "แทนด้วย character class ย่อ (\\d, \\w, \\s)",
    ),
    "typescript:S3776": (
        "ฟังก์ชันซับซ้อนเกินไป (Cognitive Complexity สูง)",
        "ฟังก์ชันมี if/for/ternary ซ้อนกันมาก อ่านและทดสอบยาก เสี่ยงมีบั๊กตอนแก้ไข",
        "แยกเป็นฟังก์ชันย่อย ใช้ early return ลดการซ้อน",
    ),
    "typescript:S4624": (
        "ห้ามซ้อน template literal",
        "สตริง `...${ `...` }...` ที่ซ้อนกันอ่านยาก",
        "แยกค่าส่วนในออกเป็นตัวแปรก่อน แล้วนำมาต่อสตริง",
    ),
    "typescript:S6582": (
        "ใช้ optional chaining (?.) แทนการเช็กหลายชั้น",
        "เช่น a && a.b && a.b.c เขียนสั้นกว่าได้เป็น a?.b?.c",
        "แทนที่ด้วย ?.",
    ),
    "typescript:S6557": (
        "ใช้ startsWith/endsWith แทนการตัดสตริงมาเทียบ",
        "การใช้ slice/substring/indexOf เพื่อเช็กต้น/ท้ายสตริงอ่านยากและผิดง่าย",
        "ใช้ str.startsWith(x) หรือ str.endsWith(x)",
    ),
    "typescript:S3358": (
        "ห้ามซ้อน ternary (a ? b : c ? d : e)",
        "เงื่อนไขสามทางที่ซ้อนกันอ่านยาก",
        "แยกเป็น if/else หรือฟังก์ชันที่คืนค่าตามเงื่อนไข",
    ),
    "typescript:S1874": (
        "ใช้ API ที่ถูกประกาศเลิกใช้ (deprecated)",
        "ฟังก์ชัน/ชนิดข้อมูลนี้ถูกทิ้งแล้ว อาจถูกลบในเวอร์ชันถัดไป",
        "ดูเอกสารของไลบรารีแล้วเปลี่ยนไปใช้ตัวแทนที่แนะนำ",
    ),
    "typescript:S7781": (
        "ใช้ replaceAll แทน replace แบบ regex ที่มี g",
        "str.replace(/x/g, y) เจตนาคือแทนที่ทุกตัว ควรเขียนให้ชัดด้วย replaceAll",
        "เปลี่ยนเป็น str.replaceAll('x', y)",
    ),
    "typescript:S2301": (
        "พารามิเตอร์ boolean ที่เลือกพฤติกรรมของเมธอด",
        "เมธอดที่รับ true/false แล้วทำงานคนละแบบ อ่านตรงจุดเรียกไม่รู้ความหมาย",
        "แยกเป็นสองเมธอดที่ชื่อบอกความหมาย",
    ),
    "typescript:S8786": (
        "regex อาจช้ามากจนระบบค้าง (ReDoS)",
        "ข้อความที่ผู้ใช้ส่งมาบางแบบทำให้ regex นี้ย้อนกลับ (backtracking) ซ้ำจำนวนมาก กินเวลา CPU เพิ่มทวีคูณตามความยาว คนร้ายส่งสตริงยาวๆ ทำให้เซิร์ฟเวอร์ช้าหรือค้างได้",
        "ลดความกำกวมของ regex (เลี่ยงตัวทวนซ้ำซ้อน เช่น (a+)+ หรือ .* สองตัวติดกัน) และจำกัดความยาวสตริงก่อนตรวจ",
    ),
    "typescript:S7765": (
        "ใช้ includes() แทน some()/indexOf() เมื่อเช็กว่ามีค่าอยู่หรือไม่",
        "arr.some(x => x === v) หรือ indexOf(v) !== -1 เขียนยาวกว่า arr.includes(v) ที่ตรงความหมาย",
        "เปลี่ยนเป็น arr.includes(v)",
    ),
    "typescript:S4323": (
        "union type ซ้ำหลายที่ ควรตั้งชื่อ (type alias)",
        "ชนิดเดียวกันถูกเขียนซ้ำหลายจุด แก้จุดหนึ่งแล้วลืมอีกจุด",
        "ประกาศ type Xxx = 'a' | 'b' แล้วใช้ชื่อนั้นแทน",
    ),
}


def load_token():
    """อ่าน token จากตัวแปรแวดล้อมก่อน แล้วลองไฟล์ .env.sonar ที่ root โปรเจกต์"""
    token = os.environ.get("SONAR_TOKEN")
    if token:
        return token
    for path in (".env.sonar", os.path.join(os.path.dirname(__file__), "..", ".env.sonar")):
        if os.path.exists(path):
            with open(path, encoding="utf-8") as f:
                for line in f:
                    if line.startswith("SONAR_TOKEN="):
                        return line.split("=", 1)[1].strip()
    return None


def fetch_issues(host, token, project, types, severities):
    """ดึง issue ที่ยังไม่ถูกแก้ทั้งหมด (วนทีละหน้า 500 รายการ)"""
    issues, page = [], 1
    while True:
        params = {"componentKeys": project, "resolved": "false", "ps": 500, "p": page}
        if types:
            params["types"] = types
        if severities:
            params["severities"] = severities
        resp = requests.get(f"{host}/api/issues/search", params=params, auth=(token, ""), timeout=30)
        resp.raise_for_status()
        data = resp.json()
        issues.extend(data["issues"])
        if page * 500 >= data["total"]:
            return issues
        page += 1


def rule_en_name(host, token, rule_key, cache={}):
    """ชื่อกฎภาษาอังกฤษจาก SonarQube — ใช้เมื่อกฎนั้นยังไม่มีคำแปลไทยใน RULES_TH"""
    if rule_key not in cache:
        try:
            r = requests.get(f"{host}/api/rules/show", params={"key": rule_key}, auth=(token, ""), timeout=30)
            cache[rule_key] = r.json()["rule"]["name"] if r.ok else rule_key
        except requests.RequestException:
            cache[rule_key] = rule_key
    return cache[rule_key]


def short_path(component):
    """ตัดชื่อโปรเจกต์นำหน้าออก เหลือ path ของไฟล์"""
    return component.split(":", 1)[-1]


def describe(host, token, issue):
    """คืน (ชื่อกฎ, ความหมาย, วิธีแก้) — ภาษาไทยถ้ามีในตาราง ไม่งั้นใช้ชื่ออังกฤษจาก SonarQube"""
    rule = issue["rule"]
    if rule in RULES_TH:
        return RULES_TH[rule]
    return (
        rule_en_name(host, token, rule),
        "(ยังไม่มีคำอธิบายภาษาไทยของกฎนี้ — ดูรายละเอียดที่ SonarQube หน้า Rules)",
        f"{host}/coding_rules?open={rule}",
    )


def sort_key(issue):
    sev = SEVERITY_ORDER.index(issue["severity"]) if issue["severity"] in SEVERITY_ORDER else 99
    return (sev, short_path(issue["component"]), issue.get("line") or 0)


def render(host, token, issues, project, fmt):
    md = fmt == "md"
    out = []

    def h(t, n=1):
        if md:
            return f"{'#' * n} {t}"
        if n >= 3:
            return t
        return t + chr(10) + ("=" if n == 1 else "-") * min(len(t), 60)

    out.append(h(f"รายงาน Issue จาก SonarQube — {project}"))
    out.append(f"พบทั้งหมด {len(issues)} รายการที่ยังไม่ได้แก้")
    if not issues:
        return "\n".join(out)

    out.append("")
    out.append(h("สรุป", 2))
    by_type = Counter(i["type"] for i in issues)
    by_sev = Counter(i["severity"] for i in issues)
    for t, n in by_type.most_common():
        out.append(f"- {TYPE_TH.get(t, t)}: {n}")
    out.append("")
    for s in SEVERITY_ORDER:
        if by_sev.get(s):
            out.append(f"- ระดับ{SEVERITY_TH[s]} ({s}): {by_sev[s]}")

    # จัดกลุ่มตามกฎ — กฎเดียวกันอธิบายครั้งเดียวแล้วลิสต์ทุกตำแหน่ง
    groups = defaultdict(list)
    for i in sorted(issues, key=sort_key):
        groups[i["rule"]].append(i)
    ordered = sorted(groups.values(), key=lambda g: (sort_key(g[0])[0], -len(g)))

    out.append("")
    out.append(h("รายละเอียดแยกตามกฎ", 2))
    for group in ordered:
        first = group[0]
        name, meaning, fix = describe(host, token, first)
        out.append("")
        out.append(h(f"[{SEVERITY_TH.get(first['severity'], first['severity'])}] {name}  ({len(group)} จุด)", 3))
        out.append(f"- ประเภท: {TYPE_TH.get(first['type'], first['type'])}")
        out.append(f"- กฎ: {first['rule']}")
        out.append(f"- ความหมาย: {meaning}")
        out.append(f"- วิธีแก้: {fix}")
        out.append("- ตำแหน่ง:")
        for i in group:
            line = f":{i['line']}" if i.get("line") else ""
            msg = i["message"].replace("\n", " ")
            out.append(f"    * {short_path(i['component'])}{line}  — {msg}")
    return "\n".join(out)


SEV_COLOR = {"BLOCKER": "#7f1d1d", "CRITICAL": "#c62828", "MAJOR": "#ef6c00", "MINOR": "#1565c0", "INFO": "#607d8b"}

HTML_CSS = """
body{font-family:'Tahoma','Noto Sans Thai','Leelawadee UI',sans-serif;color:#1f2937;margin:0;padding:24px;line-height:1.55;font-size:14px}
h1{font-size:22px;margin:0 0 4px}
.meta{color:#6b7280;font-size:12px;margin-bottom:16px}
.cards{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 20px}
.card{border:1px solid #e5e7eb;border-radius:8px;padding:8px 14px;min-width:110px}
.card b{display:block;font-size:20px}
h2{font-size:17px;border-bottom:2px solid #3b3e99;padding-bottom:4px;margin-top:26px}
.rule{border:1px solid #e5e7eb;border-radius:10px;margin:14px 0;padding:12px 16px;page-break-inside:avoid}
.rule h3{margin:0 0 6px;font-size:15px}
.badge{display:inline-block;color:#fff;border-radius:999px;padding:1px 10px;font-size:11px;margin-right:6px}
.kv{margin:2px 0}.kv span{color:#6b7280}
ul.loc{margin:6px 0 0;padding-left:18px;font-size:12px}
ul.loc code{background:#f3f4f6;padding:1px 4px;border-radius:4px;word-break:break-all}
ul.loc em{color:#6b7280;font-style:normal}
@page{size:A4;margin:14mm}
"""


def render_html(host, token, issues, project):
    esc = htmllib.escape
    parts = [f"<!doctype html><html lang='th'><head><meta charset='utf-8'><title>รายงาน Issue — {esc(project)}</title><style>{HTML_CSS}</style></head><body>"]
    parts.append(f"<h1>รายงาน Issue จาก SonarQube</h1><div class='meta'>โปรเจกต์ {esc(project)} · สร้างเมื่อ {datetime.now():%Y-%m-%d %H:%M} · พบทั้งหมด {len(issues)} รายการที่ยังไม่ได้แก้</div>")
    by_type = Counter(i["type"] for i in issues)
    by_sev = Counter(i["severity"] for i in issues)
    parts.append("<div class='cards'>")
    for t, n in by_type.most_common():
        parts.append(f"<div class='card'><b>{n}</b>{esc(TYPE_TH.get(t, t))}</div>")
    for sv in SEVERITY_ORDER:
        if by_sev.get(sv):
            parts.append(f"<div class='card' style='border-color:{SEV_COLOR[sv]}'><b style='color:{SEV_COLOR[sv]}'>{by_sev[sv]}</b>ระดับ{SEVERITY_TH[sv]}</div>")
    parts.append("</div><h2>รายละเอียดแยกตามกฎ</h2>")
    groups = defaultdict(list)
    for i in sorted(issues, key=sort_key):
        groups[i["rule"]].append(i)
    for group in sorted(groups.values(), key=lambda g: (sort_key(g[0])[0], -len(g))):
        first = group[0]
        name, meaning, fix = describe(host, token, first)
        sv = first["severity"]
        fix_html = f"<a href='{esc(fix)}'>{esc(fix)}</a>" if fix.startswith("http") else esc(fix)
        parts.append(f"<div class='rule'><h3><span class='badge' style='background:{SEV_COLOR.get(sv, '#607d8b')}'>{esc(SEVERITY_TH.get(sv, sv))}</span>{esc(name)} <small>({len(group)} จุด)</small></h3>")
        parts.append(f"<div class='kv'><span>ประเภท:</span> {esc(TYPE_TH.get(first['type'], first['type']))} · <span>กฎ:</span> {esc(first['rule'])}</div>")
        parts.append(f"<div class='kv'><span>ความหมาย:</span> {esc(meaning)}</div><div class='kv'><span>วิธีแก้:</span> {fix_html}</div><ul class='loc'>")
        for i in group:
            line = f":{i['line']}" if i.get("line") else ""
            parts.append(f"<li><code>{esc(short_path(i['component']))}{line}</code><br><em>{esc(i['message'])}</em></li>")
        parts.append("</ul></div>")
    parts.append("</body></html>")
    return "".join(parts)


def find_browser():
    """หา Edge/Chrome ในเครื่องไว้ใช้แปลง HTML เป็น PDF"""
    for exe in ("msedge", "chrome", "google-chrome", "chromium", "chromium-browser"):
        found = shutil.which(exe)
        if found:
            return found
    for path in (
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    ):
        if os.path.exists(path):
            return path
    return None


def html_to_pdf(html_text, pdf_path):
    browser = find_browser()
    if not browser:
        raise RuntimeError("ไม่พบ Edge/Chrome ในเครื่อง — ใช้ --format html แล้วสั่ง Print > Save as PDF เอง")
    with tempfile.TemporaryDirectory() as tmp:
        src = os.path.join(tmp, "report.html")
        with open(src, "w", encoding="utf-8") as f:
            f.write(html_text)
        subprocess.run(
            [browser, "--headless", "--disable-gpu", "--no-pdf-header-footer", f"--user-data-dir={os.path.join(tmp, 'profile')}",
             f"--print-to-pdf={os.path.abspath(pdf_path)}", "file:///" + src.replace(os.sep, "/")],
            check=True, capture_output=True, timeout=120,
        )


def main():
    parser = argparse.ArgumentParser(description="แสดง issue จาก SonarQube เป็นภาษาไทย")
    parser.add_argument("--host", default="http://localhost:9000", help="URL ของ SonarQube (default http://localhost:9000)")
    parser.add_argument("--project", required=True, help="Project Key เช่น catering-booking-platform")
    parser.add_argument("--token", default=None, help="Token (ไม่ใส่จะอ่านจาก SONAR_TOKEN หรือ .env.sonar)")
    parser.add_argument("--type", default=None, help="กรองประเภท คั่นด้วยจุลภาค เช่น BUG,VULNERABILITY,CODE_SMELL")
    parser.add_argument("--severity", default=None, help="กรองระดับ เช่น BLOCKER,CRITICAL,MAJOR")
    parser.add_argument("--format", choices=["text", "md", "html", "pdf"], default="text", help="รูปแบบผลลัพธ์ (default text)")
    parser.add_argument("--output", default=None, help="บันทึกลงไฟล์ (ไม่ใส่จะพิมพ์ออกหน้าจอ)")
    args = parser.parse_args()

    token = args.token or load_token()
    if not token:
        print("ไม่พบ token — ตั้ง SONAR_TOKEN, ใส่ --token หรือสร้างไฟล์ .env.sonar", file=sys.stderr)
        sys.exit(1)
    host = args.host.rstrip("/")

    try:
        issues = fetch_issues(host, token, args.project, args.type, args.severity)
        if args.format in ("html", "pdf"):
            text = render_html(host, token, issues, args.project)
        else:
            text = render(host, token, issues, args.project, args.format)
        if args.format == "pdf":
            html_to_pdf(text, args.output or f"{args.project}_issues.pdf")
            print(f"บันทึกแล้วที่ {args.output or f'{args.project}_issues.pdf'} ({len(issues)} รายการ)")
            return
    except requests.exceptions.HTTPError as e:
        print(f"เรียก API ไม่สำเร็จ: {e} — ตรวจ token และ Project Key", file=sys.stderr)
        sys.exit(1)
    except requests.exceptions.ConnectionError:
        print(f"เชื่อมต่อ {host} ไม่ได้ — ตรวจว่า SonarQube รันอยู่", file=sys.stderr)
        sys.exit(1)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(text + "\n")
        print(f"บันทึกแล้วที่ {args.output} ({len(issues)} รายการ)")
    else:
        sys.stdout.reconfigure(encoding="utf-8")
        print(text)


if __name__ == "__main__":
    main()
