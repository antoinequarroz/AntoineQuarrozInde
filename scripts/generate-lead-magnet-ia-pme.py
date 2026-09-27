from pathlib import Path
from shutil import copyfile

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Flowable,
    Frame,
    KeepTogether,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output/pdf/checklist-pilote-ia-pme-30-jours.pdf"
SERVER_ASSET = ROOT / "server/assets/lead-magnets/checklist-pilote-ia-pme-30-jours.pdf"
FONT_ROOT = ROOT / "scripts/assets/fonts"

# Antoine Quarroz — charte graphique, édition du 16 septembre 2026.
PURPLE = colors.HexColor("#7C3AED")
PURPLE_DEEP = colors.HexColor("#5B21B6")
PURPLE_STUDIO = colors.HexColor("#A78BFA")
FUCHSIA = colors.HexColor("#A855F7")
CYAN = colors.HexColor("#22D3EE")
CYAN_LIGHT = colors.HexColor("#A5F3FC")
NIGHT = colors.HexColor("#080810")
CARD_NIGHT = colors.HexColor("#13131F")
INK = colors.HexColor("#111827")
MUTED = colors.HexColor("#62627A")
MIST = colors.HexColor("#F8F7FF")
LINE = colors.HexColor("#DED9EE")
WHITE = colors.white

# Aliases used by the document tables and callouts.
NAVY = PURPLE
NAVY_2 = CARD_NIGHT
COPPER = PURPLE
COPPER_LIGHT = PURPLE_STUDIO
PALE = MIST


def register_fonts():
    pdfmetrics.registerFont(TTFont("AQBody", str(FONT_ROOT / "Inter-Regular.ttf")))
    pdfmetrics.registerFont(TTFont("AQBodySemibold", str(FONT_ROOT / "Inter-SemiBold.ttf")))
    pdfmetrics.registerFont(TTFont("AQDisplay", str(FONT_ROOT / "SpaceGrotesk-SemiBold.ttf")))
    pdfmetrics.registerFont(TTFont("AQDisplayBold", str(FONT_ROOT / "SpaceGrotesk-Bold.ttf")))
    pdfmetrics.registerFontFamily("AQBody", normal="AQBody", bold="AQBodySemibold")
    pdfmetrics.registerFontFamily("AQDisplay", normal="AQDisplay", bold="AQDisplayBold")


class Checkbox(Flowable):
    """Draw a checkbox as vector artwork so it never depends on a font glyph."""

    def __init__(self, size=4.2 * mm, stroke=PURPLE, line_width=1.1):
        super().__init__()
        self.width = size
        self.height = size
        self.stroke = stroke
        self.line_width = line_width

    def wrap(self, avail_width, avail_height):
        return self.width, self.height

    def draw(self):
        self.canv.saveState()
        self.canv.setStrokeColor(self.stroke)
        self.canv.setLineWidth(self.line_width)
        self.canv.roundRect(0, 0, self.width, self.height, 1.2 * mm, stroke=1, fill=0)
        self.canv.restoreState()


def checkbox_line(text, style):
    return Table(
        [[Checkbox(), Paragraph(text, style)]],
        colWidths=[8 * mm, 162 * mm],
        style=TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 2),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]),
    )


def choice_line(options, style):
    """Render decision boxes as vectors for consistent output in every PDF viewer."""
    pair_width = 170 * mm / len(options)
    row = []
    widths = []
    for option in options:
        row.extend([Checkbox(), Paragraph(option, style)])
        widths.extend([8 * mm, pair_width - 8 * mm])
    return Table([row], colWidths=widths, style=TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PALE),
        ("BOX", (0, 0), (-1, -1), 1, COPPER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 3 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 1 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 3 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3 * mm),
    ]))


def page_number(canvas, doc):
    if doc.page == 1:
        return
    canvas.saveState()
    width, height = A4
    canvas.setFillColor(PURPLE)
    canvas.roundRect(20 * mm, height - 13 * mm, 8 * mm, 8 * mm, 2.2 * mm, stroke=0, fill=1)
    canvas.setFillColor(WHITE)
    canvas.setFont("AQDisplayBold", 5.8)
    canvas.drawCentredString(24 * mm, height - 10.2 * mm, "AQ")
    canvas.setFillColor(PURPLE)
    canvas.setFont("AQBodySemibold", 7.5)
    canvas.drawString(31 * mm, height - 10.3 * mm, "ANTOINE QUARROZ")
    canvas.setFillColor(MUTED)
    canvas.drawRightString(190 * mm, height - 10.3 * mm, "CHECKLIST / PILOTE IA EN PME")
    canvas.setStrokeColor(LINE)
    canvas.line(20 * mm, 13 * mm, 190 * mm, 13 * mm)
    canvas.setFont("AQBody", 7.4)
    canvas.setFillColor(MUTED)
    canvas.drawString(20 * mm, 8 * mm, "antoinequarroz.ch  ·  Checklist IA pour PME")
    canvas.drawRightString(190 * mm, 8 * mm, f"{doc.page:02d} / 08")
    canvas.restoreState()


