import { useCallback, useEffect, useRef, useState } from "react";
import type {
  NoteView,
  PolishState,
  SessionMessage,
  SessionState,
} from "../shared/types";

export function App() {
  const [view, setView] = useState<NoteView>({ kind: "loading" });
  const [draft, setDraft] = useState("");
  const [sent, setSent] = useState(false); // a draft was submitted, awaiting completion
  const [inlineHint, setInlineHint] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftRef = useRef<HTMLTextAreaElement | null>(null);
  const [polishDraft, setPolishDraft] = useState("");
  const [polishSent, setPolishSent] = useState(false);
  const [polishHint, setPolishHint] = useState(false);

  const session = view.kind === "session" ? view.state : null;
  const polish = view.kind === "polish" ? view.state : null;

  // Recover state after a renderer reload (story 8: survives reloads).
  useEffect(() => {
    void window.electronAPI.thread.get().then((state) => {
      if (state) setView({ kind: "session", state });
    });
    void window.electronAPI.polish.get().then((state) => {
      if (state) setView({ kind: "polish", state });
    });
  }, []);

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

  // Clear the draft once a send round-trip completed successfully.
  useEffect(() => {
    if (session && sent && !session.sending && !session.sendError) {
      setDraft("");
      setSent(false);
      setInlineHint(false);
    }
    if (session && sent && session.sendError) {
      setSent(false); // keep the draft text in the box
    }
  }, [session, sent]);

  // Clear the polish feedback once a revision round completed successfully.
  useEffect(() => {
    if (polish && polishSent && !polish.sending && !polish.error) {
      setPolishDraft("");
      setPolishSent(false);
      setPolishHint(false);
    }
    if (polish && polishSent && polish.error) {
      setPolishSent(false); // keep the feedback in the box
    }
  }, [polish, polishSent]);

  const copy = useCallback((text: string, id: string) => {
    window.electronAPI.note.copy(text);
    setCopiedId(id);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopiedId(null), 1500);
  }, []);

  const send = useCallback(() => {
    if (!session || session.sending) return;
    if (!draft.trim()) {
      setInlineHint(true);
      return;
    }
    window.electronAPI.note.send(draft);
    setSent(true);
    setInlineHint(false);
  }, [session, draft]);

  const sendPolishFeedback = useCallback(() => {
    if (!polish || polish.sending) return;
    if (!polishDraft.trim()) {
      setPolishHint(true);
      return;
    }
    window.electronAPI.polish.send(polishDraft);
    setPolishSent(true);
    setPolishHint(false);
  }, [polish, polishDraft]);

  const onDraftKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Multi-Code ComposeBox convention: Enter sends, Shift+Enter newline.
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="note">
      <header className="note-header">
        <span className="note-title">said-wat</span>
        <button
          className="note-close"
          title="关闭 (Esc)"
          onClick={() => window.electronAPI.note.dismiss()}
        >
          ✕
        </button>
      </header>
      <div className="note-body">
        {view.kind === "loading" && (
          <div className="note-state">
            <span className="spinner" aria-hidden="true" />
            <p>{view.label ?? "分析中…"}</p>
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
          <AnalysisSections
            translation={view.analysis.translation}
            summary={view.analysis.summary}
            notablePoints={view.analysis.notablePoints}
            copy={copy}
            copiedId={copiedId}
          />
        )}
        {session && (
          <SessionWorkspace
            state={session}
            draft={draft}
            setDraft={setDraft}
            setInlineHint={setInlineHint}
            onDraftKeyDown={onDraftKeyDown}
            send={send}
            inlineHint={inlineHint}
            copiedId={copiedId}
            copy={copy}
            draftRef={draftRef}
          />
        )}
        {view.kind === "polish" && (
          <PolishWorkspace
            state={view.state}
            draft={polishDraft}
            setDraft={setPolishDraft}
            setHint={setPolishHint}
            hint={polishHint}
            send={sendPolishFeedback}
            copiedId={copiedId}
            copy={copy}
          />
        )}
      </div>
    </div>
  );
}

function AnalysisSections(props: {
  translation: string;
  summary: string;
  notablePoints: string;
  copy: (text: string, id: string) => void;
  copiedId: string | null;
}) {
  const sections: Array<[string, string, string]> = [
    ["全文翻译", props.translation, "analysis-t"],
    ["一句话总结", props.summary, "analysis-s"],
    ["值得注意的点", props.notablePoints, "analysis-n"],
  ];
  return (
    <div className="analysis">
      {sections.map(([title, text, id]) => (
        <section className="analysis-section" key={id}>
          <div className="section-head">
            <h2>{title}</h2>
            <button
              className="copy-button tiny"
              onClick={() => props.copy(text, id)}
            >
              {props.copiedId === id ? "已复制 ✓" : "复制"}
            </button>
          </div>
          <p className={id === "analysis-t" ? "analysis-translation" : undefined}>
            {text}
          </p>
        </section>
      ))}
    </div>
  );
}

