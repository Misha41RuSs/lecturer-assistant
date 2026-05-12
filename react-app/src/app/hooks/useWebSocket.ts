import { useEffect } from "react";

export function useLectureSocket(
  lectureId: number,
  onSlideChange: (slideId: number) => void
) {
  useEffect(() => {
    const WS_URL = import.meta.env.VITE_WS_URL;
    const ws = new WebSocket(
      `${WS_URL}/ws/broadcasting/${lectureId}`
    );

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "SLIDE_CHANGED") {
        onSlideChange(data.slideId);
      }
    };

    return () => {
      ws.close();
    };
  }, [lectureId]);
}