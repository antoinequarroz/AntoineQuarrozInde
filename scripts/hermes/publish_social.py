#!/usr/bin/env python3
"""Publish approved social drafts locally or from the site's secure queue."""

from __future__ import annotations

import argparse
import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import struct
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path
from zoneinfo import ZoneInfo


LINKEDIN_POSTS_ENDPOINT = "https://api.linkedin.com/rest/posts"
LINKEDIN_IMAGES_ENDPOINT = "https://api.linkedin.com/rest/images?action=initializeUpload"
LINKEDIN_DOCUMENTS_ENDPOINT = "https://api.linkedin.com/rest/documents?action=initializeUpload"
X_POSTS_ENDPOINT = "https://api.x.com/2/tweets"
X_MEDIA_ENDPOINT = "https://api.x.com/2/media/upload"
X_MEDIA_METADATA_ENDPOINT = "https://api.x.com/2/media/metadata"
CANONICAL_SITE_HOME = "https://www.antoinequarroz.ch/"
CANONICAL_ARTICLE_PREFIX = f"{CANONICAL_SITE_HOME}blog/"
CANONICAL_RESOURCE_PREFIX = f"{CANONICAL_SITE_HOME}ressources/"
CANONICAL_PROJECT_PREFIX = f"{CANONICAL_SITE_HOME}projets/"
CANONICAL_SOCIAL_PREFIX = f"{CANONICAL_SITE_HOME}social/"
ALLOWED_DRAFT_ROOT = Path("seo/social/a-valider")
RECEIPT_ROOT = Path("seo/social/receipts")
LINKEDIN_VERSION = "202606"
X_POST_WITH_URL_ESTIMATED_USD = 0.20
DEFAULT_SITE_URL = "https://www.antoinequarroz.ch"
MAX_ARTICLE_HTML_BYTES = 2 * 1024 * 1024
MAX_SOCIAL_IMAGE_BYTES = 10 * 1024 * 1024
MAX_SOCIAL_DOCUMENT_BYTES = 25 * 1024 * 1024
LINKEDIN_SEQUENCE_PREFIX = re.compile(
    r"^\s*(?:post\s+)?(?:#|n[°o]\s*)?\d+\s*[.):-]\s+", re.IGNORECASE
)
SOCIAL_IMAGE_HOSTS = {
    "www.antoinequarroz.ch",
    "antoinequarroz.ch",
    "oxlrljszatejqxhclmbu.supabase.co",
}


class NoRedirect(urllib.request.HTTPRedirectHandler):
    """Never forward private headers or an upload body to a redirect target."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def secure_open(request, *, timeout=60):
    return urllib.request.build_opener(NoRedirect()).open(request, timeout=timeout)


def approval_fingerprint(post: dict) -> str:
    """Match the database's length-prefixed UTF-8 approval protocol."""
    images = post.get("media_images") or []
    values = [post.get(key) or "" for key in (
        "organization_id", "id", "platform", "content", "article_url",
        "media_kind", "media_url", "media_title",
    )] + [str(post.get("approved_version", "")), str(len(images))]
    for image in images:
        values.extend([image.get("url", ""), image.get("alt", "")])
    encoded = b"".join(str(len(value.encode("utf-8"))).encode() + b":" + value.encode("utf-8") for value in values)
    return hashlib.sha256(encoded).hexdigest()


def verified_approval(post: dict) -> bool:
    fingerprint = post.get("approval_fingerprint")
    try:
        return (
            post.get("publication_mode") == "automatic"
            and type(post.get("approved_version")) is int and post["approved_version"] > 0
            and isinstance(fingerprint, str)
            and re.fullmatch(r"[a-f0-9]{64}", fingerprint) is not None
            and hmac.compare_digest(fingerprint, approval_fingerprint(post))
        )
    except (AttributeError, TypeError, ValueError):
        return False


class SocialMetaParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.values: dict[str, str] = {}

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "meta":
            return
        attributes = {key.lower(): value for key, value in attrs if value is not None}
        key = attributes.get("property") or attributes.get("name")
        content = attributes.get("content")
        if key and content:
            self.values.setdefault(key.lower(), content.strip())


def parse_draft(path: Path) -> dict[str, str]:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        raise ValueError("Le brouillon doit commencer par un front matter Markdown.")
    try:
        raw_meta, body = text[4:].split("\n---\n", 1)
    except ValueError as exc:
        raise ValueError("Le front matter Markdown n'est pas ferme.") from exc

    metadata: dict[str, str] = {}
    for line in raw_meta.splitlines():
        if not line.strip():
            continue
        key, separator, value = line.partition(":")
        if not separator:
            raise ValueError(f"Metadonnee invalide: {line}")
        metadata[key.strip().lower()] = value.strip().strip('"').strip("'")

    platform = metadata.get("platform", "").lower()
    if "media_images" in metadata or metadata.get("media_kind", "").lower() in {"image", "carousel"}:
        raise ValueError("Les images et carrousels doivent etre valides dans la file du site, avec leur revision exacte.")
    status = (metadata.get("status") or metadata.get("statut") or "").upper()
    article_url = metadata.get("article_url") or metadata.get("url_article") or ""
    content = body.strip()
    return {
        "platform": platform,
        "status": status,
        "article_url": article_url,
        "article_title": metadata.get("article_title") or metadata.get("titre") or "",
        "media_kind": metadata.get("media_kind", "").lower(),
        "media_url": metadata.get("media_url", ""),
        "media_title": metadata.get("media_title", ""),
        "content": content,
    }


def clean_linkedin_content(content: str) -> str:
    """Remove an article sequence number that must stay out of LinkedIn copy."""
    return LINKEDIN_SEQUENCE_PREFIX.sub("", content, count=1).lstrip()


