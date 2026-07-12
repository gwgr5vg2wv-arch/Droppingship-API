const port = process.env.PORT || 3000;
const url = process.env.HEALTHCHECK_URL || `http://localhost:${port}/health/ready`;

try {
  const response = await fetch(url);
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error('Healthcheck falhou:', response.status, body);
    process.exit(1);
  }

  console.log('Healthcheck OK:', body.status || 'ok');
} catch (error) {
  console.error('Healthcheck indisponivel:', error.message);
  process.exit(1);
}
