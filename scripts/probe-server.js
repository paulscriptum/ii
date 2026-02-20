const SERVER_IP = '217.25.94.44';
const PORTS = [8080, 18789, 80, 443, 3000, 8443, 9090, 7860, 11434];

async function checkPort(ip, port) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(`http://${ip}:${port}/`, { signal: controller.signal });
    clearTimeout(timeout);
    const text = await res.text();
    return { port, open: true, status: res.status, body: text.slice(0, 300) };
  } catch (e) {
    clearTimeout(timeout);
    return { port, open: false, error: String(e).slice(0, 100) };
  }
}

async function checkEndpoint(ip, port, path) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(`http://${ip}:${port}${path}`, { signal: controller.signal });
    clearTimeout(timeout);
    const text = await res.text();
    console.log(`  http://${ip}:${port}${path} => ${res.status}: ${text.slice(0, 200)}`);
  } catch (e) {
    clearTimeout(timeout);
    console.log(`  http://${ip}:${port}${path} => FAIL`);
  }
}

async function main() {
  console.log(`Probing ${SERVER_IP}...\n`);

  const results = await Promise.all(PORTS.map(p => checkPort(SERVER_IP, p)));

  for (const r of results) {
    if (r.open) {
      console.log(`PORT ${r.port}: OPEN (HTTP ${r.status})`);
      if (r.body) console.log(`  Body: ${r.body}`);
    } else {
      console.log(`PORT ${r.port}: closed`);
    }
  }

  console.log('\nChecking OpenClaw endpoints on open ports...\n');

  const openPorts = results.filter(r => r.open).map(r => r.port);
  // Also always check 8080 and 18789 for WS/API
  const portsToDeepCheck = [...new Set([...openPorts, 8080, 18789])];

  for (const port of portsToDeepCheck) {
    console.log(`Port ${port}:`);
    await checkEndpoint(SERVER_IP, port, '/ws');
    await checkEndpoint(SERVER_IP, port, '/api/v1/status');
    await checkEndpoint(SERVER_IP, port, '/v1/models');
    await checkEndpoint(SERVER_IP, port, '/health');
    await checkEndpoint(SERVER_IP, port, '/api/health');
  }
}

main().catch(console.error);
