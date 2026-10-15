"""Transport and approval safety tests. All provider/network writes are mocked."""
import copy
from email.message import Message
import importlib.util
import json
import os
from pathlib import Path
import struct
import subprocess
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("publisher", Path(__file__).with_name("publish_social.py"))
publisher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publisher)


def jpeg(width=1080, height=1350):
    return b"\xff\xd8\xff\xc0" + struct.pack(">H B H H", 7, 8, height, width) + b"\xff\xd9"


def post(platform="instagram", count=1):
    result = {
        "organization_id": "org", "id": "post", "platform": platform,
        "content": "Un projet, une idée 🇨🇭\nhttps://www.antoinequarroz.ch/",
        "article_url": "https://www.antoinequarroz.ch/", "article_title": "PhysioBaur",
        "media_kind": "image" if count == 1 else "carousel", "media_url": None, "media_title": None,
        "media_images": [{"url": f"https://www.antoinequarroz.ch/social/physio-{i}.jpg", "alt": f"Écran {i}"} for i in range(count)],
        "publication_mode": "automatic", "approved_version": 2, "version": 2,
    }
    result["approval_fingerprint"] = publisher.approval_fingerprint(result)
    return result


def image(index=0):
    return {"url": f"https://www.antoinequarroz.ch/social/physio-{index}.jpg", "alt": f"Écran {index}", "data": jpeg(), "mime": "image/jpeg"}


def mixed_post():
    result = post(count=6)
    result.update(media_images=[], media_kind=None)
    result["media_items"] = [{"type": "video" if i in (1, 3) else "image", "url": f"https://oxlrljszatejqxhclmbu.supabase.co/storage/v1/object/public/social-videos/uploads/00000000-0000-0000-0000-000000000a01/00000000-0000-0000-0000-{i:012d}.mp4" if i in (1, 3) else f"https://www.antoinequarroz.ch/social/physio-{i}.jpg", "alt": f"Écran {i}"} for i in range(6)]
    result["approval_fingerprint"] = publisher.approval_fingerprint(result)
    return result


def mp4_metadata():
    return {"streams": [{"codec_type": "video", "codec_name": "h264", "pix_fmt": "yuv420p", "field_order": "progressive", "width": 1080, "height": 1350, "avg_frame_rate": "30/1"}], "format": {"duration": "7"}}


MP4_HEADER = struct.pack(">I", 24) + b"ftypisom" + b"\0" * 12


class Response:
    def __init__(self, data, content_type="image/jpeg"):
        self.data = data
        self.headers = Message()
        self.headers["Content-Type"] = content_type
        self.status = 200

    def read(self, maximum=None):
        return self.data if maximum is None else self.data[:maximum]

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return None


class ImageValidationTests(unittest.TestCase):
    def test_header_dimensions_and_approved_order(self):
        with patch.object(publisher, "secure_open", return_value=Response(jpeg())):
            images = publisher.prepare_images(post(count=2))
        self.assertEqual([row["alt"] for row in images], ["Écran 0", "Écran 1"])
        self.assertEqual((images[0]["width"], images[0]["height"]), (1080, 1350))

    def test_external_urls_traversal_queries_and_credentials_never_downloaded(self):
        for url in (
            "https://evil.example/photo.jpg", "https://www.antoinequarroz.ch/social/%2e%2e/private.jpg",
            "https://www.antoinequarroz.ch/social/p.jpg?token=secret", "https://user:secret@www.antoinequarroz.ch/social/p.jpg",
            "https://www.antoinequarroz.ch:8443/social/p.jpg", "http://www.antoinequarroz.ch/social/p.jpg",
        ):
            item = post(); item["media_images"][0]["url"] = url
            with patch.object(publisher, "secure_open") as network, self.assertRaises(ValueError):
                publisher.prepare_images(item)
            network.assert_not_called()

    def test_instagram_rejects_png_and_landscape_too_wide(self):
        for data, mime in ((jpeg(1080, 400), "image/jpeg"), (jpeg(), "image/png")):
            with patch.object(publisher, "secure_open", return_value=Response(data, mime)), self.assertRaises(ValueError):
                publisher.prepare_images(post())

    def test_rejects_x_fifth_image_and_bad_jpeg_before_upload(self):
        with patch.object(publisher, "secure_open") as network, self.assertRaises(ValueError):
            publisher.prepare_images(post("x", 5))
        network.assert_not_called()
        with patch.object(publisher, "secure_open", return_value=Response(b"not a jpeg")), self.assertRaises(ValueError):
            publisher.prepare_images(post())

    def test_all_redirects_are_refused(self):
        self.assertIsNone(publisher.NoRedirect().redirect_request(None, None, 307, "redirect", {}, "https://evil.example"))


