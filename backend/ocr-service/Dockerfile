FROM node:18-bookworm

WORKDIR /app

# Install system dependencies for Tesseract and OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-vie \
    python3 \
    python3-pip \
    libglib2.0-0 \
    libsm6 \
    libxrender1 \
    libxext6 \
    libgl1 \
    && pip3 install --no-cache-dir --break-system-packages \
       opencv-python-headless \
       numpy \
    && rm -rf /var/lib/apt/lists/*

COPY ocr-service/package*.json ./

RUN npm install

COPY ocr-service ./
COPY shared ../shared

RUN npm run build

RUN npm prune --omit=dev

EXPOSE 3000

CMD ["node", "dist/app/src/main.js"]