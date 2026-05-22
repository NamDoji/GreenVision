export interface Detection {
  bbox: [number, number, number, number];
  confidence: number;
  class_name: string;
}

export interface DetectionResult {
  timestamp: string;
  people_count: number;
  detections: Detection[];
}
