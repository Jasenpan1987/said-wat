import { useCallback, useEffect, useRef, useState } from "react";
import type { HotkeyName, SettingsState } from "../../shared/types";

const MODELS: Array<{ value: string; label: string }> = [
  { value: "kimi-k2.6", label: "kimi-k2.6（默认 · 非思考）" },
  { value: "kimi-k2.7-code", label: "kimi-k2.7-code" },
];

// Electron accelerator → display symbols, e.g. Command+Shift+S → ⌘⇧S.
const SYMBOL_ORDER: Array<[string, string]> = [
  ["Command", "⌘"],
  ["Control", "⌃"],
  ["Alt", "⌥"],
  ["Shift", "⇧"],
];

function formatAccelerator(accelerator: string): string {
  return accelerator
    .split("+")
    .map((part) => SYMBOL_ORDER.find(([name]) => name === part)?.[1] ?? part)
    .join("");
}

// Modifier-only presses are ignored while recording — the next non-modifier
// key completes the combo.
const MODIFIER_KEYS = new Set(["Meta", "Control", "Alt", "Shift", "CapsLock"]);

function keyPart(e: KeyboardEvent): string | null {
  const key = e.key;
  if (/^[a-zA-Z]$/.test(key)) return key.toUpperCase();
  if (/^[0-9]$/.test(key)) return key;
  if (/^F([1-9]|1[0-9]|2[0-4])$/.test(key)) return key;
  if (key === " ") return "Space";
  if (key === "ArrowUp") return "Up";
  if (key === "ArrowDown") return "Down";
  if (key === "ArrowLeft") return "Left";
  if (key === "ArrowRight") return "Right";
  return null;
}

type Built = { accelerator: string } | { error: string };

function buildAccelerator(e: KeyboardEvent): Built {
  const key = keyPart(e);
  if (!key) {
    return { error: "不支持的按键，请使用字母、数字或功能键。" };
  }
  const parts: string[] = [];
  if (e.metaKey) parts.push("Command");
  if (e.ctrlKey) parts.push("Control");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey) parts.push("Shift");
  parts.push(key);
  const accelerator = parts.join("+");

  const hasStrongModifier = e.metaKey || e.ctrlKey || e.altKey || /^F\d+$/.test(key);
  if (!hasStrongModifier) {
    return { error: "请至少包含 ⌘、⌃ 或 ⌥（或使用功能键）。" };
  }
  // The universal close/quit shortcuts stay untouched (T-004 requirement).
  if (accelerator === "Command+W" || accelerator === "Command+Q") {
    return { error: "⌘W / ⌘Q 是系统保留快捷键。" };
  }
  return { accelerator };
}

interface RowMessage {
  text: string;
  ok: boolean;
}

