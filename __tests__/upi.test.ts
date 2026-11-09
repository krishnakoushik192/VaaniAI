import { isValidUpi, normalizeUpi, upiApp, upiStatus, withSuffix } from '../src/logic/upi';
import { defaultMethod } from '../src/store/AppStore';

describe('UPI ID helpers', () => {
  it('tidies spaces and capitals', () => {
    expect(normalizeUpi(' Ravi 98@YBL ')).toBe('ravi98@ybl');
    expect(isValidUpi(' 9848012345@YBL')).toBe(true);
  });

  it('tells what is missing while typing', () => {
    expect(upiStatus('')).toBe('empty');
    expect(upiStatus('9848012345')).toBe('noAt');
    expect(upiStatus('9848012345@')).toBe('noAt');
    expect(upiStatus('9@ybl')).toBe('invalid');
    expect(upiStatus('ravi.k@okaxis')).toBe('valid');
  });

  it('adds a tapped ending and names the app', () => {
    expect(withSuffix('9848012345', 'ybl')).toBe('9848012345@ybl');
    expect(withSuffix('9848012345@paytm', 'okaxis')).toBe('9848012345@okaxis');
    expect(upiApp('9848012345@ybl')).toBe('PhonePe');
    expect(upiApp('ravi@okhdfcbank')).toBe('GPay');
    expect(upiApp('ravi@mybank')).toBeNull();
  });
});

describe('starting payment method of a bill', () => {
  it('never starts on UPI without a UPI ID', () => {
    expect(defaultMethod(undefined, false)).toBe('cash');
    expect(defaultMethod('upi', false)).toBe('cash');
  });
  it('keeps the last cash/UPI choice, never khata', () => {
    expect(defaultMethod(undefined, true)).toBe('upi');
    expect(defaultMethod('cash', true)).toBe('cash');
    expect(defaultMethod('khata', true)).toBe('upi');
    expect(defaultMethod('khata', false)).toBe('cash');
  });
});
