import { useEffect } from "react";

export function useLectureSocket(
  lectureId: number,
  onSlideChange: (slideId: number) => void
) {
  useEffect(() => {
    const ws = new WebSocket(
      `ws://localhost:8080/ws/broadcasting/${lectureId}`
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