function PolishWorkspace(props: {
  state: PolishState;
  draft: string;
  setDraft: (d: string) => void;
  setHint: (b: boolean) => void;
  hint: boolean;
  send: () => void;
  copiedId: string | null;
  copy: (text: string, id: string) => void;
}) {
  const { state } = props;
  return (
    <div className="polish">
      <section className="analysis-section">
        <div className="section-head">
          <h2>原文</h2>
          <button
            className="copy-button tiny"
            onClick={() => props.copy(state.original, "polish-original")}
          >
            {props.copiedId === "polish-original" ? "已复制 ✓" : "复制"}
          </button>
        </div>
        <p className="muted">{state.original}</p>
      </section>

      {state.revisions.map((rev, i) => (
        <section className="analysis-section" key={`r${i}`}>
          <div className="section-head">
            <h2>{i === 0 ? "润色结果" : `修改 ${i}`}</h2>
            <button
              className="copy-button tiny"
              onClick={() => props.copy(rev.text, `polish-r${i}`)}
            >
              {props.copiedId === `polish-r${i}` ? "已复制 ✓" : "复制"}
            </button>
          </div>
          {rev.feedback && (
            <p className="feedback-label">意见：{rev.feedback}</p>
          )}
          <p className="polished">{rev.text}</p>
        </section>
      ))}

      {state.sending && (
        <div className="sending">
          <span className="spinner small" aria-hidden="true" />
          <span>润色中…</span>
        </div>
      )}
      {state.error && (
        <div className="polish-error">
          <p>{state.error}</p>
          <button
            className="copy-button small"
            onClick={() => window.electronAPI.note.retry()}
          >
            重试
          </button>
        </div>
      )}

      <div className="draft-box">
        <textarea
          value={props.draft}
          onChange={(e) => {
            props.setDraft(e.target.value);
            if (e.target.value.trim()) props.setHint(false);
          }}
          onKeyDown={(e) => {
            // Multi-Code ComposeBox convention: Enter sends, Shift+Enter newline.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              props.send();
            }
          }}
          placeholder="不满意？说说意见，例如「语气太生硬」「需要说得更细一点」（Enter 发送）"
          rows={2}
          disabled={state.sending}
        />
        <div className="draft-actions">
          {props.hint && <span className="inline-hint">内容不能为空</span>}
          <button className="primary" onClick={props.send} disabled={state.sending}>
            发送意见
          </button>
        </div>
      </div>
    </div>
  );
}

function SessionWorkspace(props: {
  state: SessionState;
  draft: string;
  setDraft: (d: string) => void;
  setInlineHint: (b: boolean) => void;
  onDraftKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  send: () => void;
  inlineHint: boolean;
  copiedId: string | null;
  copy: (text: string, id: string) => void;
  draftRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const { state } = props;
  return (
    <div className="session">
      <AnalysisSections
        translation={state.analysis.translation}
        summary={state.analysis.summary}
        notablePoints={state.analysis.notablePoints}
        copy={props.copy}
        copiedId={props.copiedId}
      />
      {state.truncated && (
        <p className="truncated-note">（较早的对话已被省略）</p>
      )}
      {state.messages.length > 0 && (
        <div className="thread">
          {state.messages.map((m, i) => (
            <ThreadMessageRow
              key={`${i}-${m.content.slice(0, 12)}`}
              message={m}
              index={i}
              copiedId={props.copiedId}
              copy={props.copy}
            />
          ))}
        </div>
      )}
      {state.sending && (
        <div className="sending">
          <span className="spinner small" aria-hidden="true" />
          <span>回复中…</span>
        </div>
      )}
      {state.sendError && <p className="send-error">{state.sendError}</p>}
      <div className="draft-box">
        <textarea
          ref={props.draftRef}
          value={props.draft}
          onChange={(e) => {
            props.setDraft(e.target.value);
            if (e.target.value.trim()) props.setInlineHint(false);
          }}
          onKeyDown={props.onDraftKeyDown}
          placeholder="用中文或英文输入你的回复…（Enter 发送，Shift+Enter 换行）"
          rows={3}
          disabled={state.sending}
        />
        <div className="draft-actions">
          {props.inlineHint && <span className="inline-hint">内容不能为空</span>}
          <button className="primary" onClick={props.send} disabled={state.sending}>
            发送
          </button>
        </div>
      </div>
    </div>
  );
}

function ThreadMessageRow(props: {
  message: SessionMessage;
  index: number;
  copiedId: string | null;
  copy: (text: string, id: string) => void;
}) {
  const { message } = props;
  const id = `m${props.index}`;
  if (message.role === "user") {
    return (
      <div className="thread-message user">
        <div className="bubble">{message.content}</div>
        <button
          className="copy-button small"
          onClick={() => props.copy(message.content, id)}
        >
          {props.copiedId === id ? "已复制 ✓" : "复制"}
        </button>
      </div>
    );
  }
  return (
    <div className="thread-message assistant">
      <div className="judgement">
        {message.answered === true
          ? "已回答 ✓"
          : message.answered === false
            ? "未回答 ⚠"
            : ""}
      </div>
      {message.warning && <div className="warning">{message.warning}</div>}
      <div className="bubble">{message.content}</div>
      <button
        className="copy-button small"
        onClick={() => props.copy(message.content, id)}
      >
        {props.copiedId === id ? "已复制 ✓" : "复制"}
      </button>
    </div>
  );
}
