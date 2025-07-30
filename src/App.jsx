import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { FaMicrophone } from "react-icons/fa";
import { jsPDF } from "jspdf";

export default function App() {
  const [file, setFile] = useState(null);
  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [audioURL, setAudioURL] = useState(null);
  const [showWave, setShowWave] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [success, setSuccess] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (recording) {
      timerRef.current = setInterval(() => setRecordTime((prev) => prev + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
  }, [recording]);

  const startRecording = async () => {
    setTranscript("");
    setSuccess(false);
    setFile(null);
    setAudioURL(null);
    setRecordedBlob(null);
    setRecordTime(0);
    setShowWave(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);
      setRecording(true);

      const chunks = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/mp3" });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
        setShowWave(false);
      };

      recorder.start();
    } catch (err) {
      alert("Microphone access denied.");
      setRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      setRecording(false);
    }
  };

  const handleUpload = async () => {
    if (!file && !recordedBlob) return alert("Please upload or record an MP3 file.");

    setLoading(true);
    setSuccess(false);
    try {
      const formData = new FormData();
      if (file) formData.append("audio", file);
      else if (recordedBlob) {
        const mp3File = new File([recordedBlob], "recorded.mp3", { type: "audio/mp3" });
        formData.append("audio", mp3File);
      }

      const response = await axios.post("http://localhost:5000/upload", formData);
      setTranscript(response.data.transcript);
      setSuccess(true);
    } catch (error) {
      alert("Transcription failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setTranscript("");
    setAudioURL(null);
    setRecordedBlob(null);
    setRecordTime(0);
    setRecording(false);
    setShowWave(false);
    setSuccess(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(transcript);
    alert("Transcript copied to clipboard.");
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.text("Speech-to-Text Transcript", 10, 10);
    doc.setFontSize(12);
    doc.text(transcript, 10, 20);
    doc.save("transcript.pdf");
  };

  const handleDownloadTXT = () => {
    const element = document.createElement("a");
    const fileBlob = new Blob([transcript], { type: "text/plain" });
    element.href = URL.createObjectURL(fileBlob);
    element.download = "transcript.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-50 via-white to-yellow-50 flex flex-col items-center">
      {/* Top Title Bar */}
      <header className="w-full py-4 shadow bg-white/60 backdrop-blur text-center text-xl font-semibold text-sky-700 tracking-wide">
        🎧 Speech-to-Text App
      </header>

      {/* Upload Section (Always visible) */}
      <div className="mt-6">
        <label className="bg-sky-600 hover:bg-sky-700 text-white py-2 px-4 rounded-lg transition cursor-pointer">
          Upload MP3 File
          <input
            type="file"
            accept=".mp3"
            onChange={(e) => {
              setFile(e.target.files[0]);
              setTranscript("");
              setSuccess(false);
              setRecordedBlob(null);
              setAudioURL(null);
            }}
            className="hidden"
          />
        </label>
        {file && <p className="mt-2 text-sm text-gray-700 text-center">{file.name}</p>}
      </div>

      {/* Card Container */}
      <div className="animate-fade-in bg-white/80 backdrop-blur-lg shadow-2xl border border-gray-300 rounded-3xl px-8 py-10 w-full max-w-2xl mt-8">
        <p className="text-center text-gray-600 mb-4">
          Upload an MP3 file or record your voice to get a transcript.
        </p>

        {(file || recordedBlob) && (
          <p className="text-center text-sm text-gray-700 mb-4">
            {file?.name || "🎙️ Recorded Audio Ready"}
          </p>
        )}

        <div className="flex flex-wrap justify-center items-center gap-4 mb-4">
          {!recording && (
            <button
              onClick={startRecording}
              className="bg-sky-600 hover:bg-sky-700 text-white py-3 px-6 rounded-lg font-semibold transition transform hover:scale-105"
            >
              Start Recording
            </button>
          )}
          {recording && (
            <button
              onClick={stopRecording}
              className="bg-red-500 hover:bg-red-600 text-white py-3 px-6 rounded-lg font-semibold transition"
            >
              Stop Recording ({recordTime}s)
            </button>
          )}
          <button
            onClick={handleUpload}
            disabled={loading || (!file && !recordedBlob)}
            className="bg-gray-800 text-white py-3 px-6 rounded-lg font-semibold transition disabled:bg-gray-400"
          >
            {loading ? "Transcribing..." : "Transcribe"}
          </button>
          <button
            onClick={handleReset}
            className="bg-white border border-sky-500 text-sky-600 py-3 px-6 rounded-lg hover:bg-sky-100 transition"
          >
            Reset
          </button>
        </div>

        {audioURL && (
          <div className="text-center mb-4">
            <audio controls src={audioURL} className="mx-auto" />
          </div>
        )}

        {showWave && (
          <div className="flex justify-center mb-6">
            <div className="flex gap-1 items-end h-10">
              {[...Array(10)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-sky-400 animate-pulse"
                  style={{ height: `${Math.random() * 40 + 10}px` }}
                />
              ))}
            </div>
          </div>
        )}

        {transcript && (
          <div className="mt-8 animate-fade-in">
            <h2 className="text-xl font-semibold text-gray-800 mb-2 border-b pb-1">Transcript:</h2>
            <div className="bg-gray-100 border border-gray-300 p-4 rounded-lg max-h-60 overflow-y-auto text-gray-700">
              {transcript}
            </div>

            {success && (
              <p className="mt-2 text-green-600 text-center font-medium">
                ✅ Transcription completed successfully!
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 mt-4 justify-center">
              <button
                onClick={handleCopy}
                className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded transition"
              >
                Copy Transcript
              </button>
              <button
                onClick={handleDownloadPDF}
                className="bg-indigo-500 hover:bg-indigo-600 text-white py-2 px-4 rounded transition"
              >
                Download as PDF
              </button>
              <button
                onClick={handleDownloadTXT}
                className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded transition"
              >
                Download as .txt
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
