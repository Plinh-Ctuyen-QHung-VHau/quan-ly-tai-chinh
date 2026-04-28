#!/usr/bin/env python3
"""
PaddleOCR runner script.
Called from NestJS via child_process.

Usage: python3 paddleocr_runner.py /path/to/image.jpg

Outputs JSON to stdout in OcrEngineResult format.
"""

import sys
import json
import os

def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "engine": "paddleocr",
            "language": "vi",
            "rawText": "",
            "lines": [],
            "confidence": 0,
            "warnings": ["No image path provided"]
        }))
        sys.exit(1)

    image_path = sys.argv[1]

    if not os.path.exists(image_path):
        print(json.dumps({
            "engine": "paddleocr",
            "language": "vi",
            "rawText": "",
            "lines": [],
            "confidence": 0,
            "warnings": [f"Image file not found: {image_path}"]
        }))
        sys.exit(1)

    try:
        from paddleocr import PaddleOCR
    except ImportError as e:
        print(json.dumps({
            "engine": "paddleocr",
            "language": "vi",
            "rawText": "",
            "lines": [],
            "confidence": 0,
            "warnings": [f"PaddleOCR not installed: {str(e)}"]
        }))
        sys.exit(1)

    # Try Vietnamese first, fallback to multilingual/English
    lang = "vi"
    warnings = []

    try:
        ocr = PaddleOCR(
            use_angle_cls=True,
            lang=lang,
            show_log=False,
            use_gpu=False,
        )
    except Exception:
        lang = "en"
        warnings.append(f"PaddleOCR lang='vi' failed, falling back to lang='{lang}'")
        try:
            ocr = PaddleOCR(
                use_angle_cls=True,
                lang=lang,
                show_log=False,
                use_gpu=False,
            )
        except Exception as e2:
            print(json.dumps({
                "engine": "paddleocr",
                "language": lang,
                "rawText": "",
                "lines": [],
                "confidence": 0,
                "warnings": [f"PaddleOCR init failed: {str(e2)}"]
            }))
            sys.exit(1)

    try:
        result = ocr.ocr(image_path, cls=True)
    except Exception as e:
        print(json.dumps({
            "engine": "paddleocr",
            "language": lang,
            "rawText": "",
            "lines": [],
            "confidence": 0,
            "warnings": [f"PaddleOCR OCR failed: {str(e)}"]
        }))
        sys.exit(1)

    lines = []
    all_texts = []
    all_confidences = []

    # PaddleOCR returns: [ [ [bbox_points, (text, confidence)], ... ] ]
    if result and len(result) > 0:
        page = result[0]
        if page:
            for item in page:
                bbox_points = item[0]  # [[x0,y0], [x1,y0], [x1,y1], [x0,y1]]
                text_info = item[1]    # (text, confidence)

                text = text_info[0]
                conf = float(text_info[1])

                # Convert 4-point bbox to x0,y0,x1,y1
                xs = [p[0] for p in bbox_points]
                ys = [p[1] for p in bbox_points]
                x0 = int(min(xs))
                y0 = int(min(ys))
                x1 = int(max(xs))
                y1 = int(max(ys))

                line_obj = {
                    "text": text,
                    "confidence": round(conf * 100, 2),
                    "bbox": {"x0": x0, "y0": y0, "x1": x1, "y1": y1},
                    "words": []  # PaddleOCR doesn't split words natively
                }
                lines.append(line_obj)
                all_texts.append(text)
                all_confidences.append(conf)

    raw_text = "\n".join(all_texts)
    avg_confidence = (sum(all_confidences) / len(all_confidences) * 100) if all_confidences else 0

    output = {
        "engine": "paddleocr",
        "language": lang,
        "rawText": raw_text,
        "lines": lines,
        "confidence": round(avg_confidence, 2),
        "warnings": warnings
    }

    print(json.dumps(output, ensure_ascii=False))


if __name__ == "__main__":
    main()
