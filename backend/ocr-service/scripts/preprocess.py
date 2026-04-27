import cv2
import sys
import numpy as np

def preprocess_image(input_path, output_path):
    """
    Reads an image, preprocesses it for OCR, and saves the result.
    """
    img = cv2.imread(input_path)
    if img is None:
        print("Error: Cannot read input image.", file=sys.stderr)
        sys.exit(2)

    h, w = img.shape[:2]
    original_dims = f"{w}x{h}"

    # 1. Resize image if necessary
    target_width = w
    if w > 2200:
        target_width = 2200
    elif w < 1200:
        target_width = 1600

    if target_width != w:
        scale = target_width / w
        img = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)

    # 2. Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # 3. Denoise lightly
    # The h parameter (10) is the main knob to tune.
    denoised = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)

    # 4. Increase contrast with CLAHE
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    contrast = clahe.apply(denoised)

    # 5. Apply adaptive thresholding
    binary = cv2.adaptiveThreshold(
        contrast,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        31,  # Block size - needs to be odd
        11,  # C - constant subtracted from the mean
    )

    # 6. Sharpen the image (optional, can sometimes introduce noise)
    kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
    final_image = cv2.filter2D(binary, -1, kernel)

    # 7. Save the processed image
    ok = cv2.imwrite(output_path, final_image)
    if not ok:
        print("Error: Cannot write output image.", file=sys.stderr)
        sys.exit(3)

    final_h, final_w = final_image.shape[:2]
    final_dims = f"{final_w}x{final_h}"
    print(f"OpenCV preprocess OK: {original_dims} -> {final_dims}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python3 preprocess.py <input_path> <output_path>", file=sys.stderr)
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]
    
    preprocess_image(input_path, output_path)
    sys.exit(0)
