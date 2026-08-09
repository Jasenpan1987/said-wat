import { useCallback, useEffect, useRef, useState } from "react";
import type { OverlayInitPayload, Rect } from "../../shared/types";
import { normalizeRect } from "../../shared/rect";
import "./overlay.css";

// Below this (DIPs), a drag counts as a click → cancel (WeChat behaviour).
const MIN_SELECTION = 3;

function pointInside(point: { x: number; y: number }, rect: Rect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

export function Overlay() {
  const [payload, setPayload] = useState<OverlayInitPayload | null>(null);
  // Set on drag end; drives the toolbar and Enter/double-click confirm.
  const [selection, setSelection] = useState<Rect | null>(null);
  const dragRef = useRef<{ startX: number; startY: number } | null>(null);
  const liveRectRef = useRef<HTMLDivElement | null>(null);
  const liveSizeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return window.electronAPI.capture.onInit(setPayload);
  }, []);

  const confirm = useCallback((rect: Rect) => {
    if (!payload) return;
    window.electronAPI.capture.confirm({ displayId: payload.displayId, rect });
  }, [payload]);
  const cancel = useCallback(() => {
    window.electronAPI.capture.cancel();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cancel();
      } else if (e.key === "Enter" && selection) {
        e.preventDefault();
        confirm(selection);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cancel, confirm, selection]);

  const bounds: Rect = payload
    ? { x: 0, y: 0, width: payload.imageWidth, height: payload.imageHeight }
    : { x: 0, y: 0, width: 0, height: 0 };

  const paintLiveRect = (rect: Rect) => {
    const el = liveRectRef.current;
    if (!el) return;
    el.style.left = `${rect.x}px`;
    el.style.top = `${rect.y}px`;
    el.style.width = `${rect.width}px`;
    el.style.height = `${rect.height}px`;
    el.style.display = "block";
    const size = liveSizeRef.current;
    if (size) {
      size.textContent = `${Math.round(rect.width)}x${Math.round(rect.height)}`;
      size.style.left = `${rect.x + rect.width + 8}px`;
      size.style.top = `${rect.y + rect.height + 8}px`;
      size.style.display = "block";
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!payload?.interactive || e.button !== 0) return;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Pointer capture is a nicety — drags still work without it.
    }
    dragRef.current = { startX: e.clientX, startY: e.clientY };
    setSelection(null);
    const el = liveRectRef.current;
    if (el) el.style.display = "none";
    const size = liveSizeRef.current;
    if (size) size.style.display = "none";
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    paintLiveRect(
      normalizeRect(
        { x: drag.startX, y: drag.startY },
        { x: e.clientX, y: e.clientY },
        bounds
      )
    );
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    const rect = normalizeRect(
      { x: drag.startX, y: drag.startY },
      { x: e.clientX, y: e.clientY },
      bounds
    );
    if (rect.width < MIN_SELECTION && rect.height < MIN_SELECTION) {
      // A click: cancel, unless it lands inside an existing selection where a
      // double-click will confirm instead.
      if (selection && pointInside({ x: e.clientX, y: e.clientY }, selection)) {
        return;
      }
      cancel();
      return;
    }
    setSelection(rect);
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    if (selection && pointInside({ x: e.clientX, y: e.clientY }, selection)) {
      confirm(selection);
    }
  };

  return (
    <div
      className="overlay"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={onDoubleClick}
    >
      {payload ? (
        <img
          className="snapshot"
          src={payload.dataUrl}
          width={payload.imageWidth}
          height={payload.imageHeight}
          draggable={false}
          alt=""
        />
      ) : (
        <div className="hint">Preparing capture…</div>
      )}
      <div className="selection" ref={liveRectRef} />
      <div className="selection-size" ref={liveSizeRef} />
      {selection && (
        <div
          className="toolbar"
          style={{ left: selection.x + selection.width, top: selection.y + selection.height }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            className="confirm"
            title="Confirm (Enter / double-click)"
            onClick={() => confirm(selection)}
          >
            ✓
          </button>
          <button className="cancel" title="Cancel (Esc)" onClick={cancel}>
            ✕
          </button>
        </div>
      )}
      {payload?.interactive && <div className="hint">Drag to select · Esc to cancel</div>}
    </div>
  );
}
