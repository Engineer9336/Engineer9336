import { useState, useRef, useCallback } from "react";
import Webcam from "react-webcam";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, X, UserPlus, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const MIN_SAMPLES = 5;

export default function RegisterUserPage() {
  const [name, setName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [captures, setCaptures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [webcamReady, setWebcamReady] = useState(false);
  const [webcamError, setWebcamError] = useState(false);
  const webcamRef = useRef(null);

  const capture = useCallback(() => {
    if (!webcamRef.current) return;
    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) {
      setCaptures((prev) => [...prev, imageSrc]);
      toast.info(`Sample ${captures.length + 1} captured`);
    }
  }, [captures.length]);

  const removeCapture = (index) => {
    setCaptures((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!name.trim() || !employeeId.trim()) {
      toast.error("Please fill in name and employee ID");
      return;
    }
    if (captures.length < MIN_SAMPLES) {
      toast.error(`Please capture at least ${MIN_SAMPLES} face samples`);
      return;
    }
    setLoading(true);
    try {
      const { data } = await axios.post(
        `${API}/users/register`,
        {
          name: name.trim(),
          employee_id: employeeId.trim(),
          face_images: captures,
        },
        { withCredentials: true }
      );
      toast.success(
        `${data.name} registered successfully with ${data.face_count} face samples!`
      );
      setName("");
      setEmployeeId("");
      setCaptures([]);
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast.error(
        typeof detail === "string" ? detail : "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="register-user-page">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Register User</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Add a new user with face data for attendance recognition
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Form + Webcam */}
        <div className="space-y-4">
          <Card className="border border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-black">User Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold tracking-[0.15em] uppercase">
                  Full Name
                </Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  data-testid="register-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold tracking-[0.15em] uppercase">
                  Employee ID
                </Label>
                <Input
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="EMP001"
                  data-testid="register-id-input"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-black">Face Capture</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {webcamError ? (
                <div className="aspect-video bg-muted flex flex-col items-center justify-center gap-3 border border-border">
                  <AlertCircle size={32} className="text-muted-foreground" />
                  <p className="text-sm text-muted-foreground text-center px-4">
                    Cannot access camera. Please allow camera permissions and refresh.
                  </p>
                </div>
              ) : (
                <div className="relative border border-border bg-black aspect-video overflow-hidden">
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
                    data-testid="register-webcam"
                  />
                  {/* Reticle corners */}
                  <div className="absolute inset-6 pointer-events-none webcam-reticle">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary" />
                  </div>
                </div>
              )}
              <Button
                onClick={capture}
                disabled={!webcamReady || webcamError}
                className="w-full gap-2"
                data-testid="capture-face-btn"
              >
                <Camera size={16} />
                Capture Sample ({captures.length}/{MIN_SAMPLES} min)
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right: Captured Samples + Submit */}
        <div className="space-y-4">
          <Card className="border border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-black">
                Captured Samples ({captures.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {captures.length === 0 ? (
                <div className="py-12 text-center">
                  <Camera
                    size={40}
                    className="mx-auto text-muted-foreground mb-3"
                  />
                  <p className="text-sm text-muted-foreground">
                    No samples captured yet.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Position your face in the camera and click Capture.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {captures.map((img, i) => (
                    <div key={i} className="relative group aspect-square">
                      <img
                        src={img}
                        alt={`Sample ${i + 1}`}
                        className="w-full h-full object-cover border border-border"
                      />
                      <button
                        onClick={() => removeCapture(i)}
                        className="absolute top-1 right-1 w-5 h-5 bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        data-testid={`remove-sample-${i}`}
                      >
                        <X size={12} />
                      </button>
                      <span className="absolute bottom-0 left-0 right-0 text-center text-[10px] bg-black/60 text-white py-0.5">
                        #{i + 1}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Button
            onClick={handleSubmit}
            disabled={
              loading ||
              captures.length < MIN_SAMPLES ||
              !name.trim() ||
              !employeeId.trim()
            }
            className="w-full gap-2"
            size="lg"
            data-testid="register-submit-btn"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent animate-spin" />
                Processing face data...
              </>
            ) : captures.length >= MIN_SAMPLES ? (
              <>
                <Check size={18} />
                Register User
              </>
            ) : (
              <>
                <UserPlus size={18} />
                {MIN_SAMPLES - captures.length} more sample(s) needed
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