class MixedValidationTests(unittest.TestCase):
    def test_real_probe_only_receives_bounded_private_tempfile_and_deletes_it(self):
        def probe(args, **kwargs):
            path = Path(args[-1])
            self.assertTrue(path.is_file())
            self.assertEqual(path.read_bytes(), MP4_HEADER)
            self.assertIn("file,pipe", args)
            self.assertEqual(kwargs["timeout"], 30)
            self.assertTrue(kwargs["check"])
            self.local_path = path
            return subprocess.CompletedProcess(args, 0, stdout=json.dumps(mp4_metadata()))
        with patch.object(publisher.shutil, "which", return_value="/usr/bin/ffprobe"), patch.object(publisher.subprocess, "run", side_effect=probe):
            result = publisher.instagram_video_metadata(MP4_HEADER)
        self.assertEqual((result["width"], result["height"], result["duration"], result["fps"]), (1080, 1350, 7, 30))
        self.assertFalse(self.local_path.exists())

    def test_missing_probe_invalid_header_failure_and_timeout_are_closed(self):
        with patch.object(publisher.shutil, "which", return_value=None), self.assertRaisesRegex(ValueError, "ffprobe"):
            publisher.instagram_video_metadata(MP4_HEADER)
        with patch.object(publisher.subprocess, "run") as probe, self.assertRaises(ValueError):
            publisher.instagram_video_metadata(b"not an mp4")
        probe.assert_not_called()
        for error in (subprocess.TimeoutExpired("ffprobe", 30), subprocess.CalledProcessError(1, "ffprobe", stderr="private diagnostic")):
            with patch.object(publisher.shutil, "which", return_value="ffprobe"), patch.object(publisher.subprocess, "run", side_effect=error), self.assertRaisesRegex(ValueError, "verification du MP4"):
                publisher.instagram_video_metadata(MP4_HEADER)

    def test_metadata_limits_codecs_track_count_and_rotation(self):
        variants = []
        for field, value in (("codec_name", "hevc"), ("pix_fmt", "yuv444p"), ("width", 2000), ("height", 2000), ("avg_frame_rate", "22/1"), ("avg_frame_rate", "61/1"), ("field_order", "tt"), ("side_data_list", [{"rotation": 90}])):
            item = mp4_metadata(); item["streams"][0][field] = value; variants.append(item)
        for duration in ("2.99", "60.01", "nan"):
            item = mp4_metadata(); item["format"]["duration"] = duration; variants.append(item)
        for audio in ({"codec_type": "audio", "codec_name": "mp3", "channels": 2, "sample_rate": "48000"}, {"codec_type": "audio", "codec_name": "aac", "channels": 3, "sample_rate": "48000"}, {"codec_type": "audio", "codec_name": "aac", "channels": 2, "sample_rate": "96000"}):
            item = mp4_metadata(); item["streams"].append(audio); variants.append(item)
        item = mp4_metadata(); item["streams"].append(copy.deepcopy(item["streams"][0])); variants.append(item)
        for metadata in variants:
            with self.subTest(metadata=metadata), patch.object(publisher.shutil, "which", return_value="ffprobe"), patch.object(publisher.subprocess, "run", return_value=subprocess.CompletedProcess([], 0, json.dumps(metadata))), self.assertRaises(ValueError):
                publisher.instagram_video_metadata(MP4_HEADER)

    def test_optional_aac_and_silent_videos_are_supported(self):
        for audio in ([], [{"codec_type": "audio", "codec_name": "aac", "channels": 2, "sample_rate": "48000"}]):
            metadata = mp4_metadata(); metadata["streams"].extend(audio)
            with patch.object(publisher.shutil, "which", return_value="ffprobe"), patch.object(publisher.subprocess, "run", return_value=subprocess.CompletedProcess([], 0, json.dumps(metadata))):
                self.assertEqual(publisher.instagram_video_metadata(MP4_HEADER)["duration"], 7)

    def test_preflight_reads_all_six_in_order_and_discards_video_bytes(self):
        calls = []
        def download(request, **kwargs):
            calls.append(request.full_url)
            return Response(MP4_HEADER, "video/mp4") if request.full_url.endswith(".mp4") else Response(jpeg())
        with patch.object(publisher, "secure_open", side_effect=download), patch.object(publisher, "instagram_video_metadata", return_value={"width": 1080, "height": 1350, "duration": 7, "fps": 30}) as probe:
            result = publisher.prepare_media_items(mixed_post())
        self.assertEqual(calls, [item["url"] for item in mixed_post()["media_items"]])
        self.assertEqual([item["type"] for item in result], ["image", "video", "image", "video", "image", "image"])
        self.assertEqual(probe.call_count, 2)
        self.assertNotIn("data", result[1])

    def test_other_platform_attachments_type_and_unsafe_urls_fail_before_download(self):
        variants = []
        for key, value in (("platform", "x"), ("platform", "linkedin"), ("media_images", [image()]), ("media_kind", "carousel"), ("media_url", "https://site/doc.pdf")):
            item = mixed_post(); item[key] = value; variants.append(item)
        for changes in ({"type": "reel"}, {"url": "https://evil.example/a.mp4"}, {"url": "https://www.antoinequarroz.ch/social/a.mp4"}, {"url": "https://www.antoinequarroz.ch/social/a.mp4?token=x"}, {"url": "https://www.antoinequarroz.ch/social/%2e%2e/a.mp4"}, {"url": "https://www.antoinequarroz.ch/social/a.jpg"}, {"alt": ""}):
            item = mixed_post(); item["media_items"][0].update(changes if changes.get("type") == "reel" else {})
            if changes.get("type") != "reel": item["media_items"][0] = {**item["media_items"][1], **changes}
            variants.append(item)
        for item in variants:
            with self.subTest(item=item), patch.object(publisher, "secure_open") as network, self.assertRaises(ValueError):
                publisher.prepare_media_items(item)
            network.assert_not_called()

    def test_declared_size_mime_and_ratio_mismatch_are_rejected(self):
        for response in (Response(b"invalid", "text/html"), Response(jpeg(), "image/png")):
            with patch.object(publisher, "secure_open", return_value=response), self.assertRaises(ValueError):
                publisher.prepare_media_items(mixed_post())
        response = Response(jpeg()); response.headers["Content-Length"] = str(publisher.MAX_INSTAGRAM_MIXED_IMAGE_BYTES + 1)
        with patch.object(publisher, "secure_open", return_value=response), self.assertRaisesRegex(RuntimeError, "taille"):
            publisher.prepare_media_items(mixed_post())
        with patch.object(publisher, "secure_open", side_effect=lambda request, **kwargs: Response(MP4_HEADER, "video/mp4") if request.full_url.endswith(".mp4") else Response(jpeg())), patch.object(publisher, "instagram_video_metadata", return_value={"width": 1080, "height": 1080}), self.assertRaisesRegex(ValueError, "meme ratio"):
            publisher.prepare_media_items(mixed_post())


