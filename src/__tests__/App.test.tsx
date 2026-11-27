import '@testing-library/jest-dom/vitest';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

describe('VayuShield Dashboard Integration', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.startsWith('/api/weather')) {
        return new Response(
          JSON.stringify({
            weather: {
              cityResolved: 'New Delhi',
              temperatureC: 18.4,
              feelsLikeC: 18.0,
              humidityPct: 81,
              windSpeedKmh: 5.8,
              condition: 'Haze',
              fetchedAt: Date.now(),
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      throw new Error('Offline');
    });
  });

  it('renders semantic HTML5 landmarks and initial Delhi NCR severe smog state', () => {
    render(<App />);

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('complementary')).toBeInTheDocument();
    expect(screen.getByRole('meter', { name: /air quality index gauge/i })).toHaveAttribute(
      'aria-valuenow',
      '312'
    );
    expect(screen.getByRole('heading', { name: /severe smog alert/i })).toBeInTheDocument();
  });

  it('switches city presets and updates AQI theme to Good Air Quality for Bengaluru', async () => {
    const user = userEvent.setup();
    render(<App />);

    const bengaluruButtons = screen.getAllByRole('button', { name: 'Bengaluru' });
    await user.click(bengaluruButtons[0]);

    expect(screen.getByRole('meter', { name: /air quality index gauge/i })).toHaveAttribute(
      'aria-valuenow',
      '68'
    );
    expect(screen.getByRole('heading', { name: /good air quality/i })).toBeInTheDocument();
  });

  it('recalculates Direct Impact Scorecard immediately when toggling action cards', async () => {
    const user = userEvent.setup();
    render(<App />);

    const pm25El = screen.getByTestId('metric-pm25-reduction');
    const initialPm25 = Number.parseInt(pm25El.textContent ?? '0', 10);

    // Check an unchecked card in the active Zero-Cost Hacks tab
    const checkboxes = screen.getAllByRole('checkbox');
    const uncheckedCard = checkboxes.find(
      (cb) => cb.getAttribute('aria-checked') === 'false'
    );
    expect(uncheckedCard).toBeDefined();

    await user.click(uncheckedCard!);

    const updatedPm25 = Number.parseInt(pm25El.textContent ?? '0', 10);
    expect(updatedPm25).toBeGreaterThan(initialPm25);
  });

  it('navigates Action Matrix tabs and expands scientific rationale drawers', async () => {
    const user = userEvent.setup();
    render(<App />);

    const swapsTab = screen.getByRole('tab', { name: /sustainable swaps/i });
    await user.click(swapsTab);
    expect(swapsTab).toHaveAttribute('aria-selected', 'true');

    // Expand the first "Why this matters" scientific rationale drawer
    const rationaleButtons = screen.getAllByRole('button', {
      name: /why this matters/i,
    });
    expect(rationaleButtons[0]).toHaveAttribute('aria-expanded', 'false');
    await user.click(rationaleButtons[0]);
    expect(rationaleButtons[0]).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/atmospheric science note/i)).toBeInTheDocument();
  });

  it('sanitizes custom location input safely and updates telemetry header', async () => {
    const user = userEvent.setup();
    render(<App />);

    const customButtons = screen.getAllByRole('button', { name: 'Custom' });
    await user.click(customButtons[0]);

    const input = screen.getByLabelText(/custom location/i);
    await user.type(input, '<img src=x onerror=alert(1)>Pune');

    expect(screen.getByText(/sanitized location:/i)).toBeInTheDocument();
    expect(screen.getByText(/Environmental Telemetry · Pune/i)).toBeInTheDocument();
  });

  it('falls back cleanly when Generate Personalized Plan encounters an offline API', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Offline'));

    render(<App />);

    const cta = screen.getByRole('button', { name: /generate personalized plan/i });
    await user.click(cta);

    await waitFor(() => {
      expect(
        screen.getByText(/running local environmental science engine/i)
      ).toBeInTheDocument();
    });
  });

  it('updates AQI live when adjusting the range slider', () => {
    render(<App />);

    const slider = screen.getByLabelText(/ambient air quality index/i);
    fireEvent.change(slider, { target: { value: '145' } });

    expect(screen.getByRole('meter', { name: /air quality index gauge/i })).toHaveAttribute(
      'aria-valuenow',
      '145'
    );
    expect(screen.getByRole('heading', { name: /moderate haze/i })).toBeInTheDocument();
  });

  it('displays live OpenWeather temperature, humidity, wind speed, and dispersion status in HeroTelemetryCard', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('weather-temperature')).toHaveTextContent('18.4°C');
    });
    expect(screen.getByTestId('weather-humidity')).toHaveTextContent('81%');
    expect(screen.getByTestId('weather-wind')).toHaveTextContent('5.8 km/h');
    expect(screen.getByTestId('dispersion-rating')).toHaveTextContent('Low Dispersion');
  });
});
