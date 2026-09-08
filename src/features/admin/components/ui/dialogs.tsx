'use client';

import { useEffect, useRef, useState } from 'react';
import AdminModal from './AdminModal';
import Button from './Button';

/**
 * กล่องโต้ตอบแบบสั่งงานได้ (imperative) มาแทน `confirm()` / `prompt()` / `alert()` ของเบราว์เซอร์
 *
 * ออกแบบให้คืนค่าเป็น Promise เพื่อให้แทนที่โค้ดเดิมได้แบบบรรทัดต่อบรรทัด
 * เช่น `if (!confirm('ลบ?')) return;` → `if (!(await confirmDialog({ title: 'ลบ?' }))) return;`
 * โดยไม่ต้องรื้อโครง state ของ hook เดิม
 *
 * ต้อง mount <DialogHost /> ไว้หนึ่งครั้งใน shell ของ admin
 */

type ConfirmRequest = {
  kind: 'confirm';
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  resolve: (value: boolean) => void;
};

type PromptRequest = {
  kind: 'prompt';
  title: string;
  message?: string;
  defaultValue?: string;
  placeholder?: string;
  inputMode?: 'text' | 'numeric';
  resolve: (value: string | null) => void;
};

type AlertRequest = {
  kind: 'alert';
  title: string;
  message?: string;
  danger?: boolean;
  resolve: () => void;
};

type DialogRequest = ConfirmRequest | PromptRequest | AlertRequest;

const queue: DialogRequest[] = [];
let notify: (() => void) | null = null;

function push(req: DialogRequest) {
  queue.push(req);
  notify?.();
}

export function confirmDialog(opts: Omit<ConfirmRequest, 'kind' | 'resolve'>): Promise<boolean> {
  return new Promise(resolve => push({ kind: 'confirm', ...opts, resolve }));
}

export function promptDialog(opts: Omit<PromptRequest, 'kind' | 'resolve'>): Promise<string | null> {
  return new Promise(resolve => push({ kind: 'prompt', ...opts, resolve }));
}

export function alertDialog(opts: Omit<AlertRequest, 'kind' | 'resolve'>): Promise<void> {
  return new Promise(resolve => push({ kind: 'alert', ...opts, resolve }));
}

export function DialogHost() {
  const [, forceRender] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const current = queue[0];

  useEffect(() => {
    notify = () => forceRender(n => n + 1);
    return () => {
      notify = null;
    };
  }, []);

  if (!current) return null;

  const finish = (run: () => void) => {
    queue.shift();
    run();
    forceRender(n => n + 1);
  };

  const cancel = () =>
    finish(() => {
      if (current.kind === 'confirm') current.resolve(false);
      else if (current.kind === 'prompt') current.resolve(null);
      else current.resolve();
    });

  const accept = () =>
    finish(() => {
      if (current.kind === 'confirm') current.resolve(true);
      else if (current.kind === 'prompt') current.resolve(inputRef.current?.value ?? '');
      else current.resolve();
    });

  const danger = current.kind !== 'prompt' && current.danger;

  return (
    <AdminModal
      size="sm"
      onClose={cancel}
      icon={danger ? '⚠️' : current.kind === 'prompt' ? '✏️' : 'ℹ️'}
      title={current.title}
      footer={
        <>
          {current.kind !== 'alert' && (
            <Button variant="ghost" onClick={cancel}>
              {current.kind === 'confirm' ? (current.cancelLabel ?? 'ยกเลิก') : 'ยกเลิก'}
            </Button>
          )}
          <Button variant={danger ? 'danger' : 'primary'} onClick={accept} autoFocus>
            {current.kind === 'confirm'
              ? (current.confirmLabel ?? 'ยืนยัน')
              : current.kind === 'prompt'
                ? 'บันทึก'
                : 'รับทราบ'}
          </Button>
        </>
      }
    >
      {current.message && (
        <p className="text-sm text-[var(--ink-muted)] whitespace-pre-line">{current.message}</p>
      )}
      {current.kind === 'prompt' && (
        <input
          // uncontrolled + key: รีเซ็ตค่าเองเมื่อขึ้นกล่องใหม่ โดยไม่ต้อง setState ใน effect
          key={current.title}
          ref={inputRef}
          autoFocus
          inputMode={current.inputMode === 'numeric' ? 'numeric' : 'text'}
          defaultValue={current.defaultValue ?? ''}
          placeholder={current.placeholder}
          onKeyDown={e => {
            if (e.key === 'Enter') accept();
          }}
          // 16px กันไม่ให้ iOS ซูมหน้าจออัตโนมัติตอนโฟกัสช่องกรอก
          className="mt-3 w-full px-3.5 py-2.5 rounded-xl border border-[var(--hairline)] text-base text-[var(--ink)] bg-white focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40"
        />
      )}
    </AdminModal>
  );
}

export default DialogHost;