class ApprovalTests(unittest.TestCase):
    def test_mixed_fingerprint_signs_type_alt_url_and_order_without_changing_legacy(self):
        original = mixed_post()
        self.assertTrue(publisher.verified_approval(original))
        for field, value in (("type", "image"), ("url", "https://www.antoinequarroz.ch/social/replaced.mp4"), ("alt", "Nouvelle description")):
            edited = copy.deepcopy(original); edited["media_items"][1][field] = value
            self.assertFalse(publisher.verified_approval(edited))
        edited = copy.deepcopy(original); edited["media_items"].reverse()
        self.assertFalse(publisher.verified_approval(edited))
        legacy = post(); with_empty = {**legacy, "media_items": []}
        self.assertEqual(publisher.approval_fingerprint(legacy), publisher.approval_fingerprint(with_empty))

    def test_queue_capability_is_sent_for_list_and_claim(self):
        for payload in (None, {"action": "claim", "id": "post", "version": 2}):
            with patch.object(publisher, "secure_open", return_value=Response(b"{}", "application/json")) as network:
                publisher.site_request("https://www.antoinequarroz.ch", "private", payload=payload)
            headers = {key.lower(): value for key, value in network.call_args.args[0].header_items()}
            self.assertEqual(headers["x-hermes-social-capabilities"], "instagram-mixed-v1")

    def test_mixed_dry_run_and_real_flow_validate_all_media_before_claim(self):
        for dry_run in (True, False):
            queued = mixed_post(); events = []
            def site(*args, payload=None, **kwargs):
                if payload is None: return {"posts": [queued]}
                events.append(payload["action"])
                return {"post": {**queued, "version": 3}} if payload["action"] == "claim" else {}
            def prepare(item):
                self.assertEqual(item, queued); events.append("preflight-all-six")
                return queued["media_items"]
            with patch.object(publisher, "connection_state", return_value=("ready", "ready")), patch.object(publisher, "site_request", side_effect=site), patch.object(publisher, "prepare_media_items", side_effect=prepare), patch.object(publisher, "publish_instagram", return_value={"id": "999"}) as publish:
                result = publisher.process_approved("https://site", "private", dry_run=dry_run)
            self.assertEqual(events[:4], ["readiness"] * 3 + ["preflight-all-six"])
            if dry_run:
                self.assertEqual(events[4:], []); publish.assert_not_called()
                self.assertFalse(result["externalWrite"])
            else:
                self.assertEqual(events[4:], ["claim", "complete"])
                self.assertEqual(publish.call_args.args[1], queued["media_items"])

    def test_mixed_invalid_video_never_claims_and_changed_claim_never_publishes(self):
        queued = mixed_post()
        for invalid in (True, False):
            actions = []
            def site(*args, payload=None, **kwargs):
                if payload is None: return {"posts": [queued]}
                actions.append(payload["action"])
                changed = copy.deepcopy(queued); changed["media_items"][1]["type"] = "image"
                return {"post": changed} if payload["action"] == "claim" else {}
            with patch.object(publisher, "connection_state", return_value=("ready", "ready")), patch.object(publisher, "site_request", side_effect=site), patch.object(publisher, "prepare_media_items", side_effect=ValueError("Video invalide") if invalid else None, return_value=queued["media_items"]), patch.object(publisher, "publish_instagram") as publish:
                publisher.process_approved("https://site", "private", dry_run=False)
            publish.assert_not_called()
            self.assertEqual(actions[3:], ["preflight_fail"] if invalid else ["claim", "fail"])

    def test_local_x_draft_cannot_silently_drop_an_image_attachment(self):
        with tempfile.TemporaryDirectory() as folder:
            project = Path(folder); root = project / "seo/social/a-valider"; root.mkdir(parents=True)
            draft = root / "image.md"
            draft.write_text("---\nplatform: x\nstatut: APPROUVE\narticle_url: https://www.antoinequarroz.ch/\nmedia_kind: image\n---\nA project https://www.antoinequarroz.ch/\n")
            with self.assertRaises(ValueError):
                publisher.validate_draft(draft, project)

    def test_fingerprint_matches_length_prefixed_unicode_protocol(self):
        value = post(count=2)
        value.update(organization_id="00000000-0000-0000-0000-000000000a01", id="00000000-0000-0000-0000-000000000a11", platform="linkedin", content="Un café ☕", media_kind=None)
        value["media_images"] = [{"url": "https://www.antoinequarroz.ch/social/01.jpg", "alt": "Café ☕"}, {"url": "https://www.antoinequarroz.ch/social/02.jpg", "alt": "Contact"}]
        value["approval_fingerprint"] = "accb88a3650e1fa5975da0609181160cab6cee9ad89a46c6dc0920d844f064d7"
        self.assertEqual(publisher.approval_fingerprint(value), value["approval_fingerprint"])
        self.assertTrue(publisher.verified_approval(value))
        value["media_images"].reverse()
        self.assertFalse(publisher.verified_approval(value))

    def test_manual_legacy_and_missing_approval_are_never_claimed(self):
        variants = [post(), post(), post()]
        variants[0]["publication_mode"] = "manual"
        variants[1]["approval_fingerprint"] = None
        variants[2]["content"] += " edit"
        calls = []
        def site(*args, payload=None, **kwargs):
            calls.append(payload)
            return {"posts": variants} if payload is None else {}
        with patch.object(publisher, "connection_state", return_value=("ready", "ready")), patch.object(publisher, "site_request", side_effect=site):
            result = publisher.process_approved("https://site", "secret", dry_run=False)
        self.assertEqual(result["blocked"], 3)
        self.assertFalse(any(row and row["action"] == "claim" for row in calls))

    def test_dry_run_validates_bytes_but_never_claims_uploads_or_publishes(self):
        calls = []
        def site(*args, payload=None, **kwargs):
            calls.append(payload)
            return {"posts": [post()]} if payload is None else {}
        with patch.object(publisher, "connection_state", return_value=("ready", "ready")), patch.object(publisher, "site_request", side_effect=site), patch.object(publisher, "prepare_images", return_value=[image()]), patch.object(publisher, "publish_instagram") as publish:
            result = publisher.process_approved("https://site", "secret", dry_run=True)
        publish.assert_not_called()
        self.assertEqual([row["action"] for row in calls if row], ["readiness"] * 3)
        self.assertFalse(result["externalWrite"])

    def test_preflight_blocked_scope_leaves_approval_waiting(self):
        calls = []
        def site(*args, payload=None, **kwargs):
            calls.append(payload)
            return {"posts": [post()]} if payload is None else {}
        with patch.object(publisher, "connection_state", return_value=("blocked", "permission required")), patch.object(publisher, "site_request", side_effect=site):
            publisher.process_approved("https://site", "secret", dry_run=False)
        self.assertFalse(any(row and row["action"] in ("claim", "fail") for row in calls))

    def test_invalid_media_reports_error_without_claim_and_dry_run_only_writes_readiness(self):
        for dry_run in (True, False):
            calls = []
            def site(*args, payload=None, **kwargs):
                calls.append(payload)
                return {"posts": [post()]} if payload is None else {}
            with patch.object(publisher, "connection_state", return_value=("ready", "ready")), patch.object(publisher, "site_request", side_effect=site), patch.object(publisher, "prepare_images", side_effect=ValueError("Bad image")):
                result = publisher.process_approved("https://site", "secret", dry_run=dry_run)
            actions = [row["action"] for row in calls if row]
            self.assertEqual(actions, ["readiness"] * 3 + ([] if dry_run else ["preflight_fail"]))
            self.assertEqual(result["blocked"], 1)

    def test_claim_race_fingerprint_is_rechecked_before_transport(self):
        queued = post(); changed = copy.deepcopy(queued); changed["content"] += " edit"
        calls = []
        def site(*args, payload=None, **kwargs):
            calls.append(payload)
            if payload is None:
                return {"posts": [queued]}
            return {"post": changed} if payload["action"] == "claim" else {}
        with patch.object(publisher, "connection_state", return_value=("ready", "ready")), patch.object(publisher, "site_request", side_effect=site), patch.object(publisher, "prepare_images", return_value=[image()]), patch.object(publisher, "publish_instagram") as publish:
            result = publisher.process_approved("https://site", "secret", dry_run=False)
        publish.assert_not_called()
        self.assertEqual(result["failed"], 1)
        self.assertEqual(calls[-1]["action"], "fail")

    def test_successful_instagram_claim_keeps_approved_images_and_records_permalink(self):
        queued = post(count=2); claimed = {**queued, "version": 3}
        calls = []
        def site(*args, payload=None, **kwargs):
            calls.append(payload)
            if payload is None:
                return {"posts": [queued]}
            return {"post": claimed} if payload["action"] == "claim" else {}
        images = [image(), image(1)]
        with patch.object(publisher, "connection_state", return_value=("ready", "ready")), patch.object(publisher, "site_request", side_effect=site), patch.object(publisher, "prepare_images", return_value=images), patch.object(publisher, "publish_instagram", return_value={"id": "999", "url": "https://www.instagram.com/p/abc123/"}) as publish:
            result = publisher.process_approved("https://site", "secret", dry_run=False)
        self.assertIn("utm_source=instagram", publish.call_args.args[0])
        self.assertIs(publish.call_args.args[1], images)
        self.assertEqual(calls[-1], {"action": "complete", "id": "post", "version": 3, "externalPostId": "999", "externalPostUrl": "https://www.instagram.com/p/abc123/"})
        self.assertEqual(result["published"], 1)

    def test_ambiguous_transport_failure_is_recorded_once_and_not_retried(self):
        queued = post(); claimed = {**queued, "version": 3}
        calls = []
        def site(*args, payload=None, **kwargs):
            calls.append(payload)
            if payload is None:
                return {"posts": [queued]}
            return {"post": claimed} if payload["action"] == "claim" else {}
        with patch.object(publisher, "connection_state", return_value=("ready", "ready")), patch.object(publisher, "site_request", side_effect=site), patch.object(publisher, "prepare_images", return_value=[image()]), patch.object(publisher, "publish_instagram", side_effect=TimeoutError("secret-must-not-leak")) as publish:
            result = publisher.process_approved("https://site", "secret", dry_run=False)
        self.assertEqual(publish.call_count, 1)
        self.assertEqual(calls[-1]["action"], "fail")
        self.assertNotIn("secret-must-not-leak", calls[-1]["error"])
        self.assertEqual(result["failed"], 1)


