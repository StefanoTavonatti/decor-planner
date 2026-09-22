/** Small shared UI pieces: modal, promise-based dialogs, toast. */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { create } from 'zustand';

/** Stack of open modals, so Escape only closes the topmost one. */
const modalStack: string[] = [];

export function Modal({
  title,
  onClose,
  children,
  footer,
  wide,
  fullscreen,
}: {
  title: string;
  onClose?(): void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  fullscreen?: boolean;
}) {
  const id = useId();
  useEffect(() => {
    modalStack.push(id);
    return () => {
      modalStack.splice(modalStack.indexOf(id), 1);
    };
  }, [id]);
  useEffect(() => {
    if (!onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modalStack[modalStack.length - 1] === id) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, id]);
  return (
    <div className="modal-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div
        className={`modal ${wide ? 'modal-wide' : ''} ${fullscreen ? 'modal-fullscreen' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="modal-header">
          <h2>{title}</h2>
          {onClose && (
            <button className="icon-btn" onClick={onClose} aria-label="Close">
              ✕
            </button>
          )}
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-footer">{footer}</footer>}
      </div>
    </div>
  );
}

type DialogRequest =
  | { kind: 'confirm'; title: string; message: ReactNode; confirmLabel: string; danger?: boolean; resolve(v: boolean): void }
  | { kind: 'prompt'; title: string; label: string; initial: string; resolve(v: string | null): void }
  | { kind: 'alert'; title: string; message: ReactNode; resolve(): void };

const useDialogs = create<{ current: DialogRequest | null }>(() => ({ current: null }));

export function confirmDialog(opts: { title: string; message: ReactNode; confirmLabel?: string; danger?: boolean }) {
  return new Promise<boolean>((resolve) =>
    useDialogs.setState({ current: { kind: 'confirm', confirmLabel: 'OK', ...opts, resolve } }),
  );
}

export function promptDialog(title: string, label: string, initial = '') {
  return new Promise<string | null>((resolve) =>
    useDialogs.setState({ current: { kind: 'prompt', title, label, initial, resolve } }),
  );
}

export function alertDialog(title: string, message: ReactNode) {
  return new Promise<void>((resolve) => useDialogs.setState({ current: { kind: 'alert', title, message, resolve } }));
}

function PromptBody({ req, done }: { req: Extract<DialogRequest, { kind: 'prompt' }>; done(v: string | null): void }) {
  const [value, setValue] = useState(req.initial);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.select(), []);
  return (
    <Modal
      title={req.title}
      onClose={() => done(null)}
      footer={
        <>
          <button className="btn" onClick={() => done(null)}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={!value.trim()} onClick={() => done(value.trim())}>
            OK
          </button>
        </>
      }
    >
      <label className="field">
        <span className="field-label">{req.label}</span>
        <span className="field-input">
          <input
            ref={ref}
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && value.trim() && done(value.trim())}
          />
        </span>
      </label>
    </Modal>
  );
}

export function DialogHost() {
  const req = useDialogs((s) => s.current);
  if (!req) return null;
  const close = () => useDialogs.setState({ current: null });
  if (req.kind === 'prompt') {
    return (
      <PromptBody
        req={req}
        done={(v) => {
          close();
          req.resolve(v);
        }}
      />
    );
  }
  if (req.kind === 'alert') {
    const done = () => {
      close();
      req.resolve();
    };
    return (
      <Modal title={req.title} onClose={done} footer={<button className="btn btn-primary" onClick={done}>OK</button>}>
        <div>{req.message}</div>
      </Modal>
    );
  }
  const done = (v: boolean) => {
    close();
    req.resolve(v);
  };
  return (
    <Modal
      title={req.title}
      onClose={() => done(false)}
      footer={
        <>
          <button className="btn" onClick={() => done(false)}>
            Cancel
          </button>
          <button className={`btn ${req.danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => done(true)} autoFocus>
            {req.confirmLabel}
          </button>
        </>
      }
    >
      <div>{req.message}</div>
    </Modal>
  );
}

// ---------------------------------------------------------------- toast

const useToast = create<{ message: string | null; id: number }>(() => ({ message: null, id: 0 }));

export function toast(message: string) {
  useToast.setState((s) => ({ message, id: s.id + 1 }));
}

export function ToastHost() {
  const { message, id } = useToast();
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => useToast.setState({ message: null }), 3500);
    return () => clearTimeout(t);
  }, [message, id]);
  return message ? (
    <div className="toast" role="status">
      {message}
    </div>
  ) : null;
}

/** Run an async action, surfacing errors in an alert. */
export async function withErrorAlert<T>(title: string, fn: () => Promise<T>): Promise<T | undefined> {
  try {
    return await fn();
  } catch (e) {
    console.error(e);
    await alertDialog(title, e instanceof Error ? e.message : String(e));
    return undefined;
  }
}
