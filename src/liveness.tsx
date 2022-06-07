import React, {useEffect, useRef, useState} from "react";
import {OCRLabs} from "./ocr_labs";
import * as Liveness from "liveness";

type RequestCameraOutcome =
  | { kind: "success"; stream: MediaStream }
  | { kind: "failed" };

const mediaConstraints: MediaStreamConstraints = {
  video: {
    facingMode: "user",
    aspectRatio: {exact: 16 / 9}
  },
  audio: false
};

export function ensureNotNull<T>(value: T, message?: string): NonNullable<T> {
  assertNonNull(value, message);

  return value;
}

export function assertNonNull<T>(
  value: T,
  message?: string
): asserts value is NonNullable<T> {
  if (value === undefined || value === null) {
    throw new Error(
      message ??
      `Expected value to be defined and non-null, but received ${
        value === undefined ? "`undefined`" : "`null`"
      } instead.`
    );
  }
}

const LIVENESS_STEP_TOTAL_DURATION_TIMEOUT_SECONDS = 30.0; // How long to wait before failing the step

export const LivenessDemo: React.VFC = () => {
  const videoElem = useRef<HTMLVideoElement>(null);
  const previewElem = useRef<HTMLVideoElement>(null);
  const [videoMounting, setVideoMounting] = useState(false);

  const [
    livenessTimeoutId,
    setLivenessTimeoutId
  ] = useState<null | NodeJS.Timeout>(null);
  const livenessTimeoutIdRef = useRef(livenessTimeoutId);
  const [faceDetected, setFaceDetected] = useState(false);
  const [smileDetected, setSmileDetected] = useState(false);

  const [readyToTestLiveness, setReadyToTestLiveness] = useState(false);

  const ocrLabs = new OCRLabs();

  const onPermissionDenied = () => {
  };
  const onPermissionGranted = () => {
    setReadyToTestLiveness(true);
  };

  const [ocrLabsSessionId, setOcrLabsSessionId] = useState<null | string>(null);
  const [ocrLabsTransactionId, setOcrLabsTransactionId] = useState<null | string>(null);

  const createOCRLabsSession = async () => {
    const response = await ocrLabs.createSession();
    setOcrLabsTransactionId(response.transaction_id);
    setOcrLabsSessionId(response.session_id);
  };

  const clearLivenessTimeoutIdIfExists = () => {
    if (livenessTimeoutIdRef.current) {
      clearTimeout(livenessTimeoutIdRef.current);
      setLivenessTimeoutId(null);
      livenessTimeoutIdRef.current = null;
    }
  };

  const detectFace = async () => {
    try {
      await Liveness.detect("face", {
        retry: true,
        // Because the step is retryable, cut the timeout in half
        timeout: LIVENESS_STEP_TOTAL_DURATION_TIMEOUT_SECONDS / 2 * 1000
      });

      setFaceDetected(true);

      await detectSmile();
    } catch (_) {
      timeoutLiveness();
    }
  };

  const detectSmile = async () => {
    try {
      await Liveness.detect("smile", {
        retry: true,
        // Because the step is retryable, cut the timeout in half
        timeout: LIVENESS_STEP_TOTAL_DURATION_TIMEOUT_SECONDS / 2 * 1000
      });

      console.log("smile detected");
      setSmileDetected(true);
      Liveness.close();
    } catch (_) {
      timeoutLiveness();
    }
  };

  const timeoutLiveness = () => {
    clearLivenessTimeoutIdIfExists();

    Liveness.close();
  };

  useEffect(() => {
    if (!ocrLabsSessionId) return;

    const createLivenessSession = async () => {
      try {
        const session = await Liveness.createSession(
          "wss://engine.us.v3.liveness.idkit.io",
          {
            videoElement: videoElem.current!,
            auth: {
              session_id: ensureNotNull(ocrLabsSessionId),
              tx_id: ensureNotNull(ocrLabsTransactionId)
            }
          }
        );
        console.log("Liveness session created", session);

        await detectFace();
      } catch (error) {

        timeoutLiveness();
      }
    };

    createLivenessSession();
  }, [ocrLabsSessionId]);

  const requestCamera = async (): Promise<RequestCameraOutcome> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);

      return {kind: "success", stream};
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("getUserMedia error!", error);
      return {kind: "failed"};
    }
  };

  useEffect(() => {
    const mount = async (preview: HTMLVideoElement, video: HTMLVideoElement) => {
      const outcome = await requestCamera();
      if (outcome.kind === "failed") {
        onPermissionDenied();
        return;
      }

      onPermissionGranted();

      preview.srcObject = outcome.stream;
      video.srcObject = outcome.stream.clone();
      video.onloadedmetadata = () => {
        video.play();
      };
    };

    if (!previewElem.current) {
      throw new Error("No previewElem to mount to?");
    }

    if (!videoElem.current) {
      throw new Error("No videoElem to mount to?");
    }

    if (!videoMounting) {
      setVideoMounting(true);
      mount(previewElem.current, videoElem.current);
    }

    return () => {
      const video = previewElem.current;
      if (!video) throw new Error("No current previewElem on cleanup?");

      const stream = video.srcObject as MediaStream | null;
      // If there is no stream, we probably mounted and unmounted quickly
      if (!stream) return;
      stream.getTracks().forEach(track => track.stop());

      video.srcObject = null;
    };
  }, [previewElem.current, videoElem.current, videoMounting]);

  return (
    <div>
      <h1>Liveness Demo</h1>
      <div className="video-container">
        <div className="video-and-label">
          <h2>Preview</h2>
          <video
            data-private
            playsInline
            autoPlay
            ref={previewElem}
          />
        </div>
        <div className="video-and-label">
          <h2>Used for Liveness Streaming</h2>
          <video
            data-private
            playsInline
            autoPlay
            ref={videoElem}
          />
        </div>
      </div>
      {!ocrLabsSessionId && (
        <div>
          <button onClick={() => createOCRLabsSession()} disabled={!readyToTestLiveness}>Start liveness</button>
        </div>
      )}
      {readyToTestLiveness && (
        <div className="liveness_info">
          <div>Face detected: {faceDetected.toString()}</div>
          <div>Smile detected: {smileDetected.toString()}</div>
        </div>
      )}
    </div>
  );
};