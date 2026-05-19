import { forwardRef, useMemo, useRef, useState } from "react";
import { Dialog, Paper } from "@mui/material";

const DraggablePaper = forwardRef(function DraggablePaper({ disabled = false, style, ...props }, ref) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragRef = useRef(null);

  function handlePointerDown(event) {
    if (disabled || event.button !== 0) return;
    if (!event.target.closest(".MuiDialogTitle-root")) return;
    if (event.target.closest("button, input, textarea, select, [role='button']")) return;

    const rect = event.currentTarget.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
      width: rect.width,
      height: rect.height
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const nextX = drag.originX + event.clientX - drag.startX;
    const nextY = drag.originY + event.clientY - drag.startY;
    const maxX = Math.max(0, (window.innerWidth - drag.width) / 2);
    const maxY = Math.max(0, (window.innerHeight - drag.height) / 2);

    setPosition({
      x: Math.min(maxX, Math.max(-maxX, nextX)),
      y: Math.min(maxY, Math.max(-maxY, nextY))
    });
  }

  function stopDragging(event) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return (
    <Paper
      ref={ref}
      {...props}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
      style={{
        ...style,
        transform: disabled ? style?.transform : `${style?.transform || ""} translate(${position.x}px, ${position.y}px)`
      }}
    />
  );
});

export default function DraggableDialog({ fullScreen = false, PaperProps, ...props }) {
  const PaperComponent = useMemo(
    () =>
      forwardRef(function DialogPaper(paperProps, ref) {
        return <DraggablePaper ref={ref} disabled={fullScreen} {...paperProps} />;
      }),
    [fullScreen]
  );

  return (
    <Dialog
      fullScreen={fullScreen}
      PaperComponent={PaperComponent}
      PaperProps={{
        ...PaperProps,
        sx: {
          "& .MuiDialogTitle-root": {
            cursor: fullScreen ? "default" : "move",
            userSelect: "none"
          },
          ...PaperProps?.sx
        }
      }}
      {...props}
    />
  );
}
