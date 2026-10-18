#!/usr/bin/env python3
"""Build the five approved editorial covers from local, editable brand sources.

Run through Portly as documented in README.md.  All text is converted from the
bundled, OFL-licensed Space Grotesk font into vector paths.  Raster brand assets
are composited explicitly with Sharp, avoiding SVG image/clip rendering issues.
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from xml.sax.saxutils import escape
import hashlib
import json
import os
import shutil
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
ASSETS = HERE / 'assets'
SOURCES = HERE / 'sources'
RUNTIME = Path('/Users/antoinequarroz/.cache/codex-runtimes/codex-primary-runtime/dependencies')
NODE = os.environ.get('COVER_NODE', str(RUNTIME / 'node/bin/node'))
SHARP = os.environ.get('COVER_SHARP', str(RUNTIME / 'node/node_modules/sharp'))

# One-time import only. Once assets are bundled, rebuilds need no external paths.
IMPORTS = {
    'SpaceGrotesk-VariableFont_wght.ttf': Path('/Users/antoinequarroz/Downloads/PhysioBaur-proposition-sombre-20261015/assets/fonts/SpaceGrotesk-VariableFont_wght.ttf'),
    'OFL-SpaceGrotesk.txt': Path('/Users/antoinequarroz/Downloads/PhysioBaur-proposition-sombre-20261015/assets/fonts/OFL-SpaceGrotesk.txt'),
    'robot-transparent.png': Path('/Users/antoinequarroz/Downloads/PhysioBaur-proposition-sombre-20261015/assets/robot-transparent.png'),
    'affiche-paysage.jpg': ROOT / 'public/videos/presentation/affiche-paysage.jpg',
    'affiche-portrait.jpg': ROOT / 'public/videos/presentation/affiche-portrait.jpg',
}
ASSETS.mkdir(parents=True, exist_ok=True)
SOURCES.mkdir(parents=True, exist_ok=True)
for name, source in IMPORTS.items():
    if not (ASSETS / name).exists():
        shutil.copy2(source, ASSETS / name)

FONTS = {
    weight: instantiateVariableFont(TTFont(ASSETS / 'SpaceGrotesk-VariableFont_wght.ttf'), {'wght': weight}, inplace=False)
    for weight in (500, 700)
}

def text(value, x, y, size, fill='#f7f7fc', weight=700, maxwidth=None):
    font = FONTS[weight]
    scale = size / font['head'].unitsPerEm
    cmap = font.getBestCmap()
    glyphs = font.getGlyphSet()
    widths = [font['hmtx'][cmap[ord(char)]][0] for char in value]
    if maxwidth and sum(widths) * scale > maxwidth:
        scale = maxwidth / sum(widths)
    pen = SVGPathPen(glyphs)
    pos = 0
    for char, width in zip(value, widths):
        glyphs[cmap[ord(char)]].draw(TransformPen(pen, (1, 0, 0, 1, pos, 0)))
        pos += width
    return f'<g aria-label="{escape(value)}" fill="{fill}" transform="translate({x} {y}) scale({scale} {-scale})"><path d="{pen.getCommands()}"/></g>'

def rect(x, y, w, h, fill='#11101b', stroke='#89829b', radius=12, opacity='.38'):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" fill="{fill}" stroke="{stroke}" stroke-opacity="{opacity}"/>'

def line(x1, y1, x2, y2, stroke='#c084fc', width=2, opacity=1):
    return f'<path d="M{x1} {y1}L{x2} {y2}" fill="none" stroke="{stroke}" stroke-width="{width}" stroke-opacity="{opacity}" stroke-linecap="round"/>'

def arrow(x1, y, x2):
    return line(x1, y, x2, y) + f'<path d="m{x2-7} {y-6} 7 6-7 6" fill="none" stroke="#c084fc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'

def icon(kind, x, y, size=24, color='#c084fc'):
    paths = {
        'document': '<path d="M6 3h8l4 4v14H6Z"/><path d="M14 3v5h4M9 12h6M9 16h6"/>',
        'form': '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8M8 12h8M8 16h4"/>',
        'link': '<path d="m10 14 4-4M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0M16 8l1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0"/>',
        'backup': '<path d="M6 6h12l3 4v10H3V10ZM3 10h18M9 14h6M9 17h6"/>',
        'check': '<path d="m5 12 4 4L19 6"/>',
        'grid': '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
        'folder': '<path d="M3 6h7l2 3h9v11H3Z"/>',
    }
    return f'<g transform="translate({x} {y}) scale({size/24})" fill="none" stroke="{color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">{paths[kind]}</g>'

DEFS = '''<defs>
<linearGradient id="brand" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#7c3aed"/><stop offset=".5" stop-color="#a855f7"/><stop offset="1" stop-color="#c084fc"/></linearGradient>
<linearGradient id="heading" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#7c3aed"/><stop offset=".5" stop-color="#a855f7"/><stop offset="1" stop-color="#c084fc"/></linearGradient>
<radialGradient id="aura"><stop stop-color="#7c3aed" stop-opacity=".28"/><stop offset="1" stop-color="#7c3aed" stop-opacity="0"/></radialGradient>
<pattern id="dots" width="34" height="34" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".7" fill="white" opacity=".045"/></pattern>
<filter id="shadow" x="-25%" y="-25%" width="150%" height="170%"><feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#000" flood-opacity=".6"/></filter>
</defs>'''

def wrap(content, title):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675"><title>{escape(title)}</title>{DEFS}{content}</svg>'

def base(meta):
    s = '<rect width="1200" height="675" fill="#080810"/><ellipse cx="937" cy="362" rx="533" ry="420" fill="url(#aura)"/><rect width="1200" height="675" fill="url(#dots)"/>'
    s += '<rect x="64" y="49" width="46" height="46" rx="13" fill="url(#brand)"/>'
    s += text('AQ', 74, 79, 22)
    s += text('Antoine Quarroz', 124, 80, 20, '#ece7ff', 500)
    s += f'<rect x="64" y="139" width="{meta["badge_width"]}" height="31" rx="15.5" fill="#7c3aed" fill-opacity=".12" stroke="#a855f7" stroke-opacity=".3"/>'
    s += text(meta['badge'], 79, 160, 15, '#c084fc', 500)
    for value, y in zip(meta['title_lines'], (241, 312)):
        s += text(value, 61, y, 65, 'url(#heading)', 700, 497)
    for value, y in zip(meta['subtitle_lines'], (391, 449)):
        s += text(value, 63, y, 52, '#f7f7fc', 700, 495)
    for value, y in zip(meta['detail_lines'], (514, 546)):
        s += text(value, 65, y, 22, '#aca7bf', 500, 490)
    s += text('antoinequarroz.ch', 65, 614, 18, '#c084fc', 500)
    return s

def window(title='Démonstration', bottom=573):
    s = '<g filter="url(#shadow)">' + rect(576,150,564,bottom-150,radius=20)
    s += '<circle cx="594" cy="167" r="3" fill="#6e677f"/><circle cx="606" cy="167" r="3" fill="#6e677f"/><circle cx="618" cy="167" r="3" fill="#6e677f"/>'
    s += text(title, 810 if title=='antoinequarroz.ch' else 804, 172, 12, '#aaa3be', 500)
    return s + '</g>'

def demonstration(x=983,y=197):
    return rect(x,y,128,26,fill='#1b132b',stroke='#a855f7',radius=13,opacity='.28') + text('Démonstration', x+12,y+18,12,'#c084fc',500)

def video():
    s = window('antoinequarroz.ch', 554)
    s += rect(1027,364,126,258,fill='#17141f',stroke='#a79abf',radius=22,opacity='.6')
    # Images are separate layers so clipping cannot drop the actual preview.
    images = [
        {'asset':'affiche-paysage.jpg','x':578,'y':182,'width':560,'height':315},
        {'asset':'affiche-portrait.jpg','x':1034,'y':372,'width':112,'height':140,'radius':14},
    ]
    over = '<circle cx="858" cy="339" r="31" fill="#080810" fill-opacity=".84" stroke="#c084fc" stroke-opacity=".7"/><path d="m850 326 22 13-22 13Z" fill="#f7f7fc"/>'
    over += rect(578,497,447,55,fill='#11101b',stroke='#89829b',radius=0,opacity='.12')
    over += '<path d="m599 513 13 8-13 8Z" fill="#c084fc"/>'
    over += text('Lire la vidéo',628,527,16,'#ece7ff',500)
    over += '<path d="M600 539H1005" stroke="#31273f" stroke-width="3" stroke-linecap="round"/>'
    over += '<circle cx="1090" cy="445" r="19" fill="#080810" fill-opacity=".84" stroke="#c084fc" stroke-opacity=".7"/><path d="m1085 437 13 8-13 8Z" fill="#f7f7fc"/>'
    over += text('Mobile',1054,545,14,'#ece7ff',500)
    over += text('Lecture',1052,567,12,'#aca7bf',500)
    over += text('au choix',1048,585,12,'#aca7bf',500)
    over += '<path d="M1071 608h38" stroke="#89829b" stroke-width="3" stroke-linecap="round"/>'
    return s, images, over, {'x':699,'y':448,'width':225,'height':204}

def maintenance():
    s = window()
    s += text('Routine mensuelle',608,219,25,'#f7f7fc',700,350) + demonstration()
    s += text('Les contrôles à prévoir',608,246,16,'#aca7bf',500)
    rows = [('form','Formulaire de contact','Vérifier le parcours'),('link','Liens importants','Revoir les destinations'),('backup','Sauvegarde','Préparer un essai isolé')]
    for (kind,label,detail), y in zip(rows,(267,347,427)):
        s += rect(608,y,500,65,fill='#15121f',stroke='#89829b',radius=12,opacity='.18')
        s += icon(kind,625,y+19,26)
        s += text(label,666,y+27,20,'#f7f7fc',500,300)
        s += text(detail,666,y+48,14,'#aca7bf',500,300)
        s += rect(1064,y+21,22,22,fill='none',stroke='#c084fc',radius=5,opacity='.65')
    s += text('Noter la prochaine action.',899,538,13,'#aca7bf',500,209)
    return s, [], '', {'x':699,'y':463,'width':225,'height':204}

def redirects():
    s = window()
    s += text('Retrouver la bonne page',608,219,24,'#f7f7fc',700,360) + demonstration()
    s += text('Avant',608,255,15,'#aca7bf',500)
    s += rect(608,269,500,69,fill='#15121f',stroke='#89829b',radius=12,opacity='.2')
    s += text('exemple.test/ancienne-page',628,309,20,'#f7f7fc',500,350)
    s += rect(1028,285,59,36,fill='#231435',stroke='#a855f7',radius=9,opacity='.5')
    s += text('404',1038,309,21,'#c084fc',700)
    s += text('Après correction',608,375,15,'#aca7bf',500)
    s += rect(608,390,184,69,fill='#1b132b',stroke='#a855f7',radius=12,opacity='.38')
    s += text('301',669,422,29,'#c084fc',700)
    s += text('Ancienne URL',634,445,14,'#aca7bf',500)
    s += arrow(810,425,870)
    s += rect(889,390,219,69,fill='#1b132b',stroke='#a855f7',radius=12,opacity='.38')
    s += text('200',969,422,29,'#c084fc',700)
    s += text('/page-utile',956,445,14,'#aca7bf',500)
    s += text('URL fictives',1015,532,14,'#aca7bf',500)
    return s, [], '', {'x':699,'y':463,'width':225,'height':204}

def portal():
    s = window()
    s += '<path d="M713 183V572" stroke="#89829b" stroke-opacity=".16"/>'
    s += icon('folder',598,210,28)
    s += text('Espace',638,223,16,'#f7f7fc',700)
    s += text('projet',638,244,16,'#f7f7fc',700)
    for i,(kind,label) in enumerate([('document','Documents'),('form','Devis'),('check','Validation'),('folder','Livraison')]):
        y=288+i*47
        if i==2:
            s += rect(589,y-21,111,36,fill='#221534',stroke='#a855f7',radius=8,opacity='.35')
        s += icon(kind,601,y-13,18, '#c084fc' if i==2 else '#aca7bf')
        s += text(label,628,y,12,'#c084fc' if i==2 else '#aca7bf',500,68)
    s += text('Projet exemple',737,218,24,'#f7f7fc',700,238) + demonstration(983,197)
    s += text('Documents et validations',737,250,16,'#aca7bf',500,365)
    s += rect(737,275,369,82,fill='#15121f',stroke='#89829b',radius=12,opacity='.2')
    s += icon('document',754,295,27)
    s += text('Proposition-v2.pdf',796,310,20,'#f7f7fc',500,283)
    s += text('Version à relire',796,337,14,'#aca7bf',500)
    s += text('Prochaine étape',738,393,15,'#aca7bf',500)
    s += text('Confirmer la version',738,425,22,'#f7f7fc',700,360)
    s += rect(738,447,232,42,fill='url(#brand)',stroke='#c084fc',radius=10,opacity='.4')
    s += text('Valider le document',758,474,17,'#f7f7fc',700)
    s += text('Exemple entièrement fictif',916,539,13,'#aca7bf',500,190)
    return s, [], '', {'x':582,'y':463,'width':225,'height':204}

def dashboard():
    s = window()
    s += text('Les tâches à suivre',608,219,25,'#f7f7fc',700,350) + demonstration()
    s += rect(608,263,178,190,fill='#1b132b',stroke='#a855f7',radius=15,opacity='.3')
    s += text('3',673,341,70,'url(#heading)',700)
    s += text('tâches à traiter',631,374,18,'#f7f7fc',500)
    s += rect(628,398,138,32,fill='url(#brand)',stroke='#c084fc',radius=8,opacity='.3')
    s += text('Ouvrir la liste',643,420,15,'#f7f7fc',700)
    s += arrow(800,346,836)
    s += text('À traiter',858,280,16,'#c084fc',500)
    for label,y in zip(['Relire le devis','Confirmer la version','Préparer la livraison'],(298,355,412)):
        s += rect(852,y,256,46,fill='#15121f',stroke='#89829b',radius=9,opacity='.2')
        s += rect(867,y+14,17,17,fill='none',stroke='#c084fc',radius=4,opacity='.5')
        s += text(label,898,y+29,16,'#f7f7fc',500,193)
    s += text('Le compteur ouvre la bonne liste.',858,500,14,'#aca7bf',500,250)
    s += text('Données fictives',998,538,13,'#aca7bf',500,110)
    return s, [], '', {'x':699,'y':463,'width':225,'height':204}

ARTICLES = [
    {'number':'037','date':'2026-10-19','title':'Vidéo sur votre site : limiter le poids et préserver le confort sur mobile','badge':'Vidéo sur le web','badge_width':158,'title_lines':['Vidéo sur','votre site'],'subtitle_lines':['Le confort','sur mobile.'],'detail_lines':['L’aperçu avant la lecture.'],'visual':video,'illustration':'Actual public AboutVideo landscape and portrait posters, with illustrative player chrome. No performance measurements.'},
    {'number':'038','date':'2026-10-20','title':'Votre site est en ligne : la checklist mensuelle pour le garder fiable','badge':'Maintenance','badge_width':139,'title_lines':['Votre site','en ligne'],'subtitle_lines':['La routine','qui compte.'],'detail_lines':['Formulaire, liens, sauvegarde.'],'visual':maintenance,'illustration':'Fictitious monthly checklist with unchecked controls; explicitly labeled Démonstration. No actual client verification claimed.'},
    {'number':'039','date':'2026-10-21','title':'Après une refonte : repérer les liens cassés et les mauvaises redirections','badge':'Après la refonte','badge_width':159,'title_lines':['Après la','refonte'],'subtitle_lines':['Liens cassés :','les repérer.'],'detail_lines':['De l’ancienne URL','à la bonne destination.'],'visual':redirects,'illustration':'Illustrative SVG before/after flow with fictitious exemple.test URL, 404, 301 and 200; labeled Démonstration and URL fictives.'},
    {'number':'040','date':'2026-10-22','title':'Devis, documents et validations : quand un espace client devient utile','badge':'Application web','badge_width':163,'title_lines':['Un espace','client'],'subtitle_lines':['Pour suivre','votre projet.'],'detail_lines':['Documents, versions, validations.'],'visual':portal,'illustration':'Entirely fictitious client portal SVG, labeled Démonstration and Exemple entièrement fictif; no client name, address or amount.'},
    {'number':'041','date':'2026-10-23','title':'Un tableau de bord utile : du chiffre à la prochaine action','badge':'Application web','badge_width':163,'title_lines':['Tableau','de bord'],'subtitle_lines':['Du chiffre','à l’action.'],'detail_lines':['Une liste. Une prochaine étape.'],'visual':dashboard,'illustration':'Illustrative SVG showing a count of 3 and exactly 3 fictitious action tasks, labeled Démonstration and Données fictives.'},
]

PROGRAM = r'''
const sharp=require(process.argv[1]),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const spec=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
 const layers=[];
 for(const img of spec.images){
   let raster=await sharp(path.join(spec.assets,img.asset)).resize(img.width,img.height,{fit:'fill'}).png().toBuffer();
   if(img.radius){
     const mask=Buffer.from(`<svg width="${img.width}" height="${img.height}"><rect width="100%" height="100%" rx="${img.radius}" fill="white"/></svg>`);
     raster=await sharp(raster).composite([{input:mask,blend:'dest-in'}]).png().toBuffer();
   }
   layers.push({input:raster,left:img.x,top:img.y});
 }
 if(spec.overlay) layers.push({input:spec.overlay,left:0,top:0});
 const r=spec.robot;
 const robot=await sharp(path.join(spec.assets,'robot-transparent.png')).resize(r.width,r.height).png().toBuffer();
 layers.push({input:robot,left:r.x,top:r.y});
 const info=await sharp(spec.base).composite(layers).png({compressionLevel:9,adaptiveFiltering:true}).toFile(spec.output);
 if(info.width!==1200 || info.height!==675 || info.size>=5000000) throw Error('Invalid editorial cover dimensions or size');
 console.log(JSON.stringify({number:spec.number,width:info.width,height:info.height,bytes:info.size}));
})().catch(err=>{console.error(err);process.exit(1)});
'''

manifest = {
    'schema_version':1,
    'scope':'Five covers 037–041 only; no article or social publication action',
    'status':'approved_brand_cover_batch_prepared',
    'social_drafts_status':'A_VALIDER',
    'palette':{'background':'#080810','gradient':['#7c3aed','#a855f7','#c084fc']},
    'font':{'family':'Space Grotesk','title_weight':700,'small_text_weight':500,'rendering':'FontTools outlines from exact bundled variable font','license':'assets/OFL-SpaceGrotesk.txt'},
    'method':'Original SVG composition adapted from approved PhysioBaur violet-v1 build; real raster assets composited with Sharp, no raster AI generation or paid API.',
    'reference':'seo/covers/propositions/physiobaur-violet-v1/cover-1200x675.png in editorial-20261018 worktree, approved by Antoine',
    'quality_review_record':'seo/covers/brand-violet/review-037-041.json',
    'assets':[],
    'covers':[],
}

review_path = HERE / 'review-037-041.json'
reviews = json.loads(review_path.read_text(encoding='utf-8'))['covers'] if review_path.exists() else {}

for name in IMPORTS:
    item={'path':f'assets/{name}','sha256':hashlib.sha256((ASSETS/name).read_bytes()).hexdigest()}
    if name.startswith('affiche-'):
        item.update({'provenance':f'https://www.antoinequarroz.ch/videos/presentation/{name}', 'kind':'Real public video poster; referenced by app/components/sections/AboutVideo.vue', 'verified_public_on':'2026-10-18','public_hash_matches_local':True})
    elif name=='robot-transparent.png':
        item.update({'provenance':'Existing approved PhysioBaur dark proposal / assets/robot-transparent.png', 'kind':'Original transparent brand robot; copied without alterations'})
    elif name.endswith('.ttf'):
        item.update({'provenance':'Existing approved PhysioBaur assets/fonts/SpaceGrotesk-VariableFont_wght.ttf','kind':'Exact existing brand font'})
    else:
        item.update({'provenance':'Existing font license distributed with Space Grotesk','kind':'SIL Open Font License 1.1'})
    manifest['assets'].append(item)

for meta in ARTICLES:
    visual, images, overlay, robot = meta['visual']()
    stem = 'article-' + meta['number']
    base_path = SOURCES / f'{stem}.base.svg'
    overlay_path = SOURCES / f'{stem}.overlay.svg'
    base_path.write_text(wrap(base(meta)+visual,meta['title']),encoding='utf-8')
    if overlay:
        overlay_path.write_text(wrap(overlay,'Illustrative playback controls'),encoding='utf-8')
    spec = {'number':meta['number'],'assets':str(ASSETS),'base':str(base_path),'overlay':str(overlay_path) if overlay else None,'output':str(ROOT/'seo/covers'/f'{stem}.png'),'images':images,'robot':robot}
    spec_path = SOURCES / f'{stem}.layers.json'
    # Relative layer recipes are portable; only the runtime call uses absolute paths.
    portable={**spec,'assets':'../assets','base':base_path.name,'overlay':overlay_path.name if overlay else None,'output':f'../../{stem}.png'}
    spec_path.write_text(json.dumps(portable,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    runtime_spec = SOURCES / f'.{stem}.runtime.json'
    runtime_spec.write_text(json.dumps(spec,ensure_ascii=False),encoding='utf-8')
    try:
        result=subprocess.run([NODE,'-e',PROGRAM,SHARP,str(runtime_spec)],check=True,capture_output=True,text=True)
    finally:
        runtime_spec.unlink(missing_ok=True)
    print(result.stdout.strip())
    info=json.loads(result.stdout)
    output=Path(spec['output'])
    digest = hashlib.sha256(output.read_bytes()).hexdigest()
    reviewed = reviews.get(meta['number'], {}).get('sha256') == digest
    review = {'status':'passed' if reviewed else 'pending','record':'seo/covers/brand-violet/review-037-041.json','record_matches_sha256':reviewed}
    manifest['covers'].append({'number':meta['number'],'scheduled_article_date':meta['date'],'approved_article_title':meta['title'],'cover_phrase':' '.join(meta['title_lines'])+' / '+' '.join(meta['subtitle_lines']),'path':str(output.relative_to(ROOT)),'dimensions':[info['width'],info['height']],'bytes':info['bytes'],'sha256':digest,'sources':[str(base_path.relative_to(ROOT)),str(spec_path.relative_to(ROOT))]+([str(overlay_path.relative_to(ROOT))] if overlay else []),'visual_provenance':meta['illustration'],'visual_review':review})

(HERE/'manifest-037-041.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Wrote five covers and brand-violet/manifest-037-041.json')