def tracked_article_url(article_url: str, platform: str, *, placement: str = "post") -> str:
    """Build one canonical campaign URL without stacking old UTM parameters."""
    parsed = urllib.parse.urlparse(article_url)
    query = [(key, value) for key, value in urllib.parse.parse_qsl(parsed.query, keep_blank_values=True)
             if not key.lower().startswith("utm_")]
    slug = parsed.path.rstrip("/").split("/")[-1] or "accueil"
    source = {"linkedin": "linkedin", "x": "x", "instagram": "instagram", "lumail": "lumail"}.get(platform)
    if not source:
        raise ValueError("Source de campagne inconnue.")
    medium = "email" if platform == "lumail" else "social"
    query.extend([
        ("utm_source", source), ("utm_medium", medium),
        ("utm_campaign", f"article_{slug}"), ("utm_content", placement),
    ])
    return urllib.parse.urlunparse(parsed._replace(query=urllib.parse.urlencode(query)))


def tracked_social_content(content: str, article_url: str, platform: str) -> str:
    return content.replace(article_url, tracked_article_url(article_url, platform))


def inside_local_publication_hour(hour: int | None, timezone: str) -> bool:
    if hour is None:
        return True
    if not 0 <= hour <= 23:
        raise ValueError("L'heure locale de publication doit etre comprise entre 0 et 23.")
    return datetime.now(ZoneInfo(timezone)).hour == hour


def validate_draft(path: Path, project: Path) -> dict[str, str]:
    allowed_root = (project / ALLOWED_DRAFT_ROOT).resolve()
    resolved_path = path.resolve()
    if resolved_path.parent != allowed_root:
        raise ValueError(f"Le brouillon doit etre directement dans {ALLOWED_DRAFT_ROOT}.")

    draft = parse_draft(resolved_path)
    if draft["platform"] not in {"linkedin", "x"}:
        raise ValueError("Plateforme autorisee: linkedin ou x.")
    if draft["status"] != "APPROUVE":
        raise ValueError("Publication refusee: le statut doit etre exactement APPROUVE.")
    if (
        draft["article_url"] != CANONICAL_SITE_HOME
        and not draft["article_url"].startswith(CANONICAL_ARTICLE_PREFIX)
        and not draft["article_url"].startswith(CANONICAL_RESOURCE_PREFIX)
        and not draft["article_url"].startswith(CANONICAL_PROJECT_PREFIX)
    ):
        raise ValueError("L'URL doit etre l'accueil, un article ou une ressource du site canonique.")
    if draft["article_url"] not in draft["content"]:
        raise ValueError("Le texte public doit contenir l'URL de l'article approuve.")
    if draft["platform"] == "x" and len(draft["content"]) > 280:
        raise ValueError("Le brouillon X depasse 280 caracteres.")
    if draft["platform"] == "linkedin":
        draft["content"] = clean_linkedin_content(draft["content"])
        media_values = (draft["media_kind"], draft["media_url"], draft["media_title"])
        if any(media_values):
            if not all(media_values):
                raise ValueError("Le document LinkedIn doit avoir un type, une URL et un titre.")
            if draft["media_kind"] != "document":
                raise ValueError("Seul un document PDF LinkedIn est pris en charge.")
            if not draft["media_url"].startswith(CANONICAL_SOCIAL_PREFIX) or not draft["media_url"].lower().endswith(".pdf"):
                raise ValueError("Le document LinkedIn doit etre un PDF public du dossier /social/.")
    elif any(draft[key] for key in ("media_kind", "media_url", "media_title")):
        raise ValueError("Un media X doit etre valide dans la file du site avant publication.")
    if not draft["content"]:
        raise ValueError("Le brouillon est vide.")
    return draft


def request_json(url: str, payload: dict, headers: dict[str, str]) -> tuple[dict, dict[str, str]]:
    request = urllib.request.Request(
        url,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json", **headers},
        method="POST",
    )
    try:
        with secure_open(request, timeout=60) as response:
            response_body = read_bounded_response(response, 2_000_000, "La reponse de publication").decode("utf-8", errors="replace")
            parsed = json.loads(response_body) if response_body else {}
            return parsed, dict(response.headers.items())
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f"Publication refusee par la plateforme ({exc.code}). Verifier le compte et ses permissions.") from exc


def read_bounded_response(response, maximum: int, label: str) -> bytes:
    declared = response.headers.get("Content-Length")
    if declared and int(declared) > maximum:
        raise RuntimeError(f"{label} depasse la taille autorisee.")
    data = response.read(maximum + 1)
    if len(data) > maximum:
        raise RuntimeError(f"{label} depasse la taille autorisee.")
    return data


def approved_image_url(value: str) -> str:
    parsed = urllib.parse.urlsplit(value)
    decoded = urllib.parse.unquote(parsed.path)
    storage_host = urllib.parse.urlsplit(os.environ.get("NUXT_PUBLIC_SUPABASE_URL", os.environ.get("SUPABASE_URL", "https://oxlrljszatejqxhclmbu.supabase.co"))).hostname
    official = parsed.hostname in {"www.antoinequarroz.ch", "antoinequarroz.ch"} and decoded.startswith("/social/")
    storage = parsed.hostname == storage_host and decoded.startswith("/storage/v1/object/public/media/uploads/")
    if (parsed.scheme != "https" or parsed.username or parsed.password or parsed.port not in (None, 443)
            or parsed.query or parsed.fragment or not (official or storage)
            or any(part in (".", "..") for part in decoded.split("/")) or "\\" in decoded
            or not re.search(r"\.(?:jpe?g|png)$", decoded, re.I)):
        raise ValueError("Image refusee : utiliser un fichier JPEG/PNG du site ou de son stockage media approuve.")
    return value


def image_dimensions(data: bytes, mime: str) -> tuple[int, int]:
    if mime == "image/png" and data[:8] == b"\x89PNG\r\n\x1a\n" and data[12:16] == b"IHDR" and len(data) >= 24:
        return struct.unpack(">II", data[16:24])
    if mime == "image/jpeg" and data[:2] == b"\xff\xd8":
        offset = 2
        while offset + 4 <= len(data):
            if data[offset] != 0xff:
                break
            while offset < len(data) and data[offset] == 0xff:
                offset += 1
            if offset >= len(data):
                break
            marker = data[offset]; offset += 1
            if marker in (0xd8, 0x01) or 0xd0 <= marker <= 0xd7:
                continue
            if marker in (0xd9, 0xda) or offset + 2 > len(data):
                break
            length = struct.unpack(">H", data[offset:offset + 2])[0]
            if length < 2 or offset + length > len(data):
                break
            if marker in (0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf) and length >= 7:
                height, width = struct.unpack(">HH", data[offset + 3:offset + 7])
                return width, height
            offset += length
    raise ValueError("Image refusee : en-tete ou dimensions JPEG/PNG invalides.")


