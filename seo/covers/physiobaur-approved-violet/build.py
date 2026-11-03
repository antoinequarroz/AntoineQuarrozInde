from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
import base64, json, hashlib, subprocess, os
from xml.sax.saxutils import escape

out=Path(__file__).resolve().parent
assets=out/'assets'

fonts={}
for weight in [500,700]:
    f=instantiateVariableFont(TTFont(assets/'SpaceGrotesk-VariableFont_wght.ttf'),{'wght':weight},inplace=False)
    fonts[weight]=f

def text(value,x,y,size,fill='#f7f7fc',weight=700,maxwidth=None):
    f=fonts[weight]; scale=size/f['head'].unitsPerEm; cmap=f.getBestCmap(); gs=f.getGlyphSet()
    widths=[f['hmtx'][cmap[ord(ch)]][0] for ch in value]
    if maxwidth and sum(widths)*scale>maxwidth:
        scale=maxwidth/sum(widths)
    pen=SVGPathPen(gs);pos=0
    for ch,w in zip(value,widths):
        gs[cmap[ord(ch)]].draw(TransformPen(pen,(1,0,0,1,pos,0)))
        pos+=w
    return f'<g aria-label="{escape(value)}" fill="{fill}" transform="translate({x} {y}) scale({scale} {-scale})"><path d="{pen.getCommands()}"/></g>'

def image(name,x,y,w,h,extra=''):
    data=base64.b64encode((assets/name).read_bytes()).decode()
    return f'<image href="data:image/png;base64,{data}" x="{x}" y="{y}" width="{w}" height="{h}" {extra}/>'

svg='''<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
<title>PhysioBaur : un site pensé pour ses patients — proposition de couverture dans la charte Antoine Quarroz</title>
<defs>
<linearGradient id="brand" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#7c3aed"/><stop offset=".5" stop-color="#a855f7"/><stop offset="1" stop-color="#c084fc"/></linearGradient>
<linearGradient id="heading" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#7c3aed"/><stop offset=".5" stop-color="#a855f7"/><stop offset="1" stop-color="#c084fc"/></linearGradient>
<radialGradient id="aura"><stop stop-color="#7c3aed" stop-opacity=".28"/><stop offset="1" stop-color="#7c3aed" stop-opacity="0"/></radialGradient>
<pattern id="dots" width="34" height="34" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".7" fill="white" opacity=".045"/></pattern>
<filter id="shadow" x="-25%" y="-25%" width="150%" height="170%"><feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#000" flood-opacity=".6"/></filter>
<clipPath id="desktopClip"><rect x="578" y="182" width="560" height="389" rx="0"/></clipPath>
<clipPath id="phoneClip"><rect x="1034" y="372" width="112" height="242.4" rx="14"/></clipPath>
</defs>
<rect width="1200" height="675" fill="#080810"/>
<ellipse cx="937" cy="362" rx="533" ry="420" fill="url(#aura)"/>
<rect width="1200" height="675" fill="url(#dots)"/>
<rect x="64" y="49" width="46" height="46" rx="13" fill="url(#brand)"/>
'''
svg+=text('AQ',74,79,22)
svg+=text('Antoine Quarroz',124,80,20,'#ece7ff',500)
svg+='<rect x="64" y="139" width="161" height="31" rx="15.5" fill="#7c3aed" fill-opacity=".12" stroke="#8b5cf6" stroke-opacity=".3"/>'
svg+=text('Retour de projet',79,160,15,'#c4b5fd',500)
svg+=text('PhysioBaur',61,245,75,'url(#heading)',700,497)
svg+=text('Un site pensé',63,327,57,'#f7f7fc',700,495)
svg+=text('pour ses patients.',63,392,57,'url(#heading)',700,495)
svg+=text('Du premier clic',65,457,24,'#aca7bf',500)
svg+=text('au contact.',65,491,24,'#aca7bf',500)
svg+='<g filter="url(#shadow)"><rect x="576" y="150" width="564" height="423" rx="20" fill="#11101b" stroke="#89829b" stroke-opacity=".38"/>'
svg+='<circle cx="594" cy="167" r="3" fill="#6e677f"/><circle cx="606" cy="167" r="3" fill="#6e677f"/><circle cx="618" cy="167" r="3" fill="#6e677f"/>'
svg+=text('physiobaur.ch',810,172,12,'#aaa3be',500)
svg+='<g clip-path="url(#desktopClip)">'+image('desktop-dark.png',578,182,560,389)+'</g>'
svg+='</g>'
svg+='<g filter="url(#shadow)"><rect x="1027" y="364" width="126" height="258" rx="22" fill="#17141f" stroke="#a79abf" stroke-opacity=".6"/>'
svg+='<g clip-path="url(#phoneClip)">'+image('mobile-dark.png',1034,372,112,242.4)+'</g>'
svg+='</g>'
svg+=image('robot-transparent.png',699,448,225,204.3)
svg+=text('antoinequarroz.ch',65,614,18,'#c4b5fd',500)
svg+='</svg>'
(out/'cover.svg').write_text(svg)
node=os.environ.get('COVER_NODE','/Users/antoinequarroz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node')
sharp=os.environ.get('COVER_SHARP','/Users/antoinequarroz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp')
program="""const sharp=require(process.argv[1]),path=require('node:path');
(async()=>{ const folder=process.argv[4];
const desktop=await sharp(path.join(folder,'desktop-dark.png')).resize(560,389).png().toBuffer();
const phone=await sharp(path.join(folder,'mobile-dark.png')).resize(112,243).png().toBuffer();
const robot=await sharp(path.join(folder,'robot-transparent.png')).resize(225,204).png().toBuffer();
const x=await sharp(process.argv[2]).composite([{input:desktop,left:578,top:182},{input:phone,left:1034,top:372},{input:robot,left:699,top:448}]).png().toFile(process.argv[3]);
console.log(JSON.stringify({width:x.width,height:x.height,size:x.size})); })().catch(()=>process.exit(1));"""
subprocess.run([node,'-e',program,sharp,str(out/'cover.svg'),str(out/'cover-1200x675.png'),str(assets)],check=True)
actual=hashlib.sha256((out/'cover-1200x675.png').read_bytes()).hexdigest()
expected=json.loads((out/'manifest.json').read_text())['sha256']
if actual != expected:
    raise RuntimeError('Rebuilt image differs from the approved cover; review before use')
print(str(out/'cover-1200x675.png'))
