# GreenVision AI

## Mô tả ý tưởng sáng kiến

**Tên sáng kiến:** GreenVision AI -- Hệ thống tối ưu hóa năng lượng thông minh bằng Trí tuệ nhân tạo và IoT

**Nhóm đối tượng hướng tới:**
Trường học, trường đại học, ký túc xá, văn phòng có cơ sở hạ tầng chưa có giải pháp tự động hóa giám sát năng lượng. Cụ thể: quản lý nhà trường, ban quản lý tòa nhà, và đơn vị vận hành cơ sở hạ tầng.

**Vấn đề cụ thể:**
Hiện nay tại các trường học và tòa nhà, điện năng bị lãng phí do:
- Đèn và điều hòa vẫn bật khi phòng trống (không có ai nhưng thiết bị vẫn hoạt động)
- Không có hệ thống tự động giám sát và cảnh báo thất thoát năng lượng
- Phụ thuộc hoàn toàn vào việc tắt/mở thủ công của người sử dụng, dễ quên tắt

**Giải pháp:**
GreenVision AI là hệ thống giám sát năng lượng thông minh, kết hợp:
- Camera + YOLO (Computer Vision) để đếm số người và phát hiện sự hiện diện trong phòng theo thời gian thực
- Cảm biến IoT (motion, nhiệt độ, ánh sáng, công suất) để thu thập dữ liệu môi trường
- Cơ sở dữ liệu SQLite lưu trữ lịch sử để phân tích và biểu đồ
- Bảng điều khiển web (dashboard) hiển thị chỉ tiêu năng lượng, số người, trạng thái phòng, và cảnh báo bất thường
- Hệ thống phát hiện bất thường: cảnh báo khi phòng trống nhưng đèn/điều hòa vẫn bật (lãng phí năng lượng)

**Cách yếu tố AI được lồng ghép:**
- YOLOv8 (Ultralytics): mô hình phát hiện người (person detection) được huấn luyện trên bộ dữ liệu 3 nguồn (Kaggle + HuggingFace + Roboflow, tổng ~3300 ảnh, augment lên ~10,000 ảnh). Mô hình phát hiện người trong khung hình camera với độ chính xác cao (mAP@0.5 > 0.9)
- AI được sử dụng ở 2 lớp: (1) nhận diện người qua camera để xác định sức chứa phòng thực tế, và (2) phân tích dữ liệu cảm biến để phát hiện bất thường năng lượng (phòng trống + đèn bật = lãng phí)
- Mô hình có thể chạy trên CPU (không cần GPU), phù hợp triển khai ở các cơ sở giáo dục

**Sản phẩm minh họa:**
- Video demo (2-3 phút): quay màn hình dashboard đang chạy, hiển thị 4 phòng với dữ liệu sensor realtime, cảnh báo bất thường khi phòng trống mà đèn vẫn bật
- Poster (A1): sơ đồ hệ thống (Camera -> YOLO -> Database -> Dashboard -> Cảnh báo), screenshot dashboard, số liệu tiết kiệm được
- Mô hình mô phỏng: chạy backend + frontend trực tiếp, cho ban giám khảo tương tác (xem dữ liệu sensor thay đổi, xem cảnh báo)

Nội dung video demo:
- Giới thiệu vấn đề (số liệu lãng phí điện năng tại trường học)
- Demo hệ thống: mở camera -> YOLO phát hiện người -> đếm số người -> hiển thị trên dashboard
- Demo cảnh báo: phòng trống nhưng đèn bật -> hệ thống cảnh báo "Energy Waste Detected"
- Biểu đồ năng lượng 24h, so sánh các phòng

---

## Technical Overview

GreenVision AI is an intelligent energy optimization system using Computer Vision (YOLO), IoT sensors, and AI to detect and reduce electricity waste in classrooms, homes, dormitories, and offices.

Combines real-time camera feeds with simulated sensor data to monitor room occupancy, count people, and flag energy waste (empty rooms with lights/AC on).

## Tech Stack

- Backend: Python 3.9, FastAPI, SQLAlchemy (async), SQLite (aiosqlite)
- Frontend: React 18, TypeScript, Vite, TailwindCSS v4, Recharts, Lucide React
- ML: YOLOv8 (ultralytics), OpenCV, Albumentations
- Training: Google Colab (T4 GPU), Google Drive storage

## Project Structure