def prepare_images(post: dict) -> list[dict]:
    """Read and validate all approved bytes before claiming or uploading anything."""
    images = post.get("media_images") or []
    platform = post.get("platform")
    limit = {"linkedin": 20, "x": 4, "instagram": 10}.get(platform, 0)
    if not isinstance(images, list) or not 1 <= len(images) <= limit:
        raise ValueError(f"Nombre d'images incompatible avec {platform} (maximum {limit}).")
    if (post.get("media_kind") not in (None, "", "image", "carousel")
            or (post.get("media_kind") == "image" and len(images) != 1)
            or (post.get("media_kind") == "carousel" and len(images) < 2)):
        raise ValueError("Le type du media ne correspond pas aux images approuvees.")
    prepared = []
    for image in images:
        if not isinstance(image, dict) or not isinstance(image.get("url"), str) or not isinstance(image.get("alt"), str):
            raise ValueError("Description d'image invalide.")
        url = approved_image_url(image["url"])
        if not image["alt"].strip() or len(image["alt"]) > 500:
            raise ValueError("La description de l'image est absente ou trop longue pour ce reseau.")
        maximum = {"x": 5, "instagram": 8, "linkedin": 10}[platform] * 1024 * 1024
        request = urllib.request.Request(url, headers={"User-Agent": "hermes-antoinequarroz/1.0"})
        try:
            with secure_open(request, timeout=60) as response:
                mime = response.headers.get_content_type()
                if mime not in {"image/jpeg", "image/png"} or (platform == "instagram" and mime != "image/jpeg"):
                    raise ValueError("Format image incompatible : Instagram exige un JPEG, les autres reseaux un JPEG ou PNG.")
                data = read_bounded_response(response, maximum, "L'image approuvee")
        except urllib.error.HTTPError as exc:
            raise ValueError(f"Image approuvee indisponible ({exc.code}).") from exc
        width, height = image_dimensions(data, mime)
        if min(width, height) < 1 or width * height > 36_000_000:
            raise ValueError("Dimensions d'image incompatibles (maximum 36 megapixels).")
        if platform == "instagram" and not (320 <= width <= 1440 and 0.8 <= width / height <= 1.91):
            raise ValueError("Image Instagram incompatible : largeur 320–1440 px, ratio entre 4:5 et 1,91:1.")
        if platform == "x" and max(width, height) > 8192:
            raise ValueError("Image X incompatible : dimension maximale de 8192 px.")
        prepared.append({**image, "data": data, "mime": mime, "width": width, "height": height})
    return prepared


def article_social_image(article_url: str) -> tuple[bytes, str, str]:
    request = urllib.request.Request(article_url, headers={"User-Agent": "hermes-antoinequarroz/1.0"})
    try:
        with secure_open(request, timeout=30) as response:
            if urllib.parse.urlparse(response.geturl()).hostname not in {"www.antoinequarroz.ch", "antoinequarroz.ch"}:
                raise RuntimeError("La page article a redirige hors du site officiel.")
            html = read_bounded_response(response, MAX_ARTICLE_HTML_BYTES, "La page article").decode(
                "utf-8", errors="replace"
            )
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f"Image sociale introuvable: article indisponible ({exc.code}).") from exc

    parser = SocialMetaParser()
    parser.feed(html)
    image_url = urllib.parse.urljoin(article_url, parser.values.get("og:image", ""))
    parsed = urllib.parse.urlparse(image_url)
    if parsed.scheme != "https" or parsed.hostname not in SOCIAL_IMAGE_HOSTS:
        raise RuntimeError("Image sociale refusee: og:image HTTPS ou hote non autorise.")

    image_request = urllib.request.Request(image_url, headers={"User-Agent": "hermes-antoinequarroz/1.0"})
    try:
        with secure_open(image_request, timeout=60) as response:
            mime_type = response.headers.get_content_type()
            if mime_type not in {"image/jpeg", "image/png", "image/gif"}:
                raise RuntimeError("Image sociale refusee: format non pris en charge.")
            image = read_bounded_response(response, MAX_SOCIAL_IMAGE_BYTES, "L'image sociale")
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f"Image sociale indisponible ({exc.code}).") from exc
    return image, mime_type, image_url


def upload_linkedin_image(token: str, author: str, image: bytes, mime_type: str) -> str:
    initialized, _ = request_json(
        LINKEDIN_IMAGES_ENDPOINT,
        {"initializeUploadRequest": {"owner": author}},
        {
            "Authorization": f"Bearer {token}",
            "X-Restli-Protocol-Version": "2.0.0",
            "Linkedin-Version": LINKEDIN_VERSION,
        },
    )
    value = initialized.get("value", {})
    upload_url = value.get("uploadUrl")
    image_urn = value.get("image")
    if not valid_linkedin_upload_url(upload_url):
        raise RuntimeError("LinkedIn n'a pas fourni d'URL d'envoi d'image valide.")
    if not isinstance(image_urn, str) or not image_urn.startswith("urn:li:image:"):
        raise RuntimeError("LinkedIn n'a pas fourni d'identifiant d'image valide.")

    request = urllib.request.Request(
        upload_url,
        data=image,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": mime_type,
            "User-Agent": "hermes-antoinequarroz/1.0",
        },
        method="PUT",
    )
    try:
        with secure_open(request, timeout=90) as response:
            if response.status not in {200, 201}:
                raise RuntimeError(f"Envoi de l'image LinkedIn refuse ({response.status}).")
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f"Envoi de l'image LinkedIn refuse ({exc.code}).") from exc
    return image_urn


def valid_linkedin_upload_url(value) -> bool:
    if not isinstance(value, str):
        return False
    parsed = urllib.parse.urlsplit(value)
    host = parsed.hostname or ""
    return (parsed.scheme == "https" and not parsed.username and not parsed.password and parsed.port in (None, 443)
            and (host == "linkedin.com" or host.endswith(".linkedin.com") or host.endswith(".licdn.com")))


