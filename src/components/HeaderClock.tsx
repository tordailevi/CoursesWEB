"use client";

import { useEffect, useState } from "react";

export function HeaderClock() {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("hu-HU", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    };
    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span className="header-clock-large">
      {time || "--:--:--"}
    </span>
  );
}

