declare module "liveness" {
  export function createSession(
    wss: string,
    config: LivenessSessionConfig
  ): Promise<{ sessionId: string }>;

  export interface LivenessSessionConfig {
    videoElement: HTMLVideoElement;
    auth: {
      session_id: string;
      tx_id: string;
    };
  }

  export function detect(
    action: "face" | "smile" | "head_left" | "head_right",
    config?: LivenessDetectionConfig
  ): Promise<void>;

  export interface LivenessDetectionConfig {
    retry?: boolean;
    onRepeat?: () => void;
    timeout?: number;
  }

  export function close(): Promise<void>;
}