def social_document(document_url: str) -> bytes:
    parsed = urllib.parse.urlparse(document_url)
    if (
        parsed.scheme != "https"
        or parsed.hostname not in {"www.antoinequarroz.ch", "antoinequarroz.ch"}
        or not parsed.path.startswith("/social/")
        or not parsed.path.lower().endswith(".pdf")
    ):
        raise RuntimeError("Document LinkedIn refuse: seul un PDF public du dossier /social/ est autorise.")
    request = urllib.request.Request(document_url, headers={"User-Agent": "hermes-antoinequarroz/1.0"})
    try:
        with secure_open(request, timeout=60) as response:
            final = urllib.parse.urlparse(response.geturl())
            if final.hostname not in {"www.antoinequarroz.ch", "antoinequarroz.ch"}:
                raise RuntimeError("Le document LinkedIn a redirige hors du site officiel.")
            if response.headers.get_content_type() != "application/pdf":
                raise RuntimeError("Document LinkedIn refuse: le fichier public n'est pas un PDF.")
            return read_bounded_response(response, MAX_SOCIAL_DOCUMENT_BYTES, "Le document LinkedIn")
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f"Document LinkedIn indisponible ({exc.code}).") from exc


def upload_linkedin_document(token: str, author: str, document: bytes) -> str:
    initialized, _ = request_json(
        LINKEDIN_DOCUMENTS_ENDPOINT,
        {"initializeUploadRequest": {"owner": author}},
        {
            "Authorization": f"Bearer {token}",
            "X-Restli-Protocol-Version": "2.0.0",
            "Linkedin-Version": LINKEDIN_VERSION,
        },
    )
    value = initialized.get("value", {})
    upload_url = value.get("uploadUrl")
    document_urn = value.get("document")
    if not valid_linkedin_upload_url(upload_url):
        raise RuntimeError("LinkedIn n'a pas fourni d'URL d'envoi de document valide.")
    if not isinstance(document_urn, str) or not document_urn.startswith("urn:li:document:"):
        raise RuntimeError("LinkedIn n'a pas fourni d'identifiant de document valide.")

    request = urllib.request.Request(
        upload_url,
        data=document,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/pdf",
            "User-Agent": "hermes-antoinequarroz/1.0",
        },
        method="PUT",
    )
    try:
        with secure_open(request, timeout=120) as response:
            if response.status not in {200, 201}:
                raise RuntimeError(f"Envoi du document LinkedIn refuse ({response.status}).")
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f"Envoi du document LinkedIn refuse ({exc.code}).") from exc
    wait_for_linkedin_document(token, document_urn)
    return document_urn


def linkedin_document_status(token: str, document_urn: str) -> str:
    url = f"https://api.linkedin.com/rest/documents/{urllib.parse.quote(document_urn, safe=':')}"
    request = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "X-Restli-Protocol-Version": "2.0.0",
            "Linkedin-Version": LINKEDIN_VERSION,
            "User-Agent": "hermes-antoinequarroz/1.0",
        },
    )
    try:
        with secure_open(request, timeout=60) as response:
            body = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f"Verification du document LinkedIn refusee ({exc.code}).") from exc
    return str(body.get("status") or "")


def wait_for_linkedin_document(token: str, document_urn: str, *, attempts: int = 30, interval: float = 2.0) -> None:
    """Wait until LinkedIn has rendered the PDF before creating the public post."""
    for attempt in range(attempts):
        status = linkedin_document_status(token, document_urn)
        if status == "AVAILABLE":
            return
        if status == "PROCESSING_FAILED":
            raise RuntimeError("LinkedIn n'a pas pu traiter le PDF du carrousel.")
        if status not in {"WAITING_UPLOAD", "PROCESSING"}:
            raise RuntimeError(f"Etat inattendu du document LinkedIn: {status or 'absent'}.")
        if attempt + 1 < attempts:
            time.sleep(interval)
    raise RuntimeError("Le PDF LinkedIn est toujours en traitement apres 60 secondes; aucune publication n'a ete creee.")


def site_request(site_url: str, token: str, *, payload: dict | None = None, path: str = "social-publications") -> dict:
    url = f"{site_url.rstrip('/')}/api/hermes/{path}"
    request = urllib.request.Request(
        url,
        data=None if payload is None else json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Authorization": f"Bearer {token}", "User-Agent": "hermes-antoinequarroz/1.0",
                 **({"Content-Type": "application/json"} if payload is not None else {})},
        method="POST" if payload is not None else "GET",
    )
    try:
        with secure_open(request, timeout=60) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f"File sociale indisponible ({exc.code}).") from exc


def clean_social_title(title: str) -> str:
    return re.sub(r"^\s*\d+\.\s*", "", title).strip() or "Illustration de l'article"


def publish_linkedin(
    content: str,
    article_url: str,
    article_title: str,
    media_kind: str = "",
    media_url: str = "",
    media_title: str = "",
    media_images: list[dict] | None = None,
) -> dict:
    token = os.environ.get("LINKEDIN_ACCESS_TOKEN", "").strip()
    author = os.environ.get("LINKEDIN_PERSON_URN", "").strip()
    if not token or not re.fullmatch(r"urn:li:person:[A-Za-z0-9_-]+", author):
        raise RuntimeError("LINKEDIN_ACCESS_TOKEN ou LINKEDIN_PERSON_URN absent/invalide.")
    media: dict[str, str]
    result_media: dict[str, str]
    if media_images:
        uploaded = []
        for image in media_images:
            image_urn = upload_linkedin_image(token, author, image["data"], image["mime"])
            uploaded.append({"id": image_urn, "altText": image["alt"]})
        post_content = {"media": uploaded[0]} if len(uploaded) == 1 else {"multiImage": {"images": uploaded}}
        result_media = {"images": [item["id"] for item in uploaded]}
    elif media_kind == "document":
        document = social_document(media_url)
        document_urn = upload_linkedin_document(token, author, document)
        media = {"title": media_title[:200], "id": document_urn}
        result_media = {"document": document_urn, "documentSource": media_url}
        post_content = {"media": media}
    else:
        image, mime_type, image_url = article_social_image(article_url)
        image_urn = upload_linkedin_image(token, author, image, mime_type)
        media = {"altText": clean_social_title(article_title)[:300], "id": image_urn}
        result_media = {"image": image_urn, "imageSource": image_url}
        post_content = {"media": media}
    payload = {
        "author": author,
        "commentary": content,
        "visibility": "PUBLIC",
        "distribution": {
            "feedDistribution": "MAIN_FEED",
            "targetEntities": [],
            "thirdPartyDistributionChannels": [],
        },
        "content": post_content,
        "lifecycleState": "PUBLISHED",
        "isReshareDisabledByAuthor": False,
    }
    body, headers = request_json(
        LINKEDIN_POSTS_ENDPOINT,
        payload,
        {
            "Authorization": f"Bearer {token}",
            "X-Restli-Protocol-Version": "2.0.0",
            "Linkedin-Version": LINKEDIN_VERSION,
            "User-Agent": "hermes-antoinequarroz/1.0",
        },
    )
    return {
        "id": {key.lower(): value for key, value in headers.items()}.get("x-restli-id") or body.get("id"),
        "response": body,
        **result_media,
    }


