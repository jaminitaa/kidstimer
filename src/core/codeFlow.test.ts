import { describe, expect, it } from 'vitest';
import { beginChange, beginCreate, CODE_FLOW_TITLES, codeFlowDelete, codeFlowDigit } from './codeFlow';
import type { CodeFlow } from './codeFlow';

type Result = { flow: CodeFlow | null; newPasscode: string | null };

function typeCode(flow: CodeFlow, digits: string, current: string | null): Result {
  let result: Result = { flow, newPasscode: null };
  for (const d of digits) {
    if (result.flow === null) break;
    result = codeFlowDigit(result.flow, d, current);
  }
  return result;
}

describe('code flow', () => {
  it('has titles', () => {
    expect(CODE_FLOW_TITLES).toEqual({
      current: 'Enter your current code', choose: 'Choose a 4-digit code', confirm: 'Enter it again',
    });
  });
  it('creates a passcode', () => {
    expect(beginCreate().step).toBe('choose');
    const mid = typeCode(beginCreate(), '2580', null);
    expect(mid.flow).toEqual({ step: 'confirm', first: '2580', entry: '', error: null });
    expect(mid.newPasscode).toBeNull();
    expect(typeCode(mid.flow as CodeFlow, '2580', null)).toEqual({ flow: null, newPasscode: '2580' });
  });
  it('restarts on a mismatch and clears the error on the next digit', () => {
    const mid = typeCode(beginCreate(), '2580', null);
    const bad = typeCode(mid.flow as CodeFlow, '1111', null);
    expect(bad.flow).toEqual({ step: 'choose', first: '', entry: '', error: "Those didn't match. Try again." });
    expect(bad.newPasscode).toBeNull();
    expect(codeFlowDigit(bad.flow as CodeFlow, '3', null).flow?.error).toBeNull();
  });
  it('checks the current code when changing', () => {
    expect(beginChange().step).toBe('current');
    const bad = typeCode(beginChange(), '0000', '2580');
    expect(bad.flow).toEqual({ step: 'current', first: '', entry: '', error: "That's not the current code." });
    const ok = typeCode(bad.flow as CodeFlow, '2580', '2580');
    expect(ok.flow).toEqual({ step: 'choose', first: '', entry: '', error: null });
  });
  it('treats a missing current code as wrong', () => {
    expect(typeCode(beginChange(), '2580', null).flow?.error).toBe("That's not the current code.");
  });
  it('deletes only entry digits', () => {
    const mid = typeCode(beginCreate(), '2580', null).flow as CodeFlow;
    const typed = typeCode(mid, '12', null).flow as CodeFlow;
    expect(codeFlowDelete(typed)).toEqual({ ...typed, entry: '1' });
    expect(codeFlowDelete(mid)).toEqual(mid);
  });
  it('ignores non-digits', () => {
    const flow = beginCreate();
    expect(codeFlowDigit(flow, 'x', null)).toEqual({ flow, newPasscode: null });
  });
});