```
GreenVision AI/
├── backend/                  # FastAPI backend
│   ├── app/
│   │   ├── main.py           # App factory, lifespan: YOLO + DB + simulator
│   │   ├── config.py         # pydantic-settings
│   │   ├── api/
│   │   │   ├── detection.py  # REST + WebSocket detection endpoints
│   │   │   ├── rooms.py      # Room CRUD + sensor history
│   │   │   └── sensors.py    # WebSocket live sensor streaming
│   │   ├── ml/
│   │   │   ├── detector.py   # YOLOv8n wrapper
│   │   │   └── counter.py    # Per-room people counter
│   │   ├── models/
│   │   │   ├── database.py   # SQLAlchemy async setup
│   │   │   ├── room.py       # Room model
│   │   │   ├── sensor_reading.py  # SensorReading model
│   │   │   ├── detection_log.py   # DetectionLog model
│   │   │   └── detection.py  # Pydantic schemas
│   │   └── services/
│   │       ├── detection_service.py
│   │       └── sensor_simulator.py  # Background sensor data generator
│   └── requirements.txt
├── frontend/                 # React + TypeScript dashboard
│   └── src/
│       ├── services/api.ts
│       └── types/index.ts
├── ml/
│   └── notebooks/
│       ├── 01a_preprocess_qasim21.ipynb   # Kaggle video stream dataset
│       ├── 01b_preprocess_nexdata.ipynb    # HuggingFace in-cabin dataset
│       ├── 01c_preprocess_roboflow.ipynb   # Roboflow person detection
│       ├── 01d_merge_datasets.ipynb        # Merge + zip for Drive reliability
│       ├── 02_train.ipynb                  # Unzip + train YOLOv8s
│       ├── 03_inference.ipynb              # Test model on images/video
│       └── 04_analysis.ipynb               # Training analysis + error breakdown
├── scripts/
│   └── seed_demo_data.py     # Seed 4 rooms + 24h sensor data
├── iot/                      # ESP32 firmware (future)
└── docs/
```

## Quick Start

### Prerequisites
- Conda (Miniconda or Anaconda)
- Node.js 18+

### 1. Set up conda environment
```bash
conda create -n computer-vision python=3.9 -y
conda activate computer-vision
cd backend
pip install -r requirements.txt
```

### 2. Download the trained model
Download `best.pt` from [Google Drive](https://drive.google.com/file/d/1rDwWGoUrByISHZsxmX8-bC-HYgTIEfJp/view?usp=sharing) and place it in the `backend/` folder.

Alternatively, the backend will use `yolov8n.pt` (pretrained COCO model) if `best.pt` is not found. For best person detection accuracy, use the fine-tuned model.

### 3. Seed demo data (first time only)
```bash
conda activate computer-vision
cd backend
python ../scripts/seed_demo_data.py
```
This creates `greenvision.db` with 4 demo rooms and 24 hours of sensor readings.

### 4. Start backend
```bash
conda activate computer-vision
cd backend
uvicorn app.main:app --reload
```
Server runs at http://localhost:8000. On startup it loads the YOLO model, initializes the database, and starts the sensor simulator (new readings every 5s).

### 5. Start frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at http://localhost:5173 and proxies `/api` and `/ws` to the backend.

### 6. Verify it works
```bash
# Health check
curl http://localhost:8000/api/v1/health

# List rooms
curl http://localhost:8000/api/v1/rooms

# Get room 1 with latest sensors
curl http://localhost:8000/api/v1/rooms/1

# Get last 1 hour of power readings for room 3
curl "http://localhost:8000/api/v1/rooms/3/sensors?hours=1&sensor_type=power"
```

Or open http://localhost:8000/docs for the interactive Swagger UI.

### Training (Google Colab)
1. Open notebooks in order: 01a -> 01b -> 01c -> 01d -> 02 -> 03 -> 04
2. For 01a, add `KAGGLE_API_TOKEN` to Colab secrets
3. All datasets save to Google Drive at `/content/drive/MyDrive/AI_TRAINING/GreenVision/`

## Training Datasets

| Dataset | Source | Format | Description |
|---------|--------|--------|-------------|
| qasim21 | Kaggle | YOLO TXT | Video stream frames, person detection |
| nexdata | HuggingFace | JSON rect -> YOLO | In-cabin passenger human body detection (~172 images) |
| roboflow | Roboflow | YOLOv8 | Person detection (~2086 images) |

Each preprocess notebook downloads, converts to YOLO format (class 0 = person), augments 3x (flip + brightness/noise), and saves to Drive.

## Demo Rooms

The seed script creates 4 rooms with realistic occupancy patterns:

| Room | Capacity | Pattern |
|------|----------|---------|
| Classroom A | 40 | Busy 8-10, empty 10-12 (lights ON = waste), busy 14-16 |
| Classroom B | 30 | Busy 9-11, busy 13-15 |
| Computer Lab | 25 | Busy 9-17 (high power from PCs), half-busy 17-20 |
| Library Study Area | 50 | Moderate 8-22, minimal overnight |

## API Endpoints

- `GET /api/v1/health` -- health check
- `POST /api/v1/detect/image` -- upload image, returns people count + bounding boxes
- `POST /api/v1/detect/video` -- upload video, returns frame-by-frame detection
- `WebSocket /ws/detect/live` -- real-time detection on JPEG stream
- `GET /api/v1/rooms` -- list all rooms
- `GET /api/v1/rooms/{id}` -- room detail with latest sensor values
- `GET /api/v1/rooms/{id}/sensors?hours=1&sensor_type=power` -- sensor history
- `WebSocket /ws/sensors` -- live sensor readings stream

## Status

- [x] Phase 0: Project scaffolding
- [x] Phase 1: CV Pipeline (YOLO detection + people counting)
- [x] ML training pipeline (multi-dataset, Colab)
- [x] Phase 2: Simulated IoT data + SQLite database
- [ ] Phase 3: Real-time dashboard frontend
- [ ] Phase 4: Anomaly detection + alerts
- [ ] Phase 5: Polish + demo prep