def oauth1_quote(value: str) -> str:
    return urllib.parse.quote(value, safe="~-._")


def oauth1_authorization_header(
    method: str,
    url: str,
    consumer_key: str,
    consumer_secret: str,
    access_token: str,
    access_token_secret: str,
    *,
    nonce: str | None = None,
    timestamp: str | None = None,
) -> str:
    params = {
        "oauth_consumer_key": consumer_key,
        "oauth_nonce": nonce or secrets.token_hex(16),
        "oauth_signature_method": "HMAC-SHA1",
        "oauth_timestamp": timestamp or str(int(time.time())),
        "oauth_token": access_token,
        "oauth_version": "1.0",
    }
    normalized = "&".join(
        f"{oauth1_quote(key)}={oauth1_quote(value)}"
        for key, value in sorted(params.items())
    )
    signature_base = "&".join(
        oauth1_quote(part) for part in (method.upper(), url, normalized)
    )
    signing_key = f"{oauth1_quote(consumer_secret)}&{oauth1_quote(access_token_secret)}"
    signature = base64.b64encode(
        hmac.new(signing_key.encode(), signature_base.encode(), hashlib.sha1).digest()
    ).decode()
    params["oauth_signature"] = signature
    return "OAuth " + ", ".join(
        f'{oauth1_quote(key)}="{oauth1_quote(value)}"'
        for key, value in sorted(params.items())
    )


def x_credentials() -> dict:
    allowed_cost = float(os.environ.get("HERMES_X_MAX_USD_PER_POST", "0") or "0")
    if allowed_cost < X_POST_WITH_URL_ESTIMATED_USD:
        raise RuntimeError(
            "Publication X bloquee par le plafond de cout. "
            f"Minimum requis: {X_POST_WITH_URL_ESTIMATED_USD:.2f} USD par post avec URL."
        )
    credentials = {
        "consumer_key": os.environ.get("X_API_KEY", "").strip(),
        "consumer_secret": os.environ.get("X_API_SECRET", "").strip(),
        "access_token": os.environ.get("X_ACCESS_TOKEN", "").strip(),
        "access_token_secret": os.environ.get("X_ACCESS_TOKEN_SECRET", "").strip(),
    }
    missing = [name for name, value in credentials.items() if not value]
    if missing:
        raise RuntimeError(f"Identifiants X OAuth 1.0a absents: {', '.join(missing)}.")
    return credentials


def x_authorization(method: str, url: str, credentials: dict) -> str:
    return oauth1_authorization_header(method, url, **credentials)


def upload_x_image(image: dict, credentials: dict) -> str:
    # The official v2 image endpoint accepts OAuth1 user context and JSON base64.
    result, _ = request_json(X_MEDIA_ENDPOINT, {
        "media": base64.b64encode(image["data"]).decode("ascii"),
        "media_category": "tweet_image", "media_type": image["mime"],
    }, {
        "Authorization": x_authorization("POST", X_MEDIA_ENDPOINT, credentials),
        "User-Agent": "hermes-antoinequarroz/1.0",
    })
    media_id = (result.get("data") or {}).get("id")
    if not isinstance(media_id, str) or not re.fullmatch(r"[0-9]{1,30}", media_id):
        raise RuntimeError("X ne confirme pas l'identifiant de l'image.")
    request_json(X_MEDIA_METADATA_ENDPOINT, {"id": media_id, "metadata": {"alt_text": {"text": image["alt"]}}}, {
        "Authorization": x_authorization("POST", X_MEDIA_METADATA_ENDPOINT, credentials),
        "User-Agent": "hermes-antoinequarroz/1.0",
    })
    return media_id


def publish_x(content: str, media_images: list[dict] | None = None) -> dict:
    credentials = x_credentials()
    media_ids = [upload_x_image(image, credentials) for image in media_images or []]
    authorization = oauth1_authorization_header(
        "POST",
        X_POSTS_ENDPOINT,
        credentials["consumer_key"],
        credentials["consumer_secret"],
        credentials["access_token"],
        credentials["access_token_secret"],
    )
    body, _ = request_json(
        X_POSTS_ENDPOINT,
        {"text": content, **({"media": {"media_ids": media_ids}} if media_ids else {})},
        {
            "Authorization": authorization,
            "User-Agent": "hermes-antoinequarroz/1.0",
        },
    )
    return {"id": body.get("data", {}).get("id"), "response": body}


INSTAGRAM_EXPECTED_USER = "antoinequarroz.dev"
INSTAGRAM_EXPECTED_ID = "17841434338571820"
INSTAGRAM_TOOL = "instagram-antoinequarroz"
INSTAGRAM_SCOPES = {"instagram_business_basic", "instagram_business_manage_insights", "instagram_business_content_publish"}


