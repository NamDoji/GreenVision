# GreenVision AI -- Conversation Summary

## What is GreenVision AI

An intelligent energy optimization system for a school project. Uses Computer Vision (YOLO), IoT sensors, and AI to detect and reduce electricity waste in classrooms, homes, dormitories, and offices.

## What was done

### Phase 0: Project Scaffolding (DONE)
- Initialized git repo, pushed to https://github.com/duongphamminhdung/GreenVision (branch: main)
- Created .gitignore, .env.example, docker-compose.yml
- Backend scaffold: FastAPI app at backend/app/ with config.py, main.py, api/models/services/ml dirs
- Frontend scaffold: Vite + React 18 + TypeScript + TailwindCSS v4 + Recharts + Lucide + React Router
- Created ml/data/, ml/training/, ml/models/, docs/, scripts/ with .gitkeep files

### Phase 1: CV Pipeline (DONE)
- YOLOv8 detector: detector.py, counter.py, detection_service.py
- Detection API: POST /api/v1/detect/image, POST /api/v1/detect/video, WebSocket /ws/detect/live
- Pydantic schemas: DetectionResult, DetectionBox, DetectionStats
- Backend tested: health endpoint + image detection working

### ML Training Pipeline (DONE)
Multi-dataset approach with separate preprocess notebooks per source:

- 01a_preprocess_qasim21.ipynb -- Kaggle video stream person detection dataset (YOLO format). Uses KAGGLE_API_TOKEN Colab secret (plain string KGAT_xxx format, username: dngdngphmminh).
- 01b_preprocess_nexdata.ipynb -- HuggingFace in-cabin passenger body detection. JSON rectangle annotations [[x1,y1],[x2,y2]] converted to YOLO. Note: HuggingFace repo only has ~60 sample images (full 3360 is behind paywall).
- 01c_preprocess_roboflow.ipynb -- Roboflow person detection. Downloads via public curl link.
- 02_train.ipynb -- Merges all three datasets from Drive (datasets/qasim21/, datasets/nexdata/, datasets/roboflow/), splits 80/20 train/val, trains YOLOv8s (50 epochs, batch 16, GPU).
- 03_inference_demo.ipynb -- Tests trained model on images/video.

Each preprocess notebook: download -> inspect -> convert to YOLO (class 0 = person) -> augment 3x (horizontal flip + brightness/contrast + noise) -> save to Drive.

Drive path: /content/drive/MyDrive/AI_TRAINING/GreenVision/

### Key Decisions
- Conda env "computer-vision" (Python 3.9), numpy < 2.0 for ultralytics macOS compat
- Python 3.9: use Optional[str] not str | None
- SQLite for MVP (no Docker needed for dev)
- YOLOv8n for inference (CPU), YOLOv8s for training (GPU)
- Multi-dataset approach for more diverse training data
- All datasets remapped to single class: 0 = person

## What is NOT done yet
- Phase 2: Simulated IoT data + SQLite database + sensor simulator background task
- Phase 3: Real-time dashboard frontend (pages, charts, hooks, layout)
- Phase 4: Anomaly detection (rule-based) + alerts system
- Phase 5: Polish, demo script, documentation

## Current file structure (non-node_modules)

```
GreenVision AI/
├── .gitignore
├── .env.example
├── README.md
├── docker-compose.yml
├── CLAUDE.md                          # local only, gitignored
├── backend/
│   ├── requirements.txt
│   └── app/
│       ├── __init__.py
│       ├── main.py
│       ├── config.py
│       ├── api/
│       │   ├── __init__.py
│       │   └── detection.py
│       ├── ml/
│       │   ├── __init__.py
│       │   ├── detector.py
│       │   └── counter.py
│       ├── models/
│       │   ├── __init__.py
│       │   └── detection.py
│       └── services/
│           ├── __init__.py
│           └── detection_service.py
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css
│       ├── services/api.ts
│       └── types/index.ts
├── ml/
│   ├── notebooks/
│   │   ├── 01a_preprocess_qasim21.ipynb
│   │   ├── 01b_preprocess_nexdata.ipynb
│   │   ├── 01c_preprocess_roboflow.ipynb
│   │   ├── 02_train.ipynb
│   │   └── 03_inference_demo.ipynb
│   ├── data/.gitkeep
│   ├── training/.gitkeep
│   └── models/.gitkeep
├── docs/.gitkeep
├── iot/                               # empty, future phase
└── scripts/.gitkeep
```

## How to run

Backend:
```bash
conda activate computer-vision
cd backend
uvicorn app.main:app --reload
```

Frontend:
```bash
cd frontend
npm run dev
```

Training (Google Colab):
1. Open ml/notebooks/01a_preprocess_qasim21.ipynb, add KAGGLE_API_TOKEN secret, run all
2. Open 01b_preprocess_nexdata.ipynb, run all (no auth needed)
3. Open 01c_preprocess_roboflow.ipynb, run all (no auth needed)
4. Open 02_train.ipynb, run all (merges datasets, trains YOLOv8s)
5. Open 03_inference_demo.ipynb to test
