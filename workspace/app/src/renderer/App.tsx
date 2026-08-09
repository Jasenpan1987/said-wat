import { useEffect, useState } from "react";
import type { NoteView } from "../shared/types";

export function App() {
  const [view, setView] = useState<NoteView>({ kind: "loading" });

  useEffect(() => {
    const unsubscribe = window.electronAPI.note.onShow((payload) =>
      setView(payload.view)
    );
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        window.electronAPI.note.dismiss();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      unsubscribe();
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="note">
      <header className="note-header">
        <span className="note-title">said-wat</span>
        <button className="note-close" title="关闭 (Esc)" onClick={() => window.electronAPI.note.dismiss()}>
          ✕
        </button>
      </header>
      <div className="note-body">
        {view.kind === "loading" && (
          <div className="note-state">
            <span className="spinner" aria-hidden="true" />
            <p>分析中…</p>
          </div>
        )}
        {view.kind === "error" && (
          <div className="note-state note-error">
            <p>{view.message}</p>
            <button className="primary" onClick={() => window.electronAPI.note.retry()}>
              重试
            </button>
          </div>
        )}
        {view.kind === "analysis" && (
          <div className="analysis">
            <section className="analysis-section">
              <h2>全文翻译</h2>
              <p className="analysis-translation">{view.analysis.translation}</p>
            </section>
            <section className="analysis-section">
              <h2>一句话总结</h2>
              <p>{view.analysis.summary}</p>
            </section>
            <section className="analysis-section">
              <h2>值得注意的点</h2>
              <p>{view.analysis.notablePoints}</p>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
