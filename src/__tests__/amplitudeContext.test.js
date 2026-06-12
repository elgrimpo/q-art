import React from 'react';
import { render } from '@testing-library/react';
import AmplitudeContextProvider from '../_context/amplitudeContext';
import { useStore } from '../store';
import * as amplitude from '@amplitude/analytics-browser';

jest.mock('@amplitude/analytics-browser', () => ({
  init: jest.fn(),
  track: jest.fn(),
  identify: jest.fn(),
  setUserId: jest.fn(),
  Identify: jest.fn().mockImplementation(() => ({ set: jest.fn() })),
}));

beforeEach(() => {
  jest.clearAllMocks();
  useStore.setState({ user: {} });
});

describe('AmplitudeContextProvider — identify', () => {
  it('calls setUserId and identify with is_internal=false for external email', () => {
    useStore.setState({ user: { _id: 'abc123', email: 'user@example.com' } });
    render(<AmplitudeContextProvider><div /></AmplitudeContextProvider>);

    expect(amplitude.setUserId).toHaveBeenCalledWith('abc123');
    const instance = amplitude.Identify.mock.results[0].value;
    expect(instance.set).toHaveBeenCalledWith('is_internal', false);
    expect(amplitude.identify).toHaveBeenCalledWith(instance);
  });

  it('sets is_internal=true for biedermann.chris@gmail.com', () => {
    useStore.setState({ user: { _id: 'me123', email: 'biedermann.chris@gmail.com' } });
    render(<AmplitudeContextProvider><div /></AmplitudeContextProvider>);

    expect(amplitude.setUserId).toHaveBeenCalledWith('me123');
    expect(amplitude.Identify).toHaveBeenCalledTimes(1);
    const instance = amplitude.Identify.mock.results[0].value;
    expect(instance.set).toHaveBeenCalledWith('is_internal', true);
  });

  it('sets is_internal=true for christopherpeterman812@gmail.com', () => {
    useStore.setState({ user: { _id: 'me456', email: 'christopherpeterman812@gmail.com' } });
    render(<AmplitudeContextProvider><div /></AmplitudeContextProvider>);

    expect(amplitude.setUserId).toHaveBeenCalledWith('me456');
    expect(amplitude.Identify).toHaveBeenCalledTimes(1);
    const instance = amplitude.Identify.mock.results[0].value;
    expect(instance.set).toHaveBeenCalledWith('is_internal', true);
  });

  it('skips identify for guest users', () => {
    useStore.setState({ user: { _id: 'guest_123', is_guest: true } });
    render(<AmplitudeContextProvider><div /></AmplitudeContextProvider>);

    expect(amplitude.setUserId).not.toHaveBeenCalled();
    expect(amplitude.identify).not.toHaveBeenCalled();
  });

  it('skips identify when user has no email', () => {
    useStore.setState({ user: {} });
    render(<AmplitudeContextProvider><div /></AmplitudeContextProvider>);

    expect(amplitude.setUserId).not.toHaveBeenCalled();
    expect(amplitude.identify).not.toHaveBeenCalled();
  });
});
