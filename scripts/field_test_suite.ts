/**
 * Comprehensive Field Test Suite for Geospatial, Weather, Risk, Simulation, and Security
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

interface TestResult {
  suite: string;
  name: string;
  status: 'PASS' | 'FAIL';
  details: string;
}

const results: TestResult[] = [];

function record(suite: string, name: string, pass: boolean, details: string) {
  results.push({
    suite,
    name,
    status: pass ? 'PASS' : 'FAIL',
    details
  });
  console.log(`[${pass ? 'PASS' : 'FAIL'}] [${suite}] ${name}: ${details}`);
}

async function runTests() {
  console.log('=====================================================');
  console.log('STARTING GEOSPATIAL & RISK FIELD TEST SUITE');
  console.log('=====================================================\n');

  // 1. Tile Proxy & Security
  try {
    const validTile = await fetch(`${BASE_URL}/api/v1/map/tiles/5/23/14.png`, { redirect: 'manual' });
    const isValidTileOk = validTile.status === 200 || validTile.status === 302;
    record('Map Security', 'Valid tile request proxies or redirects safely', isValidTileOk, `Status: ${validTile.status}`);

    const malformedTile = await fetch(`${BASE_URL}/api/v1/map/tiles/abc/-1/99999.png`);
    record('Map Security', 'Malformed tile request returns HTTP 400', malformedTile.status === 400, `Status: ${malformedTile.status}`);
  } catch (err: any) {
    record('Map Security', 'Tile proxy tests', false, err.message);
  }

  // 2. India-Wide Locations & Geocoding
  const testLocations = [
    { name: 'Joshimath (Uttarakhand)', lat: 30.5564, lon: 79.5653, region: 'Western Himalayas' },
    { name: 'Nainital (Uttarakhand)', lat: 29.3919, lon: 79.4542, region: 'Western Himalayas' },
    { name: 'Shimla (Himachal Pradesh)', lat: 31.1048, lon: 77.1734, region: 'Western Himalayas' },
    { name: 'Manali (Himachal Pradesh)', lat: 32.2432, lon: 77.1892, region: 'Western Himalayas' },
    { name: 'Shillong (Meghalaya)', lat: 25.5788, lon: 91.8933, region: 'Eastern Himalayas / Northeast' },
    { name: 'Gangtok (Sikkim)', lat: 27.3314, lon: 88.6138, region: 'Eastern Himalayas / Northeast' },
    { name: 'Darjeeling (West Bengal)', lat: 27.0410, lon: 88.2663, region: 'Eastern Himalayas / Northeast' },
    { name: 'Itanagar (Arunachal Pradesh)', lat: 27.0844, lon: 93.6053, region: 'Eastern Himalayas / Northeast' },
    { name: 'Kohima (Nagaland)', lat: 25.6751, lon: 94.1086, region: 'Eastern Himalayas / Northeast' },
    { name: 'Wayanad (Kerala)', lat: 11.5511, lon: 76.1264, region: 'Western Ghats' },
    { name: 'Munnar (Kerala)', lat: 10.0889, lon: 77.0595, region: 'Western Ghats' },
    { name: 'Mahabaleshwar (Maharashtra)', lat: 17.9307, lon: 73.6477, region: 'Western Ghats' },
    { name: 'Madikeri / Coorg (Karnataka)', lat: 12.4244, lon: 75.7382, region: 'Western Ghats' },
    { name: 'Ramban - Banihal (J&K)', lat: 33.2435, lon: 75.2415, region: 'Western Himalayas' }
  ];

  console.log('\n--- Testing India-Wide Weather & Risk Across 14 Geographically Separated Locations ---');
  const distinctScores = new Set<number>();
  const distinctRainfalls = new Set<number>();

  for (const loc of testLocations) {
    try {
      // Test Weather
      const weatherRes = await fetch(`${BASE_URL}/api/v1/weather?lat=${loc.lat}&lon=${loc.lon}`);
      const weather: any = await weatherRes.json();

      const weatherOk = weatherRes.status === 200 &&
        typeof weather.temperatureC === 'number' &&
        typeof weather.precipitation24hMm === 'number' &&
        typeof weather.precipitation72hMm === 'number' &&
        (weather.status === 'LIVE' || weather.status === 'FORECAST' || weather.status === 'UNAVAILABLE');

      record('Weather Engine', `${loc.name} weather telemetry`, weatherOk,
        `Status: ${weather.status}, Temp: ${weather.temperatureC}°C, 24h: ${weather.precipitation24hMm}mm, 72h: ${weather.precipitation72hMm}mm, Provider: ${weather.providerInfo?.name}`);

      distinctRainfalls.add(weather.precipitation24hMm);

      // Test Risk
      const riskRes = await fetch(`${BASE_URL}/api/v1/risk?lat=${loc.lat}&lon=${loc.lon}`);
      const risk: any = await riskRes.json();

      const riskOk = riskRes.status === 200 &&
        typeof risk.riskScore === 'number' &&
        typeof risk.riskLevel === 'string' &&
        Array.isArray(risk.contributingFactors) &&
        risk.contributingFactors.length > 0;

      distinctScores.add(risk.riskScore);

      record('Risk Engine', `${loc.name} deterministic risk`, riskOk,
        `Score: ${risk.riskScore}/100, Level: ${risk.riskLevel}, Factors: ${risk.contributingFactors.length}`);

    } catch (err: any) {
      record('Location Testing', loc.name, false, err.message);
    }
  }

  record('Data Integrity', 'Distinct risk scores computed across India', distinctScores.size > 1, `Computed ${distinctScores.size} distinct risk scores`);

  // 3. Reverse Geocode & Location Search
  try {
    const revRes = await fetch(`${BASE_URL}/api/v1/location/reverse?lat=30.5564&lon=79.5653`);
    const rev: any = await revRes.json();
    record('Geocoding', 'Reverse geocode Joshimath coordinates', revRes.status === 200 && rev.name?.includes('Joshimath'), `Result: ${rev.formatted}`);

    const searchRes = await fetch(`${BASE_URL}/api/v1/location/search?q=Munnar`);
    const search: any = await searchRes.json();
    record('Geocoding', 'Location search for Munnar', searchRes.status === 200 && search.results?.length > 0 && search.results[0].name.includes('Munnar'), `Found: ${search.results?.length} results`);
  } catch (err: any) {
    record('Geocoding', 'Search & reverse geocoding', false, err.message);
  }

  // 4. Time-Aware / Future-Date Test
  try {
    const futureDate = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];
    const futureWeatherRes = await fetch(`${BASE_URL}/api/v1/weather?lat=30.5564&lon=79.5653&date=${futureDate}`);
    const futureWeather: any = await futureWeatherRes.json();

    const isFutureForecast = futureWeatherRes.status === 200 &&
      futureWeather.status === 'FORECAST' &&
      futureWeather.isForecast === true &&
      futureWeather.forecastDate === futureDate;

    record('Time-Aware Forecast', `Future date query (+3 days: ${futureDate})`, isFutureForecast,
      `Status: ${futureWeather.status}, isForecast: ${futureWeather.isForecast}, TargetDate: ${futureWeather.forecastDate}, Precip: ${futureWeather.precipitation24hMm}mm`);
  } catch (err: any) {
    record('Time-Aware Forecast', 'Future date weather', false, err.message);
  }

  // 5. What-If Simulation
  try {
    const simBaselineRes = await fetch(`${BASE_URL}/api/v1/risk?lat=30.5564&lon=79.5653`);
    const baseline: any = await simBaselineRes.json();

    // High rainfall scenario (+80%)
    const simHighRes = await fetch(`${BASE_URL}/api/v1/risk/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baselineLat: 30.5564,
        baselineLon: 79.5653,
        rainfallAnomalyPct: 80,
        slopeAdjustmentDeg: 5,
        soilSaturationAdjustmentPct: 30,
        seismicTrigger: true
      })
    });
    const simHigh: any = await simHighRes.json();

    const simHighOk = simHighRes.status === 200 &&
      simHigh.scenario?.freshness === 'SIMULATED' &&
      simHigh.scenario.riskScore > baseline.riskScore;

    record('What-If Simulator', 'High rainfall + seismic simulation increases risk score', simHighOk,
      `Baseline: ${baseline.riskScore} -> Scenario: ${simHigh.scenario?.riskScore} (Delta: ${simHigh.deltaLevel})`);

    // Decreased rainfall scenario (-50%)
    const simLowRes = await fetch(`${BASE_URL}/api/v1/risk/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baselineLat: 30.5564,
        baselineLon: 79.5653,
        rainfallAnomalyPct: -50,
        slopeAdjustmentDeg: 0,
        soilSaturationAdjustmentPct: -30,
        seismicTrigger: false
      })
    });
    const simLow: any = await simLowRes.json();

    const simLowOk = simLowRes.status === 200 &&
      simLow.scenario?.freshness === 'SIMULATED' &&
      simLow.scenario.riskScore <= baseline.riskScore;

    record('What-If Simulator', 'Decreased rainfall (-50%) reduces or maintains risk score', simLowOk,
      `Baseline: ${baseline.riskScore} -> Scenario: ${simLow.scenario?.riskScore} (Delta: ${simLow.deltaLevel})`);

    // Verify baseline was NOT mutated
    const checkBaselineRes = await fetch(`${BASE_URL}/api/v1/risk?lat=30.5564&lon=79.5653`);
    const checkBaseline: any = await checkBaselineRes.json();
    record('What-If Simulator', 'Baseline risk remains completely immutable after simulation', checkBaseline.riskScore === baseline.riskScore,
      `Pre-sim: ${baseline.riskScore}, Post-sim: ${checkBaseline.riskScore}`);
  } catch (err: any) {
    record('What-If Simulator', 'Simulation tests', false, err.message);
  }

  // 6. 10-Day Outlook
  try {
    const outlookRes = await fetch(`${BASE_URL}/api/v1/risk/outlook?lat=30.5564&lon=79.5653`);
    const outlookData: any = await outlookRes.json();

    const has10Days = outlookRes.status === 200 &&
      Array.isArray(outlookData.outlook) &&
      outlookData.outlook.length === 10;

    const allForecastMarked = has10Days && outlookData.outlook.every((d: any) =>
      d.status === 'FORECAST' || d.status === 'UNAVAILABLE'
    );

    record('10-Day Outlook', 'Returns exactly 10 projection days labeled FORECAST', allForecastMarked,
      `Days count: ${outlookData.outlook?.length}, Day 1: ${outlookData.outlook?.[0]?.date} (${outlookData.outlook?.[0]?.riskLevel}), Day 10: ${outlookData.outlook?.[9]?.date} (${outlookData.outlook?.[9]?.riskLevel})`);
  } catch (err: any) {
    record('10-Day Outlook', 'Outlook verification', false, err.message);
  }

  // 7. Failure & Out-of-Bounds Handling
  try {
    const invalidCoordsRes = await fetch(`${BASE_URL}/api/v1/weather?lat=999&lon=999`);
    record('Failure Handling', 'Reject out-of-bounds coordinates (999, 999) with HTTP 400', invalidCoordsRes.status === 400, `Status: ${invalidCoordsRes.status}`);

    const nanCoordsRes = await fetch(`${BASE_URL}/api/v1/risk?lat=invalid&lon=invalid`);
    record('Failure Handling', 'Reject NaN coordinates with HTTP 400', nanCoordsRes.status === 400, `Status: ${nanCoordsRes.status}`);

    const invalidOutlookRes = await fetch(`${BASE_URL}/api/v1/risk/outlook?lat=-200&lon=500`);
    record('Failure Handling', 'Reject out-of-bounds outlook request with HTTP 400', invalidOutlookRes.status === 400, `Status: ${invalidOutlookRes.status}`);

    const invalidReverseRes = await fetch(`${BASE_URL}/api/v1/location/reverse?lat=1000&lon=2000`);
    record('Failure Handling', 'Reject out-of-bounds reverse geocode with HTTP 400', invalidReverseRes.status === 400, `Status: ${invalidReverseRes.status}`);
  } catch (err: any) {
    record('Failure Handling', 'Coordinate validation tests', false, err.message);
  }

  // 8. Regression Checks (Auth, Citizen Reports, Admin, RAG, Alerts, Roads)
  try {
    // Health
    const healthRes = await fetch(`${BASE_URL}/api/v1/health`);
    const health: any = await healthRes.json();
    record('Regression', 'System health & DB connectivity', health.status === 'ok' && health.database?.connected === true, `DB: ${health.database?.type}, Connected: ${health.database?.connected}`);

    // Alerts
    const alertsRes = await fetch(`${BASE_URL}/api/v1/alerts`);
    const alerts: any = await alertsRes.json();
    record('Regression', 'Emergency alerts feed active', alertsRes.status === 200 && Array.isArray(alerts.alerts), `Count: ${alerts.alerts?.length}`);

    // Roads
    const roadsRes = await fetch(`${BASE_URL}/api/v1/roads`);
    const roads: any = await roadsRes.json();
    record('Regression', 'Critical road corridors feed active', roadsRes.status === 200 && Array.isArray(roads.roads), `Count: ${roads.roads?.length}`);

    // Evidence RAG
    const ragRes = await fetch(`${BASE_URL}/api/v1/rag/query?query=rainfall+threshold`);
    const rag: any = await ragRes.json();
    record('Regression', 'Evidence RAG documentation engine active', ragRes.status === 200 && Array.isArray(rag.citations), `Citations: ${rag.citations?.length}`);

    // Public reports
    const repRes = await fetch(`${BASE_URL}/api/v1/reports`);
    const reports: any = await repRes.json();
    record('Regression', 'Public reports queryable', repRes.status === 200 && Array.isArray(reports.reports), `Count: ${reports.reports?.length}`);
  } catch (err: any) {
    record('Regression', 'System components regression', false, err.message);
  }

  console.log('\n=====================================================');
  console.log('SUMMARY OF FIELD TEST RESULTS');
  console.log('=====================================================');
  const total = results.length;
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log(`Total Tests: ${total} | Passed: ${passed} | Failed: ${failed}\n`);

  if (failed > 0) {
    console.error('Failed Tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.error(`- [${r.suite}] ${r.name}: ${r.details}`);
    });
    process.exit(1);
  } else {
    console.log('ALL TESTS PASSED WITH 100% SUCCESS!');
    process.exit(0);
  }
}

runTests();
