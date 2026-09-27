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
FONT_ROOT = Path(
    "/Users/antoinequarroz/.cache/codex-runtimes/codex-primary-runtime/dependencies/"
    "native/libreoffice-headless/libreoffice/LibreOfficeDev.app/Contents/Resources/fonts/truetype"
)

NAVY = colors.HexColor("#090F1D")
NAVY_2 = colors.HexColor("#111D31")
COPPER = colors.HexColor("#D99A55")
COPPER_LIGHT = colors.HexColor("#F0C38D")
INK = colors.HexColor("#172033")
MUTED = colors.HexColor("#5F6878")
PALE = colors.HexColor("#F5F1EA")
LINE = colors.HexColor("#D9DEE8")
WHITE = colors.white


def register_fonts():
    pdfmetrics.registerFont(TTFont("AQSans", str(FONT_ROOT / "DejaVuSans.ttf")))
    pdfmetrics.registerFont(TTFont("AQSansBold", str(FONT_ROOT / "DejaVuSansCondensed-Bold.ttf")))


def checkbox_line(text, style):
    return Table(
        [["□", Paragraph(text, style)]],
        colWidths=[8 * mm, 162 * mm],
        style=TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("FONTNAME", (0, 0), (0, 0), "AQSansBold"),
            ("FONTSIZE", (0, 0), (0, 0), 13),
            ("TEXTCOLOR", (0, 0), (0, 0), COPPER),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 2),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]),
    )


def page_number(canvas, doc):
    if doc.page == 1:
        return
    canvas.saveState()
    canvas.setStrokeColor(LINE)
    canvas.line(20 * mm, 13 * mm, 190 * mm, 13 * mm)
    canvas.setFont("AQSans", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(20 * mm, 8 * mm, "Antoine Quarroz - Checklist IA pour PME")
    canvas.drawRightString(190 * mm, 8 * mm, str(doc.page))
    canvas.restoreState()


def cover(canvas, doc):
    canvas.saveState()
    width, height = A4
    canvas.setFillColor(NAVY)
    canvas.rect(0, 0, width, height, stroke=0, fill=1)
    canvas.setFillColor(NAVY_2)
    canvas.circle(width * 0.83, height * 0.78, 72 * mm, stroke=0, fill=1)
    canvas.setStrokeColor(COPPER)
    canvas.setLineWidth(1.4)
    for offset in (0, 9, 18):
        canvas.circle(width * 0.83, height * 0.78, (35 + offset) * mm, stroke=1, fill=0)
    canvas.setFillColor(COPPER)
    canvas.roundRect(20 * mm, 250 * mm, 52 * mm, 9 * mm, 4.5 * mm, stroke=0, fill=1)
    canvas.setFillColor(NAVY)
    canvas.setFont("AQSansBold", 8)
    canvas.drawCentredString(46 * mm, 253 * mm, "CHECKLIST PRATIQUE")
    canvas.setFillColor(WHITE)
    canvas.setFont("AQSansBold", 31)
    canvas.drawString(20 * mm, 212 * mm, "PILOTE IA")
    canvas.drawString(20 * mm, 196 * mm, "EN PME")
    canvas.setFillColor(COPPER_LIGHT)
    canvas.setFont("AQSansBold", 18)
    canvas.drawString(20 * mm, 177 * mm, "30 jours pour tester sans")
    canvas.drawString(20 * mm, 166 * mm, "exposer vos données")
    canvas.setFillColor(colors.HexColor("#D9E0EB"))
    canvas.setFont("AQSans", 11)
    canvas.drawString(20 * mm, 143 * mm, "Cas d’usage  •  données  •  outils  •  validation")
    canvas.drawString(20 * mm, 135 * mm, "mesure avant/après  •  décision finale")
    canvas.setFillColor(COPPER)
    canvas.roundRect(20 * mm, 49 * mm, 170 * mm, 36 * mm, 5 * mm, stroke=0, fill=1)
    canvas.setFillColor(NAVY)
    canvas.setFont("AQSansBold", 13)
    canvas.drawString(28 * mm, 70 * mm, "Votre objectif")
    canvas.setFont("AQSans", 10)
    canvas.drawString(28 * mm, 61 * mm, "Décider sur des faits si un usage IA mérite d’être intégré,")
    canvas.drawString(28 * mm, 54 * mm, "modifié ou abandonné après un mois d’essai contrôlé.")
    canvas.setFillColor(colors.HexColor("#B8C2D2"))
    canvas.setFont("AQSans", 9)
    canvas.drawString(20 * mm, 25 * mm, "antoinequarroz.ch  ·  Développement web, mobile et outils métier")
    canvas.restoreState()


def build():
    register_fonts()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    SERVER_ASSET.parent.mkdir(parents=True, exist_ok=True)

    styles = getSampleStyleSheet()
    title = ParagraphStyle("Title", parent=styles["Heading1"], fontName="AQSansBold", fontSize=23, leading=27, textColor=NAVY, spaceAfter=7 * mm)
    h2 = ParagraphStyle("H2", parent=styles["Heading2"], fontName="AQSansBold", fontSize=14, leading=18, textColor=NAVY, spaceBefore=4 * mm, spaceAfter=3 * mm)
    body = ParagraphStyle("Body", parent=styles["BodyText"], fontName="AQSans", fontSize=9.2, leading=13.2, textColor=INK, spaceAfter=3 * mm)
    small = ParagraphStyle("Small", parent=body, fontSize=7.8, leading=10.5, textColor=MUTED)
    label = ParagraphStyle("Label", parent=body, fontName="AQSansBold", fontSize=8, leading=10, textColor=COPPER)
    callout = ParagraphStyle("Callout", parent=body, fontName="AQSansBold", fontSize=10.2, leading=14, textColor=NAVY)
    table_head = ParagraphStyle("TableHead", parent=body, fontName="AQSansBold", fontSize=8.2, leading=10, textColor=WHITE)
    table_cell = ParagraphStyle("TableCell", parent=body, fontSize=7.8, leading=10.2, spaceAfter=0)
    center = ParagraphStyle("Center", parent=body, alignment=TA_CENTER)

    doc = BaseDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=18 * mm,
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
        Paragraph("Point de contrôle hebdomadaire", h2),
        Paragraph("Qu’avons-nous appris ? ______________________________________________________________", body),
        Paragraph("Quel risque ou blocage faut-il traiter ? ______________________________________________", body),
        Paragraph("Quelle règle change la semaine prochaine ? ___________________________________________", body),
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
        Paragraph("☐ Intégrer   ☐ Modifier   ☐ Abandonner", callout),
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
