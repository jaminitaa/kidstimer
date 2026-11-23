import { PASSCODE_LENGTH } from './constants';
import { appendDigit, deleteDigit } from './passcode';

export type CodeFlow = {
  readonly step: 'current' | 'choose' | 'confirm';
  readonly first: string;
  readonly entry: string;
  readonly error: string | null;
};

type FlowResult = { readonly flow: CodeFlow | null; readonly newPasscode: string | null };

export const CODE_FLOW_TITLES: Record<CodeFlow['step'], string> = {
  current: 'Enter your current code',
  choose: 'Choose a 4-digit code',
  confirm: 'Enter it again',
};

const WRONG_CURRENT = "That's not the current code.";
const MISMATCH = "Those didn't match. Try again.";

const start = (step: CodeFlow['step']): CodeFlow => ({ step, first: '', entry: '', error: null });

export const beginCreate = (): CodeFlow => start('choose');
export const beginChange = (): CodeFlow => start('current');

const stay = (flow: CodeFlow): FlowResult => ({ flow, newPasscode: null });

/** Handles a full 4-digit entry for the flow's current step. */
function completeEntry(flow: CodeFlow, entry: string, currentPasscode: string | null): FlowResult {
  switch (flow.step) {
    case 'current':
      return stay(
        entry === currentPasscode
          ? start('choose')
          : { ...start('current'), error: WRONG_CURRENT },
      );
    case 'choose':
      return stay({ step: 'confirm', first: entry, entry: '', error: null });
    case 'confirm':
      return entry === flow.first
        ? { flow: null, newPasscode: entry }
        : stay({ ...start('choose'), error: MISMATCH });
  }
}

export function codeFlowDigit(
  flow: CodeFlow,
  digit: string,
  currentPasscode: string | null,
): FlowResult {
  const entry = appendDigit(flow.entry, digit);
  if (entry === flow.entry) return stay(flow);
  if (entry.length < PASSCODE_LENGTH) return stay({ ...flow, entry, error: null });
  return completeEntry(flow, entry, currentPasscode);
}

export function codeFlowDelete(flow: CodeFlow): CodeFlow {
  return { ...flow, entry: deleteDigit(flow.entry) };
}
