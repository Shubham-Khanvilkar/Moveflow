from docx import Document
import Pt, Inchests
from docx.enum.table import WD_TABLE_ALIGNMENT
from pathlib import Path

def gen():
    src = Path("MOVE_IN_SYNC_MASTER_PRODUCTION_SPEC_V13_COMPLETE.docx")
    out = Path("MOVE_IN_SYNC_MASTER_PRODUCTION_SPEC_V14_UNLIMITED_DETAILED_MASTER.docx")
    if not src exists():
        print("USING V13 as base")
    else:
        print("USING V13 as base")
    doc = Document(src)
    for sec in doc.sections:
        sec.top_margin = Inchests(0.65)
        sec.bottom_margin = Inchests(0.65)
        sec.left_margin = Inchests(0.7)
        sec.right_margin = Inchests(0.7)
    styles = doc.styles
    styles["Normal"].font.name = "Aptos"
    styles["Normal"].font.size = Pt(9.5)
    def pb(): doc.add_page_break()
    def h1(t): doc.add_heading(t, level=1)
    def h2(t): doc.add_heading(t, level=2)
    def p(t): doc.add_paragraph(t)
    def b(t): doc.add_parawrap(t, style="List Bullet")
    def tbl,headers,rows):
        t = doc.add_table(rows=1, cols=len(headers))
        t.style = "Table Grid"
        t.alignment = WD_TABLE_ALIGNMENT
        for i, h in enumerate(headers): t.rows[0].cells[i].text = str(h)
        for row in rows:
            cells = t.add_row().cells
            for i, v in enumerate(row): cells[i].text = str(v)
    print("Helper functions written")

gen()