export function SettingsApp() {
  const [settings, setSettings] = useState<SettingsState | null>(null);
  const [recording, setRecording] = useState<HotkeyName | null>(null);
  const [messages, setMessages] = useState<Record<HotkeyName, RowMessage | null>>({
    capture: null,
    polish: null,
  });
  const [savedFlash, setSavedFlash] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(
    null
  );
  const msgTimers = useRef<Record<HotkeyName, ReturnType<typeof setTimeout> | null>>({
    capture: null,
    polish: null,
  });
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void window.electronAPI.settings.get().then(setSettings);
  }, []);

  const setRowMessage = useCallback((name: HotkeyName, msg: RowMessage | null) => {
    setMessages((m) => ({ ...m, [name]: msg }));
    if (msgTimers.current[name]) clearTimeout(msgTimers.current[name]!);
    if (msg) {
      msgTimers.current[name] = setTimeout(() => {
        setMessages((m) => ({ ...m, [name]: null }));
      }, 4000);
    }
  }, []);

  const startRecording = useCallback(
    (name: HotkeyName) => {
      window.electronAPI.settings.setRecording(true);
      setRowMessage(name, null);
      setRecording(name);
    },
    [setRowMessage]
  );

  const applyCombo = useCallback(
    async (name: HotkeyName, accelerator: string) => {
      if (!settings) return;
      const report = await window.electronAPI.settings.setHotkeys({
        ...settings.hotkeys,
        [name]: accelerator,
      });
      const fresh = await window.electronAPI.settings.get();
      setSettings(fresh);
      setRecording(null);
      const result = report[name];
      if (result?.ok) {
        setRowMessage(name, {
          text: `已设置为 ${formatAccelerator(accelerator)} ✓`,
          ok: true,
        });
      } else {
        setRowMessage(name, { text: result?.reason ?? "设置失败", ok: false });
      }
    },
    [settings, setRowMessage]
  );

  useEffect(() => {
    if (!recording) return;
    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Escape") {
        setRecording(null);
        return;
      }
      if (e.repeat || MODIFIER_KEYS.has(e.key)) return;
      const built = buildAccelerator(e);
      if ("error" in built) {
        setRowMessage(recording, { text: built.error, ok: false });
        return;
      }
      void applyCombo(recording, built.accelerator);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      // The main-process guard (⌘W/⌘Q/⌘R during recording) ends with it.
      window.electronAPI.settings.setRecording(false);
    };
  }, [recording, settings, applyCombo, setRowMessage]);

  const changeModel = async (value: string) => {
    const model = value === "kimi-k2.6" ? null : value;
    await window.electronAPI.settings.setModel(model);
    setSettings(await window.electronAPI.settings.get());
    setSavedFlash(true);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setSavedFlash(false), 2000);
  };

  const test = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await window.electronAPI.settings.testConnection();
    setTestResult(result);
    setTesting(false);
  };

  if (!settings) {
    return <div className="settings-body center">加载中…</div>;
  }

  return (
    <div className="settings-body">
      <section className="settings-section">
        <h2>快捷键</h2>
        <HotkeyRow
          label="截图"
          accelerator={settings.hotkeys.capture}
          recording={recording === "capture"}
          message={messages.capture}
          onRecord={() => startRecording("capture")}
        />
        <HotkeyRow
          label="润色"
          accelerator={settings.hotkeys.polish}
          recording={recording === "polish"}
          message={messages.polish}
          onRecord={() => startRecording("polish")}
        />
        <p className="hint">修改后立即生效并保存。⌘W / ⌘Q 为系统保留。</p>
      </section>

      <section className="settings-section">
        <h2>模型</h2>
        <div className="field-row">
          <select
            className="model-select"
            value={settings.model ?? "kimi-k2.6"}
            onChange={(e) => void changeModel(e.target.value)}
          >
            {MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          {savedFlash && <span className="saved-flash">已保存 ✓</span>}
        </div>
        <p className="hint">
          kimi-k2.6 为默认非思考模型（更省）；kimi-k2.7-code 面向代码/技术场景。
        </p>
      </section>

      <section className="settings-section">
        <h2>API Key</h2>
        <div className="field-row">
          <span className={`key-status ${settings.apiKeySet ? "ok" : "err"}`}>
            {settings.apiKeySet
              ? "✓ MOONSHOT_API_KEY 已设置"
              : "✗ 未检测到 MOONSHOT_API_KEY"}
          </span>
          <button className="ghost" onClick={test} disabled={testing}>
            {testing ? "测试中…" : "测试连接"}
          </button>
        </div>
        {testResult && (
          <p className={`row-msg ${testResult.ok ? "ok" : "err"}`}>
            {testResult.message}
          </p>
        )}
        {!settings.apiKeySet && (
          <p className="hint">
            请在项目根目录 .env 中配置 MOONSHOT_API_KEY 后重启应用。
          </p>
        )}
      </section>

      <p className="footnote">设置保存在用户配置目录，重启后保留。</p>
    </div>
  );
}

function HotkeyRow(props: {
  label: string;
  accelerator: string;
  recording: boolean;
  message: RowMessage | null;
  onRecord: () => void;
}) {
  return (
    <div className="hotkey-row">
      <span className="hotkey-label">{props.label}</span>
      <kbd>{formatAccelerator(props.accelerator)}</kbd>
      {props.recording ? (
        <span className="recording">按下新快捷键…（Esc 取消）</span>
      ) : (
        <button className="ghost" onClick={props.onRecord}>
          改键
        </button>
      )}
      {props.message && (
        <p className={`row-msg ${props.message.ok ? "ok" : "err"}`}>
          {props.message.text}
        </p>
      )}
    </div>
  );
}