def cover(canvas, doc):
    canvas.saveState()
    width, height = A4
    canvas.setFillColor(NIGHT)
    canvas.rect(0, 0, width, height, stroke=0, fill=1)
    canvas.setFillColor(CARD_NIGHT)
    canvas.circle(width * 0.84, height * 0.78, 74 * mm, stroke=0, fill=1)
    canvas.setLineWidth(0.65)
    for index, radius in enumerate((39, 45, 51, 57, 63)):
        canvas.setStrokeColor(colors.Color(0.49, 0.23, 0.93, alpha=max(0.18, 0.58 - index * 0.08)))
        canvas.circle(width * 0.84, height * 0.78, radius * mm, stroke=1, fill=0)

    # Signature AQ, conforme à la charte : initiales blanches sur dégradé violet.
    mark_x, mark_y, mark_size = 153 * mm, 205 * mm, 34 * mm
    canvas.saveState()
    path = canvas.beginPath()
    path.roundRect(mark_x, mark_y, mark_size, mark_size, 9 * mm)
    canvas.clipPath(path, stroke=0, fill=0)
    canvas.linearGradient(mark_x, mark_y, mark_x + mark_size, mark_y + mark_size,
                          (PURPLE, FUCHSIA, colors.HexColor("#C084FC")), extend=True)
    canvas.restoreState()
    canvas.setFillColor(WHITE)
    canvas.setFont("AQDisplayBold", 24)
    canvas.drawCentredString(mark_x + mark_size / 2, mark_y + 11.7 * mm, "AQ")

    canvas.setFillColor(PURPLE_STUDIO)
    canvas.setFont("AQBodySemibold", 8.2)
    canvas.drawString(20 * mm, 272 * mm, "ANTOINE QUARROZ")
    canvas.setFillColor(colors.HexColor("#B9B7C9"))
    canvas.drawRightString(190 * mm, 272 * mm, "CHECKLIST / PILOTE IA EN PME")
    canvas.setFillColor(PURPLE_STUDIO)
    canvas.setFont("AQBodySemibold", 8)
    canvas.drawString(20 * mm, 248 * mm, "GUIDE PRATIQUE · 30 JOURS")
    canvas.setFillColor(CYAN)
    canvas.circle(61.5 * mm, 249.1 * mm, 1.05 * mm, stroke=0, fill=1)
    canvas.setFillColor(WHITE)
    canvas.setFont("AQDisplayBold", 34)
    canvas.drawString(20 * mm, 218 * mm, "PILOTE IA")
    canvas.drawString(20 * mm, 201 * mm, "EN PME")
    canvas.setFillColor(PURPLE_STUDIO)
    canvas.setFont("AQDisplayBold", 18)
    canvas.drawString(20 * mm, 178 * mm, "Tester sans exposer")
    canvas.drawString(20 * mm, 167 * mm, "vos données")
    canvas.setFillColor(colors.HexColor("#C7C5D2"))
    canvas.setFont("AQBody", 10.3)
    canvas.drawString(20 * mm, 145 * mm, "Cas d’usage  ·  données  ·  outils  ·  validation")
    canvas.drawString(20 * mm, 137 * mm, "mesure avant/après  ·  décision finale")

    canvas.setFillColor(CARD_NIGHT)
    canvas.roundRect(20 * mm, 50 * mm, 170 * mm, 38 * mm, 6 * mm, stroke=0, fill=1)
    canvas.setStrokeColor(PURPLE)
    canvas.setLineWidth(1)
    canvas.line(20 * mm, 50 * mm, 20 * mm, 88 * mm)
    canvas.setFillColor(PURPLE_STUDIO)
    canvas.setFont("AQDisplayBold", 12.5)
    canvas.drawString(28 * mm, 72 * mm, "VOTRE OBJECTIF")
    canvas.setFillColor(colors.HexColor("#E7E5EF"))
    canvas.setFont("AQBody", 9.7)
    canvas.drawString(28 * mm, 61 * mm, "Décider sur des faits si un usage IA mérite d’être intégré,")
    canvas.drawString(28 * mm, 54 * mm, "modifié ou abandonné après un mois d’essai contrôlé.")
    canvas.setFillColor(colors.HexColor("#AAA7BA"))
    canvas.setFont("AQBody", 8)
    canvas.drawString(20 * mm, 25 * mm, "antoinequarroz.ch  ·  Développement web, mobile et outils métier")
    canvas.drawRightString(190 * mm, 25 * mm, "01 / 08")
    canvas.restoreState()