def treg_request(path: str, payload: dict | None = None) -> tuple[int, dict, object]:
    # Fixed proxy origin: a provider URL or paging URL is never accepted here.
    if not re.fullmatch(r"/(?:connections|tools|calls/[a-f0-9]{32}|call/instagram-antoinequarroz/(?:me|[0-9]{1,30}(?:/(?:media|media_publish))?)(?:\?[^\r\n]*)?)", path):
        raise ValueError("Route Instagram non autorisee.")
    if payload is not None and path not in {
        f"/call/{INSTAGRAM_TOOL}/{INSTAGRAM_EXPECTED_ID}/media",
        f"/call/{INSTAGRAM_TOOL}/{INSTAGRAM_EXPECTED_ID}/media_publish",
    }:
        raise ValueError("Ecriture Instagram refusee hors du compte approuve.")
    token, org = os.environ.get("TREG_TOKEN", ""), os.environ.get("TREG_ORG", "")
    if not token:
        runtime_config = Path("/data/treg-readonly/private/connection.json")
        default_config = runtime_config if runtime_config.is_file() else Path.home() / ".treg/config.json"
        config = Path(os.environ.get("TREG_CONFIG", str(default_config)))
        try:
            value = json.loads(config.read_text())
            token, org = value.get("token", ""), value.get("active_org", "")
        except (OSError, ValueError):
            pass
    if not isinstance(token, str) or not isinstance(org, str) or not token or any(char in token + org for char in "\r\n"):
        raise ValueError("Connexion privee Treg absente ou invalide.")
    headers = {"X-Treg-Token": token, "X-Treg-Client": "hermes-approved-social", "X-Treg-Route-Max-Cost": "0", "Accept": "application/json"}
    if org:
        headers["X-Treg-Org"] = org
    if payload is not None:
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request("https://treg.to" + path, data=None if payload is None else json.dumps(payload).encode(), headers=headers, method="GET" if payload is None else "POST")
    try:
        response = secure_open(request, timeout=90)
    except urllib.error.HTTPError as exc:
        response = exc
    with response:
        try:
            data = json.loads(read_bounded_response(response, 2_000_000, "La reponse Treg"))
        except (ValueError, UnicodeError) as exc:
            raise ValueError("Treg ne confirme pas la reponse Instagram.") from exc
        return response.status, dict(response.headers.items()), data


def instagram_call(path: str, query: dict | None = None, payload: dict | None = None) -> dict:
    route = "/call/" + INSTAGRAM_TOOL + "/" + path
    if query:
        route += "?" + urllib.parse.urlencode(query)
    status, headers, data = treg_request(route, payload)
    lower_headers = {key.lower(): value for key, value in headers.items()}
    charge = lower_headers.get("x-treg-cost-micro")
    if charge is None:
        call_ref = lower_headers.get("x-treg-call-id", "")
        if not re.fullmatch(r"[a-f0-9]{32}", call_ref):
            raise ValueError("Treg ne confirme pas le cout nul de cet appel Instagram. Traitement arrete.")
        receipt_status, _, receipt = treg_request("/calls/" + call_ref)
        call = receipt.get("call", {}) if isinstance(receipt, dict) else {}
        expected_path = "https://graph.instagram.com/v25.0/" + path
        if (receipt_status != 200 or type(receipt.get("charged_micro")) is not int or receipt.get("charged_micro") != 0 or receipt.get("ledger") != []
                or call.get("call_ref") != call_ref or call.get("tool_name") != INSTAGRAM_TOOL
                or call.get("method") != ("GET" if payload is None else "POST")
                or call.get("path") != expected_path or call.get("status_code") != status or call.get("endpoint_id") is not None):
            raise ValueError("Recu Treg Instagram invalide. Traitement arrete sans nouvel appel de publication.")
    elif charge != "0":
        raise ValueError("Appel Instagram non confirme a cout nul. Traitement arrete.")
    if status not in (200, 201) or not isinstance(data, dict) or "error" in data:
        raise ValueError(f"Appel Instagram refuse ({status}). Verifier le compte et ses permissions.")
    return data


def instagram_preflight() -> None:
    status, _, rows = treg_request("/connections")
    connection = next((row for row in rows if isinstance(row, dict) and row.get("name") == INSTAGRAM_TOOL and row.get("provider") == "instagram"), None) if isinstance(rows, list) else None
    if status != 200 or not connection:
        raise ValueError("Reconnecter Instagram dans Treg pour autoriser la publication.")
    if (str(connection.get("resource_name", "")).lstrip("@").lower() != INSTAGRAM_EXPECTED_USER
            or str(connection.get("resource_ref")) != INSTAGRAM_EXPECTED_ID):
        raise ValueError("Treg ne renvoie pas @antoinequarroz.dev. Publication bloquee.")
    if connection.get("needs_reconnect") or set(connection.get("scopes") or []) != INSTAGRAM_SCOPES:
        raise ValueError("Reconnecter @antoinequarroz.dev dans Treg avec la permission de publication Instagram.")
    status, _, tools = treg_request("/tools")
    rows = tools.get("tools", []) if isinstance(tools, dict) else tools
    tool = next((row for row in rows if isinstance(row, dict) and row.get("name") == INSTAGRAM_TOOL), None) if isinstance(rows, list) else None
    if status != 200 or not tool or tool.get("base_url", "").rstrip("/") != "https://graph.instagram.com/v25.0":
        raise ValueError("La destination du connecteur Instagram a change. Publication bloquee.")
    identity = instagram_call("me", {"fields": "user_id,username"})
    if str(identity.get("user_id", identity.get("id"))) != INSTAGRAM_EXPECTED_ID or str(identity.get("username", "")).lower() != INSTAGRAM_EXPECTED_USER:
        raise ValueError("Instagram ne confirme pas l'identite @antoinequarroz.dev.")


def wait_instagram_container(container_id: str, *, attempts: int = 20, interval: float = 2.0) -> None:
    for attempt in range(attempts):
        result = instagram_call(container_id, {"fields": "status_code"})
        status = result.get("status_code")
        if status == "FINISHED":
            return
        if status != "IN_PROGRESS":
            raise ValueError("Instagram n'a pas confirme le traitement du media. Aucune publication demandee.")
        if attempt + 1 < attempts:
            time.sleep(interval)
    raise ValueError("Instagram traite encore le media. Aucune publication demandee.")