class TransportTests(unittest.TestCase):
    def test_mixed_instagram_children_keep_order_and_wait_before_parent_and_only_public_write(self):
        calls = []
        def instagram(path, query=None, payload=None):
            calls.append((path, query, payload))
            if path.endswith("/media_publish"): return {"id": "999"}
            if query and query.get("fields") == "status_code": return {"status_code": "FINISHED"}
            if query: return {"permalink": "https://www.instagram.com/p/abc123/"}
            return {"id": str(100 + len(calls))}
        with patch.object(publisher, "instagram_call", side_effect=instagram):
            publisher.publish_instagram("caption", mixed_post()["media_items"])
        bodies = [body for path, _, body in calls if path.endswith("/media")]
        for item, body in zip(mixed_post()["media_items"], bodies[:6]):
            expected = {"media_type": "VIDEO", "video_url": item["url"], "is_carousel_item": True} if item["type"] == "video" else {"image_url": item["url"], "is_carousel_item": True, "alt_text": item["alt"]}
            self.assertEqual(body, expected)
        self.assertEqual(bodies[6], {"media_type": "CAROUSEL", "children": "101,103,105,107,109,111", "caption": "caption"})
        final_index = next(i for i, (path, _, _) in enumerate(calls) if path.endswith("/media_publish"))
        self.assertEqual(sum(query == {"fields": "status_code"} for _, query, _ in calls[:final_index]), 7)
        self.assertEqual(sum(path.endswith("/media_publish") for path, _, _ in calls), 1)

    def test_video_polling_waits_one_minute_and_stops_after_five_minutes(self):
        with patch.object(publisher, "instagram_call", return_value={"id": "123", "status_code": "IN_PROGRESS"}) as call, patch.object(publisher.time, "sleep") as sleep, self.assertRaisesRegex(ValueError, "traite encore"):
            publisher.instagram_container({"media_type": "VIDEO", "video_url": "https://site/v.mp4", "is_carousel_item": True}, video=True)
        self.assertEqual(call.call_count, 7)  # one creation, six status reads
        self.assertEqual([row.args[0] for row in sleep.call_args_list], [60.0] * 5)

    def test_failed_video_never_creates_parent_or_publishes(self):
        calls = []
        def instagram(path, query=None, payload=None):
            calls.append((path, query, payload))
            if query: return {"status_code": "ERROR" if len(calls) == 4 else "FINISHED"}
            return {"id": "123"}
        with patch.object(publisher, "instagram_call", side_effect=instagram), self.assertRaises(ValueError):
            publisher.publish_instagram("caption", mixed_post()["media_items"])
        self.assertFalse(any(path.endswith("/media_publish") or (payload and payload.get("media_type") == "CAROUSEL") for path, _, payload in calls))

    @patch.dict(os.environ, {"LINKEDIN_ACCESS_TOKEN": "secret", "LINKEDIN_PERSON_URN": "urn:li:person:antoine"})
    def test_linkedin_single_and_multi_image_payloads_keep_alts_and_order(self):
        for count in (1, 3):
            with patch.object(publisher, "upload_linkedin_image", side_effect=[f"urn:li:image:{i}" for i in range(count)]), patch.object(publisher, "request_json", return_value=({}, {"x-restli-id": "urn:li:share:123"})) as send:
                publisher.publish_linkedin("text", "https://site", "Title", media_images=[image(i) for i in range(count)])
            payload = send.call_args.args[1]["content"]
            attached = [payload["media"]] if count == 1 else payload["multiImage"]["images"]
            self.assertEqual([row["id"] for row in attached], [f"urn:li:image:{i}" for i in range(count)])
            self.assertEqual([row["altText"] for row in attached], [f"Écran {i}" for i in range(count)])

    @patch.dict(os.environ, {"X_API_KEY": "k", "X_API_SECRET": "s", "X_ACCESS_TOKEN": "t", "X_ACCESS_TOKEN_SECRET": "ts", "HERMES_X_MAX_USD_PER_POST": "0.20"})
    def test_x_uses_uploaded_media_ids_without_increasing_cost_cap(self):
        with patch.object(publisher, "upload_x_image", side_effect=["10", "11"]), patch.object(publisher, "request_json", return_value=({"data": {"id": "20"}}, {})) as send:
            publisher.publish_x("text", [image(), image(1)])
        self.assertEqual(send.call_args.args[1], {"text": "text", "media": {"media_ids": ["10", "11"]}})
        with patch.dict(os.environ, {"HERMES_X_MAX_USD_PER_POST": "0"}), patch.object(publisher, "upload_x_image") as upload, self.assertRaises(RuntimeError):
            publisher.publish_x("text", [image()])
        upload.assert_not_called()

    def test_x_v2_base64_and_alt_metadata_use_existing_oauth_user_context(self):
        credentials = dict(consumer_key="k", consumer_secret="s", access_token="t", access_token_secret="ts")
        with patch.object(publisher, "request_json", side_effect=[({"data": {"id": "10"}}, {}), ({}, {})]) as send:
            self.assertEqual(publisher.upload_x_image(image(), credentials), "10")
        upload = send.call_args_list[0]
        self.assertEqual(upload.args[0], "https://api.x.com/2/media/upload")
        self.assertEqual(upload.args[1]["media_category"], "tweet_image")
        self.assertEqual(publisher.base64.b64decode(upload.args[1]["media"]), image()["data"])
        self.assertTrue(upload.args[2]["Authorization"].startswith("OAuth "))
        self.assertEqual(send.call_args.args[1], {"id": "10", "metadata": {"alt_text": {"text": "Écran 0"}}})

    def test_instagram_carousel_uses_ordered_children_and_exactly_one_public_write(self):
        calls = []
        def instagram(path, query=None, payload=None):
            calls.append((path, payload))
            if path.endswith("/media_publish"):
                return {"id": "999"}
            if query and query.get("fields") == "status_code":
                return {"status_code": "FINISHED"}
            if query:
                return {"permalink": "https://www.instagram.com/p/abc123/"}
            return {"id": str(100 + len(calls))}
        with patch.object(publisher, "instagram_call", side_effect=instagram):
            result = publisher.publish_instagram("caption", [image(), image(1)])
        bodies = [payload for path, payload in calls if path.endswith("/media")]
        self.assertEqual([body["image_url"] for body in bodies[:2]], [image()["url"], image(1)["url"]])
        self.assertEqual(bodies[2], {"media_type": "CAROUSEL", "children": "101,103", "caption": "caption"})
        self.assertEqual(sum(path.endswith("/media_publish") for path, _ in calls), 1)
        self.assertEqual(result["url"], "https://www.instagram.com/p/abc123/")

    def test_ambiguous_instagram_final_write_is_not_retried(self):
        def instagram(path, query=None, payload=None):
            if path.endswith("/media_publish"):
                raise TimeoutError("unknown outcome")
            return {"id": "123", "status_code": "FINISHED"}
        with patch.object(publisher, "instagram_call", side_effect=instagram) as call, self.assertRaisesRegex(RuntimeError, "conteneur 123"):
            publisher.publish_instagram("caption", [image()])
        self.assertEqual(sum(args.args[0].endswith("/media_publish") for args in call.call_args_list), 1)

    def test_instagram_wrong_account_or_missing_scope_never_reads_or_writes_provider(self):
        connection = {"name": publisher.INSTAGRAM_TOOL, "provider": "instagram", "resource_name": "antoinequarroz.dev", "resource_ref": publisher.INSTAGRAM_EXPECTED_ID, "scopes": list(publisher.INSTAGRAM_SCOPES)}
        for field, value in (("resource_name", "other"), ("scopes", ["instagram_business_basic"])):
            item = {**connection, field: value}
            with patch.object(publisher, "treg_request", return_value=(200, {}, [item])), patch.object(publisher, "instagram_call") as provider, self.assertRaises(ValueError):
                publisher.instagram_preflight()
            provider.assert_not_called()

    def test_instagram_missing_zero_cost_receipt_stops_before_next_write(self):
        with patch.object(publisher, "treg_request", return_value=(200, {}, {"id": "123"})) as request, self.assertRaises(ValueError):
            publisher.instagram_call(publisher.INSTAGRAM_EXPECTED_ID + "/media", payload={"image_url": image()["url"]})
        self.assertEqual(request.call_count, 1)

    def test_instagram_cannot_write_another_account_or_mutate_treg_configuration(self):
        for path in ("/connections", "/tools", "/call/instagram-antoinequarroz/999/media", "/call/instagram-antoinequarroz/me"):
            with patch.object(publisher, "secure_open") as network, self.assertRaises(ValueError):
                publisher.treg_request(path, {"caption": "text"})
            network.assert_not_called()

    def test_linkedin_upload_url_cannot_receive_private_token_on_another_host(self):
        self.assertTrue(publisher.valid_linkedin_upload_url("https://www.linkedin.com/dms-uploads/test"))
        for value in ("https://evil.example/upload", "https://linkedin.com.evil.example/upload", "http://www.linkedin.com/upload", "https://user:secret@www.linkedin.com/upload"):
            self.assertFalse(publisher.valid_linkedin_upload_url(value))


if __name__ == "__main__":
    unittest.main()
