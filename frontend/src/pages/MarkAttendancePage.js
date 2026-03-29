import { useState, useRef, useCallback } from "react";
import Webcam from "react-webcam";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, UserCheck, AlertCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function MarkAttendancePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [webcamReady, setWebcamReady] = useState(false);
  const [webcamError, setWebcamError] = useState(false);
  const webcamRef = useRef(null);

  const handleRecognize = useCallback(async () => {
    if (!webcamRef.current) return;
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) {
      toast.error("Failed to capture image");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const { data } = await axios.post(
        `${API}/attendance/mark`,
        { face_image: imageSrc },
        { withCredentials: true }
      );
      setResult(data);
      toast.success(data.message);
    } catch (err) {
      const detail = err.response?.data?.detail;
      const msg = typeof detail === "string" ? detail : "Recognition failed. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleReset = () => {
    setResult(null);
    setError(null);
  };

  return (
    <div className="space-y-6" data-testid="mark-attendance-page">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Mark Attendance</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Position your face in the camera and click recognize
        </p>
      </div>

      <div className="max-w-2xl mx-auto space-y-4">
        <Card className="border border-border overflow-hidden">
          <CardContent className="p-0">
            {webcamError ? (
              <div className="aspect-video bg-muted flex flex-col items-center justify-center gap-3">
                <AlertCircle size={40} className="text-muted-foreground" />
                <p className="text-sm text-muted-foreground text-center px-4">
                  Cannot access camera. Please allow camera permissions and refresh the page.
                </p>
              </div>
            ) : (
              <div className="relative bg-black aspect-video overflow-hidden">
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  screenshotQuality={0.8}
                  videoConstraints={{
                    width: 640,
                    height: 480,
                    facingMode: "user",
                  }}
                  onUserMedia={() => setWebcamReady(true)}
                  onUserMediaError={() => setWebcamError(true)}
                  className="w-full h-full object-cover"
                  data-testid="attendance-webcam"
                />
                {/* Reticle overlay */}
                <div className="absolute inset-10 pointer-events-none webcam-reticle">
                  <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-primary" />
                  <div className="absolute top-0 right-0 w-12 h-12 border-t-2 border-r-2 border-primary" />
                  <div className="absolute bottom-0 left-0 w-12 h-12 border-b-2 border-l-2 border-primary" />
                  <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-primary" />
                </div>
                {/* Status indicator */}
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <div
                    className={`w-2.5 h-2.5 ${
                      webcamReady ? "bg-green-500" : "bg-yellow-500"
                    } animate-pulse`}
                  />
                  <span className="text-xs text-white/80 bg-black/50 px-2 py-0.5">
                    {webcamReady ? "CAMERA ACTIVE" : "INITIALIZING..."}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button
            onClick={handleRecognize}
            disabled={!webcamReady || loading || webcamError}
            className="flex-1 gap-2"
            size="lg"
            data-testid="recognize-btn"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent animate-spin" />
                Recognizing...
              </>
            ) : (
              <>
                <Camera size={18} />
                Recognize & Mark Attendance
              </>
            )}
          </Button>
          {(result || error) && (
            <Button
              variant="outline"
              size="lg"
              onClick={handleReset}
              className="gap-2"
              data-testid="reset-btn"
            >
              <RotateCcw size={16} />
              Reset
            </Button>
          )}
        </div>

        {/* Success Result */}
        {result && (
          <Card
            className="border-2 border-green-500/50 bg-green-500/5"
            data-testid="attendance-success"
          >
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <UserCheck size={20} className="text-green-500" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-lg">{result.name}</h3>
                  <p className="text-sm text-muted-foreground font-mono">
                    ID: {result.employee_id}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <span>
                      Time: <strong>{result.time}</strong>
                    </span>
                    <span>
                      Date: <strong>{result.date}</strong>
                    </span>
                    <span>
                      Confidence: <strong>{result.confidence?.toFixed(1)}</strong>
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Result */}
        {error && (
          <Card
            className="border-2 border-destructive/50 bg-destructive/5"
            data-testid="attendance-error"
          >
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-destructive/20 flex items-center justify-center flex-shrink-0">
                  <AlertCircle size={20} className="text-destructive" />
                </div>
                <div>
                  <h3 className="font-black text-lg">Recognition Failed</h3>
                  <p className="text-sm text-muted-foreground mt-1">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