def instagram_container(payload: dict) -> str:
    result = instagram_call(INSTAGRAM_EXPECTED_ID + "/media", payload=payload)
    container_id = result.get("id")
    if not isinstance(container_id, str) or not re.fullmatch(r"[0-9]{1,30}", container_id):
        raise ValueError("Instagram ne confirme pas le conteneur prepare.")
    wait_instagram_container(container_id)
    return container_id


def publish_instagram(content: str, media_images: list[dict]) -> dict:
    if not media_images:
        raise ValueError("Instagram exige les images explicitement validees.")
    if len(media_images) == 1:
        image = media_images[0]
        container_id = instagram_container({"image_url": image["url"], "caption": content, "alt_text": image["alt"]})
    else:
        children = [instagram_container({"image_url": image["url"], "is_carousel_item": True, "alt_text": image["alt"]}) for image in media_images]
        container_id = instagram_container({"media_type": "CAROUSEL", "children": ",".join(children), "caption": content})
    # Exactly one public write. A timeout/ambiguous response is never retried.
    try:
        result = instagram_call(INSTAGRAM_EXPECTED_ID + "/media_publish", payload={"creation_id": container_id})
    except Exception as exc:
        raise RuntimeError(f"Resultat Instagram non confirme pour le conteneur {container_id}. Verifier le compte avant toute nouvelle validation ; aucun nouvel envoi automatique.") from exc
    post_id = result.get("id")
    if not isinstance(post_id, str) or not re.fullmatch(r"[0-9]{1,30}", post_id):
        raise RuntimeError("Instagram ne confirme pas le resultat de publication. Verifier le compte avant toute nouvelle validation.")
    # A failed permalink lookup must not turn a successful publication into a retry.
    permalink = None
    try:
        permalink = instagram_call(post_id, {"fields": "permalink"}).get("permalink")
    except Exception:
        pass
    if not isinstance(permalink, str) or not re.fullmatch(r"https://(?:www\.)?instagram\.com/(?:p|reel)/[A-Za-z0-9_-]+/?", permalink):
        permalink = None
    return {"id": post_id, "url": permalink, "container": container_id}


def connection_state(platform: str) -> tuple[str, str]:
    if platform == "instagram":
        try:
            instagram_preflight()
            return "ready", "Instagram @antoinequarroz.dev autorise la publication des images validees."
        except (ValueError, RuntimeError) as exc:
            return "blocked", str(exc)
        except Exception:
            return "blocked", "Connexion Instagram indisponible. Les publications validees restent en attente."
    if platform == "linkedin":
        author = os.environ.get("LINKEDIN_PERSON_URN", "").strip()
        ready = bool(os.environ.get("LINKEDIN_ACCESS_TOKEN", "").strip()) and bool(
            re.fullmatch(r"urn:li:person:[A-Za-z0-9_-]+", author)
        )
        return ("ready", "Connexion LinkedIn disponible dans Hermes.") if ready else ("blocked", "Connexion LinkedIn incomplète dans Hermes.")
    if platform != "x":
        return "blocked", "Plateforme de publication non prise en charge."
    names = ("X_API_KEY", "X_API_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_TOKEN_SECRET")
    credentials_ready = all(os.environ.get(name, "").strip() for name in names)
    allowed_cost = float(os.environ.get("HERMES_X_MAX_USD_PER_POST", "0") or "0")
    ready = credentials_ready and allowed_cost >= X_POST_WITH_URL_ESTIMATED_USD
    return ("ready", "Connexion X et plafond de coût disponibles dans Hermes.") if ready else ("blocked", "Connexion X ou plafond de coût encore incomplet dans Hermes.")


def external_post_url(platform: str, post_id: str | None) -> str | None:
    if not post_id:
        return None
    if platform == "x":
        return f"https://x.com/i/web/status/{urllib.parse.quote(str(post_id), safe='')}"
    if platform == "instagram":
        return None  # Graph media IDs are not Instagram shortcodes.
    return f"https://www.linkedin.com/feed/update/{urllib.parse.quote(str(post_id), safe=':')}"


def process_approved(site_url: str, token: str, *, dry_run: bool) -> dict:
    connections = {}
    for platform in ("linkedin", "x", "instagram"):
        state, message = connection_state(platform)
        connections[platform] = state
        site_request(site_url, token, payload={"action": "readiness", "platform": platform, "state": state, "message": message})
    queued = site_request(site_url, token).get("posts", [])
    summary = {"queued": len(queued), "published": 0, "failed": 0, "blocked": 0, "externalWrite": False}
    for queued_post in queued:
        platform = queued_post.get("platform")
        if connections.get(platform) != "ready" or not verified_approval(queued_post):
            summary["blocked"] += 1
            continue
        try:
            images = prepare_images(queued_post) if queued_post.get("media_images") else []
            if platform == "instagram" and not images:
                raise ValueError("Les publications Instagram sans image restent a publier manuellement.")
            if queued_post.get("media_kind") in ("image", "carousel") and not images:
                raise ValueError("Les images validees sont absentes. Publication bloquee.")
        except Exception as exc:
            message = str(exc) if isinstance(exc, (ValueError, RuntimeError)) else "Verification des images indisponible. La publication reste en attente."
            if not dry_run:
                site_request(site_url, token, payload={"action": "preflight_fail", "id": queued_post["id"], "version": queued_post["version"], "error": message[:500]})
            summary["blocked"] += 1
            continue
        if dry_run:
            continue
        try:
            claimed = site_request(site_url, token, payload={"action": "claim", "id": queued_post["id"], "version": queued_post["version"], "approvalFingerprint": queued_post["approval_fingerprint"]})["post"]
        except RuntimeError:
            # A concurrent edit or another worker can legitimately win the claim.
            summary["blocked"] += 1
            continue
        try:
            if not verified_approval(claimed) or not hmac.compare_digest(claimed["approval_fingerprint"], queued_post["approval_fingerprint"]):
                raise ValueError("Le texte ou les images ont change depuis la validation. Aucune publication demandee.")
            tracked_content = tracked_social_content(claimed["content"], claimed["article_url"], platform)
            summary["externalWrite"] = True
            if platform == "linkedin":
                result = publish_linkedin(
                    tracked_content, claimed["article_url"], claimed.get("article_title", ""),
                    claimed.get("media_kind") or "", claimed.get("media_url") or "",
                    claimed.get("media_title") or "", images,
                )
            elif platform == "x":
                result = publish_x(tracked_content, images)
            else:
                result = publish_instagram(tracked_content, images)
            post_id = result.get("id")
            if not post_id:
                raise RuntimeError("La plateforme ne confirme pas l'identifiant publie. Verifier le compte avant de valider a nouveau.")
            site_request(site_url, token, payload={"action": "complete", "id": claimed["id"], "version": claimed["version"], "externalPostId": post_id, "externalPostUrl": result.get("url") or external_post_url(platform, post_id)})
            summary["published"] += 1
        except Exception as exc:
            error = str(exc) if isinstance(exc, (ValueError, RuntimeError)) else "Resultat de publication non confirme. Verifier le compte avant toute nouvelle validation."
            site_request(site_url, token, payload={"action": "fail", "id": claimed["id"], "version": claimed["version"], "error": error[:1000]})
            summary["failed"] += 1
    return summary


