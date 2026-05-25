# netlify/functions/transcribe_py/handler.py
import json
import base64
import tempfile
import os
import sys

def handler(event, context):
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers, "body": ""}

    try:
        import speech_recognition as sr

        body = json.loads(event.get("body", "{}"))
        audio_b64 = body.get("audio", "")
        language  = body.get("language", "hi")

        if not audio_b64:
            return {
                "statusCode": 400,
                "headers": cors_headers,
                "body": json.dumps({"error": "No audio provided"}),
            }

        # Decode base64 audio to temp file
        audio_bytes = base64.b64decode(audio_b64)
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        recognizer = sr.Recognizer()
        try:
            with sr.AudioFile(tmp_path) as source:
                audio_data = recognizer.record(source)
            # Map BCP-47 to Google language code (most match directly)
            google_lang = language if '-' in language else f"{language}-IN"
            text = recognizer.recognize_google(audio_data, language=google_lang)
        except sr.UnknownValueError:
            text = ""
        except sr.RequestError as e:
            return {
                "statusCode": 500,
                "headers": cors_headers,
                "body": json.dumps({"error": f"Google STT error: {e}"}),
            }
        finally:
            os.unlink(tmp_path)

        return {
            "statusCode": 200,
            "headers": cors_headers,
            "body": json.dumps({"text": text, "engine": "python"}),
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "headers": cors_headers,
            "body": json.dumps({"error": str(e)}),
        }