def build():
    register_fonts()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    SERVER_ASSET.parent.mkdir(parents=True, exist_ok=True)

    styles = getSampleStyleSheet()
    title = ParagraphStyle("Title", parent=styles["Heading1"], fontName="AQDisplayBold", fontSize=23, leading=27, textColor=INK, spaceAfter=7 * mm)
    h2 = ParagraphStyle("H2", parent=styles["Heading2"], fontName="AQDisplay", fontSize=14, leading=18, textColor=INK, spaceBefore=4 * mm, spaceAfter=3 * mm)
    body = ParagraphStyle("Body", parent=styles["BodyText"], fontName="AQBody", fontSize=9.2, leading=13.2, textColor=INK, spaceAfter=3 * mm)
    small = ParagraphStyle("Small", parent=body, fontSize=7.8, leading=10.5, textColor=MUTED)
    label = ParagraphStyle("Label", parent=body, fontName="AQBodySemibold", fontSize=8, leading=10, textColor=PURPLE)
    callout = ParagraphStyle("Callout", parent=body, fontName="AQBodySemibold", fontSize=10.2, leading=14, textColor=PURPLE_DEEP)
    table_head = ParagraphStyle("TableHead", parent=body, fontName="AQBodySemibold", fontSize=8.2, leading=10, textColor=WHITE)
    table_cell = ParagraphStyle("TableCell", parent=body, fontSize=7.8, leading=10.2, spaceAfter=0)
    center = ParagraphStyle("Center", parent=body, alignment=TA_CENTER)

    doc = BaseDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=22 * mm,
        bottomMargin=19 * mm,
        title="Checklist pilote IA en PME - 30 jours",
        author="Antoine Quarroz",
        subject="Méthode pratique pour tester un usage IA dans une PME suisse",
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="main")
    doc.addPageTemplates([
        PageTemplate(id="cover", frames=[frame], onPage=cover),
        PageTemplate(id="content", frames=[frame], onPage=page_number),
    ])

    story = [Spacer(1, 1), NextPageTemplate("content"), PageBreak()]
    story.extend([
        Paragraph("1. Choisir un premier cas d’usage contrôlable", title),
        Paragraph("Le bon premier essai n’est pas le plus spectaculaire. Il est fréquent, mesurable, réversible et peut fonctionner avec des informations publiques ou non confidentielles.", callout),
        Spacer(1, 3 * mm),
        Paragraph("Test de sélection", h2),
    ])
    for line in [
        "La tâche revient au moins chaque semaine.",
        "Le résultat peut être relu rapidement par une personne compétente.",
        "Une erreur peut être corrigée avant tout effet sur un client ou un collaborateur.",
        "Les entrées du pilote sont publiques, fictives ou correctement anonymisées.",
        "Le temps et la qualité actuels peuvent être mesurés sur 5 à 20 exemples.",
    ]:
        story.append(checkbox_line(line, body))
    story.extend([
        Paragraph("Exemples adaptés", h2),
        Table([
            [Paragraph("Bon premier pilote", table_head), Paragraph("À exclure du premier pilote", table_head)],
            [Paragraph("Brouillon d’une FAQ à partir de documents publics", table_cell), Paragraph("Sélection automatique de candidats", table_cell)],
            [Paragraph("Synthèse d’un texte réglementaire avec sources", table_cell), Paragraph("Décision de crédit, de santé ou de paiement", table_cell)],
            [Paragraph("Reformulation d’un texte interne non confidentiel", table_cell), Paragraph("Analyse de dossiers clients ou RH réels", table_cell)],
        ], colWidths=[85 * mm, 85 * mm], style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), NAVY),
            ("GRID", (0, 0), (-1, -1), 0.5, LINE),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 4 * mm),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4 * mm),
            ("TOPPADDING", (0, 0), (-1, -1), 3 * mm),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3 * mm),
        ])),
        Spacer(1, 5 * mm),
        Paragraph("Mon cas d’usage", h2),
        Paragraph("Tâche : __________________________________________________________________________", body),
        Paragraph("Responsable : ______________________________  Fréquence : ______________________________", body),
        Paragraph("Résultat attendu : __________________________________________________________________", body),
        PageBreak(),
        Paragraph("2. Classer les données avant le premier test", title),
        Paragraph("Cette classification est une règle opérationnelle interne. Elle ne remplace pas une analyse juridique, mais elle évite de copier par réflexe des informations protégées dans un outil non évalué.", callout),
        Spacer(1, 3 * mm),
        Table([
            [Paragraph("Classe", table_head), Paragraph("Exemples", table_head), Paragraph("Règle du pilote", table_head)],
            [Paragraph("Publique", table_cell), Paragraph("Site, brochure publiée, texte officiel", table_cell), Paragraph("Autorisée dans l’outil approuvé", table_cell)],
            [Paragraph("Interne non sensible", table_cell), Paragraph("Procédure générique, brouillon sans noms", table_cell), Paragraph("Seulement après validation du contrat et des réglages", table_cell)],
            [Paragraph("Confidentielle", table_cell), Paragraph("Prix négociés, stratégie, code privé", table_cell), Paragraph("Exclue du premier pilote", table_cell)],
            [Paragraph("Personnelle ou sensible", table_cell), Paragraph("Données clients, RH, santé, finances", table_cell), Paragraph("Exclue ou analysée dans un projet séparé", table_cell)],
        ], colWidths=[33 * mm, 70 * mm, 67 * mm], repeatRows=1, style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), NAVY),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, PALE]),
            ("GRID", (0, 0), (-1, -1), 0.5, LINE),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 3 * mm),
            ("RIGHTPADDING", (0, 0), (-1, -1), 3 * mm),
            ("TOPPADDING", (0, 0), (-1, -1), 3 * mm),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3 * mm),
        ])),
        Paragraph("Contrôle avant saisie", h2),
    ])
    for line in [
        "J’ai retiré les noms, adresses, identifiants et détails permettant une ré-identification.",
        "Je n’ai inclus aucun mot de passe, clé API, secret d’affaires ou document client.",
        "Je sais si le fournisseur conserve les saisies et s’il les utilise pour améliorer ses modèles.",
        "Je peux expliquer la finalité du traitement et qui relit le résultat.",
        "Un canal existe pour signaler immédiatement une saisie accidentelle.",
    ]:
        story.append(checkbox_line(line, body))
    story.extend([
        Spacer(1, 4 * mm),
        Table([[Paragraph("Règle simple", label)], [Paragraph("Si vous hésitez sur la classe d’une information, ne la saisissez pas pendant le pilote. Préparez un exemple fictif et faites évaluer le cas réel séparément.", body)]], colWidths=[170 * mm], style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), PALE),
            ("BOX", (0, 0), (-1, -1), 1, COPPER),
            ("LEFTPADDING", (0, 0), (-1, -1), 5 * mm),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5 * mm),
            ("TOPPADDING", (0, 0), (-1, -1), 3 * mm),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3 * mm),
        ])),
        PageBreak(),
        Paragraph("3. Approuver l’outil et les règles d’équipe", title),
        Paragraph("Une liste courte d’outils autorisés vaut mieux que plusieurs comptes personnels impossibles à contrôler. Notez la décision et réévaluez-la si les conditions du fournisseur changent.", callout),
        Paragraph("Fiche de validation de l’outil", h2),
    ])
    fields = [
        "Outil et fournisseur", "Finalité autorisée", "Lieu de traitement annoncé", "Conservation des données",
        "Utilisation des saisies pour l’entraînement", "Gestion des comptes et des départs", "Journal d’activité",
        "Responsable de la validation", "Date de réexamen",
    ]
    for field in fields:
        story.append(Paragraph(f"<b>{field} :</b> ________________________________________________________________", body))
    story.append(Paragraph("Sept règles à transmettre à l’équipe", h2))
    for line in [
        "Utiliser uniquement les outils approuvés.",
        "Ne saisir aucun secret, dossier client ou donnée RH.",
        "Vérifier les faits dans la source d’origine.",
        "Faire relire tout contenu destiné à un client ou au public.",
        "Documenter les corrections importantes.",
        "Escalader les cas sensibles au responsable désigné.",
        "Signaler immédiatement toute donnée envoyée par erreur.",
    ]:
        story.append(checkbox_line(line, body))
    story.extend([
        PageBreak(),
        Paragraph("4. Mesurer avant et après", title),
        Paragraph("Mesurez la tâche avant d’introduire l’IA, puis gardez les mêmes critères pendant le pilote. Un gain de vitesse ne compte pas si les reprises, les erreurs ou le risque augmentent.", callout),
        Spacer(1, 4 * mm),
        Table([
            [Paragraph("Indicateur", table_head), Paragraph("Avant", table_head), Paragraph("Après 30 jours", table_head), Paragraph("Écart", table_head)],
            [Paragraph("Temps moyen par tâche", table_cell), "", "", ""],
            [Paragraph("Résultats acceptés sans reprise", table_cell), "", "", ""],
            [Paragraph("Temps de relecture", table_cell), "", "", ""],
            [Paragraph("Cas escaladés", table_cell), "", "", ""],
            [Paragraph("Incidents de données", table_cell), "", "", ""],
            [Paragraph("Satisfaction de l’équipe (1-5)", table_cell), "", "", ""],
        ], colWidths=[62 * mm, 36 * mm, 40 * mm, 32 * mm], rowHeights=[10 * mm] + [14 * mm] * 6, style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), NAVY),
            ("GRID", (0, 0), (-1, -1), 0.5, LINE),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 3 * mm),
            ("RIGHTPADDING", (0, 0), (-1, -1), 3 * mm),
        ])),
        Paragraph("Seuil décidé avant le pilote", h2),
        Paragraph("Le pilote sera considéré comme utile si : _______________________________________________", body),
        Paragraph("La qualité minimale attendue est : ___________________________________________________", body),
        Paragraph("Le pilote doit être arrêté immédiatement si : _________________________________________", body),
        Spacer(1, 3 * mm),
        Table([[Paragraph("Ne mesurez pas seulement le temps", label)], [Paragraph("Ajoutez le temps de relecture, les corrections, les escalades et les incidents. C’est le coût complet du nouveau processus qui doit être comparé.", body)]], colWidths=[170 * mm], style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), PALE),
            ("BOX", (0, 0), (-1, -1), 1, COPPER),
            ("LEFTPADDING", (0, 0), (-1, -1), 5 * mm),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5 * mm),
            ("TOPPADDING", (0, 0), (-1, -1), 3 * mm),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3 * mm),
        ])),
        PageBreak(),
        Paragraph("5. Le plan de pilote sur 30 jours", title),
    ])
    weeks = [
        ("Semaine 1 - Cadrer", ["Choisir la tâche et le responsable", "Mesurer 5 à 20 cas sans IA", "Classer les données", "Écrire les règles d’équipe"]),
        ("Semaine 2 - Tester", ["Configurer l’outil approuvé", "Utiliser uniquement des données maîtrisées", "Créer un modèle de demande commun", "Noter erreurs et corrections"]),
        ("Semaine 3 - Exécuter", ["Traiter un volume limité de cas réels autorisés", "Faire contrôler un échantillon par une seconde personne", "Documenter les refus et escalades", "Vérifier le respect des règles"]),
        ("Semaine 4 - Décider", ["Comparer les indicateurs avant/après", "Interroger les utilisateurs", "Identifier les risques restants", "Intégrer, modifier ou abandonner"]),
    ]
    for week, tasks in weeks:
        rows = [[Paragraph(week, table_head)]] + [[checkbox_line(task, table_cell)] for task in tasks]
        story.append(KeepTogether(Table(rows, colWidths=[170 * mm], style=TableStyle([
            ("BACKGROUND", (0, 0), (0, 0), NAVY),
            ("BOX", (0, 0), (-1, -1), 0.75, LINE),
            ("LEFTPADDING", (0, 0), (-1, -1), 4 * mm),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4 * mm),
            ("TOPPADDING", (0, 0), (-1, -1), 2.5 * mm),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5 * mm),
        ]))))
        story.append(Spacer(1, 3 * mm))
    story.extend([
        PageBreak(),
        Paragraph("Suivi hebdomadaire du pilote", title),
        Paragraph("Consignez une fois par semaine ce qui a été appris, le principal risque observé et l’ajustement décidé. Ce journal évite de juger le pilote uniquement sur l’impression finale.", callout),
        Spacer(1, 4 * mm),
        Table([
            [Paragraph("Semaine", table_head), Paragraph("Apprentissage principal", table_head), Paragraph("Risque ou blocage", table_head), Paragraph("Ajustement décidé", table_head)],
            [Paragraph("01", table_cell), "", "", ""],
            [Paragraph("02", table_cell), "", "", ""],
            [Paragraph("03", table_cell), "", "", ""],
            [Paragraph("04", table_cell), "", "", ""],
        ], colWidths=[20 * mm, 50 * mm, 50 * mm, 50 * mm], rowHeights=[11 * mm] + [35 * mm] * 4, style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), PURPLE),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, MIST]),
            ("GRID", (0, 0), (-1, -1), 0.5, LINE),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("ALIGN", (0, 1), (0, -1), "CENTER"),
            ("FONTNAME", (0, 1), (0, -1), "AQDisplayBold"),
            ("FONTSIZE", (0, 1), (0, -1), 12),
            ("TEXTCOLOR", (0, 1), (0, -1), PURPLE),
            ("LEFTPADDING", (0, 0), (-1, -1), 3 * mm),
            ("RIGHTPADDING", (0, 0), (-1, -1), 3 * mm),
            ("TOPPADDING", (0, 0), (-1, -1), 3 * mm),
        ])),
        Spacer(1, 6 * mm),
        Paragraph("Responsable du suivi : ____________________________________", body),
        Paragraph("Incident à escalader immédiatement : __________________________________________________", body),
        Paragraph("Décision intermédiaire", h2),
        choice_line(["Continuer", "Modifier", "Suspendre"], body),
        PageBreak(),
        Paragraph("6. Décider et documenter", title),
        Paragraph("Le résultat du pilote n’est pas forcément un déploiement. Abandonner un usage peu fiable ou trop risqué est une décision utile.", callout),
        Spacer(1, 4 * mm),
        Table([
            [Paragraph("Décision", table_head), Paragraph("Quand la choisir", table_head)],
            [Paragraph("Intégrer", table_cell), Paragraph("Les seuils sont atteints, les risques sont maîtrisés et un responsable est nommé.", table_cell)],
            [Paragraph("Modifier", table_cell), Paragraph("Le potentiel existe, mais une règle, un outil ou le périmètre doit changer.", table_cell)],
            [Paragraph("Abandonner", table_cell), Paragraph("Le gain est faible, la relecture annule le bénéfice ou le risque reste disproportionné.", table_cell)],
        ], colWidths=[42 * mm, 128 * mm], style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), NAVY),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, PALE]),
            ("GRID", (0, 0), (-1, -1), 0.5, LINE),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 4 * mm),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4 * mm),
            ("TOPPADDING", (0, 0), (-1, -1), 3 * mm),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3 * mm),
        ])),
        Paragraph("Décision du 30e jour", h2),
        choice_line(["Intégrer", "Modifier", "Abandonner"], body),
        Paragraph("Pourquoi : __________________________________________________________________________", body),
        Paragraph("Responsable de la suite : __________________________  Réexamen le : __________________", body),
        Paragraph("Sources officielles", h2),
        Paragraph("PFPDT - IA et protection des données : edoeb.admin.ch/fr/ia-et-protection-des-donnees", small),
        Paragraph("PFPDT - Sécurité de l’information : edoeb.admin.ch/fr/securite-de-linformation", small),
        Paragraph("Portail PME - Cinq conseils pour intégrer efficacement l’IA : kmu.admin.ch", small),
        Spacer(1, 6 * mm),
        Table([[Paragraph("Besoin d’un regard extérieur ?", label)], [Paragraph("Je peux vous aider à choisir le premier cas d’usage, cartographier les données et construire un pilote mesurable adapté à votre PME.", body)], [Paragraph("antoinequarroz.ch/#contact", center)]], colWidths=[170 * mm], style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), PALE),
            ("BOX", (0, 0), (-1, -1), 1, COPPER),
            ("LEFTPADDING", (0, 0), (-1, -1), 5 * mm),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5 * mm),
            ("TOPPADDING", (0, 0), (-1, -1), 3 * mm),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3 * mm),
        ])),
    ])

    doc.build(story)
    copyfile(OUTPUT, SERVER_ASSET)
    print(OUTPUT)


if __name__ == "__main__":
    build()