def sync_drafts(project: Path, site_url: str, token: str, *, dry_run: bool) -> dict:
    draft_root = (project / ALLOWED_DRAFT_ROOT).resolve()
    result: dict[str, object] = {"found": 0, "synced": 0, "errors": []}
    for draft_path in sorted(draft_root.glob("*.md")):
        result["found"] = int(result["found"]) + 1
        try:
            draft = parse_draft(draft_path)
            platform = draft["platform"]
            content = draft["content"]
            article_url = draft["article_url"]
            if platform not in {"linkedin", "x"}:
                raise ValueError("plateforme absente ou invalide")
            if platform == "linkedin":
                content = clean_linkedin_content(content)
            is_canonical = (
                article_url == CANONICAL_SITE_HOME
                or article_url.startswith(CANONICAL_ARTICLE_PREFIX)
                or article_url.startswith(CANONICAL_RESOURCE_PREFIX)
                or article_url.startswith(CANONICAL_PROJECT_PREFIX)
            )
            if not is_canonical or article_url not in content:
                raise ValueError("URL canonique absente du texte")
            if not content or len(content) > (280 if platform == "x" else 3000):
                raise ValueError("longueur de texte invalide")
            if not dry_run:
                site_request(site_url, token, path="social-drafts", payload={
                    "platform": platform,
                    "sourceKey": draft_path.stem,
                    "articleTitle": draft["article_title"] or draft_path.stem.replace("-", " ").strip().capitalize(),
                    "articleUrl": article_url,
                    "content": content,
                    "sourcePath": str(draft_path.relative_to(project)),
                    "mediaKind": draft["media_kind"] or None,
                    "mediaUrl": draft["media_url"] or None,
                    "mediaTitle": draft["media_title"] or None,
                })
            result["synced"] = int(result["synced"]) + 1
        except Exception as exc:
            errors = result["errors"]
            assert isinstance(errors, list)
            errors.append({"file": draft_path.name, "error": str(exc)[:300]})
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", type=Path, default=Path("."))
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--draft", type=Path)
    mode.add_argument("--process-approved", action="store_true")
    mode.add_argument("--sync-drafts", action="store_true")
    parser.add_argument("--site-url", default=os.environ.get("HERMES_SITE_URL", DEFAULT_SITE_URL))
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--local-hour", type=int)
    parser.add_argument("--timezone", default="Europe/Zurich")
    args = parser.parse_args()

    project = args.project.resolve()
    if args.process_approved:
        if not inside_local_publication_hour(args.local_hour, args.timezone):
            print(json.dumps({
                "status": "outside_publication_hour",
                "timezone": args.timezone,
                "localHour": args.local_hour,
                "externalWrite": False,
            }, ensure_ascii=False))
            return 0
        token = os.environ.get("HERMES_PUBLISH_TOKEN", "").strip()
        if not token:
            raise RuntimeError("HERMES_PUBLISH_TOKEN absent.")
        print(json.dumps(process_approved(args.site_url, token, dry_run=args.dry_run), ensure_ascii=False))
        return 0
    if args.sync_drafts:
        token = os.environ.get("HERMES_PUBLISH_TOKEN", "").strip()
        if not token:
            raise RuntimeError("HERMES_PUBLISH_TOKEN absent.")
        print(json.dumps(sync_drafts(project, args.site_url, token, dry_run=args.dry_run), ensure_ascii=False))
        return 0

    assert args.draft is not None
    draft_path = args.draft if args.draft.is_absolute() else project / args.draft
    draft = validate_draft(draft_path, project)
    fingerprint = hashlib.sha256(
        f"{draft['platform']}\n{draft['content']}\n{draft['media_url']}".encode("utf-8")
    ).hexdigest()[:32]
    receipt_path = project / RECEIPT_ROOT / f"{fingerprint}.json"

    if receipt_path.exists():
        receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
        receipt["idempotent"] = True
        print(json.dumps(receipt, ensure_ascii=False))
        return 0

    if args.dry_run:
        print(json.dumps({
            "status": "validated",
            "platform": draft["platform"],
            "articleUrl": draft["article_url"],
            "characters": len(draft["content"]),
            "fingerprint": fingerprint,
            "externalWrite": False,
        }, ensure_ascii=False))
        return 0

    tracked_content = tracked_social_content(draft["content"], draft["article_url"], draft["platform"])
    result = publish_linkedin(
        tracked_content,
        draft["article_url"],
        draft["article_title"],
        draft["media_kind"],
        draft["media_url"],
        draft["media_title"],
    ) if draft["platform"] == "linkedin" else publish_x(tracked_content)
    receipt = {
        "status": "published",
        "platform": draft["platform"],
        "articleUrl": draft["article_url"],
        "postId": result.get("id"),
        "imageAttached": bool(result.get("image")),
        "documentAttached": bool(result.get("document")),
        "fingerprint": fingerprint,
        "idempotent": False,
    }
    receipt_path.parent.mkdir(parents=True, exist_ok=True)
    receipt_path.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(receipt, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
