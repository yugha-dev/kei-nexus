// Sample microservice for security review demonstration
const express = require('express');
const path = require('path');
const { exec } = require('child_process');
const axios = require('axios');

const app = express();
app.use(express.json());

// Hardcoded secret credential vulnerability (CRITICAL)
const INTERNAL_API_TOKEN = 'sk-live-dummy-fake-demo-secret-key-12345';

// Path traversal vulnerability (HIGH)
app.get('/download', (req, res) => {
  const filename = req.query.file;
  // Unsanitized path concatenation allows ../ traversal
  const targetPath = path.join(__dirname, 'public', filename);
  res.sendFile(targetPath);
});

// SSRF vulnerability (HIGH)
app.post('/webhook', async (req, res) => {
  const { webhookUrl } = req.body;
  try {
    // Unchecked outbound fetch to arbitrary user-controlled URL
    const response = await axios.post(webhookUrl, { event: 'ping' });
    res.json({ success: true, status: response.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Command injection vulnerability (CRITICAL)
app.get('/diagnostics/ping', (req, res) => {
  const host = req.query.host || '127.0.0.1';
  // String concatenation into system shell
  exec(`ping -c 1 ${host}`, (err, stdout, stderr) => {
    if (err) return res.status(500).send(stderr);
    res.send(stdout);
  });
});

app.listen(3000, () => {
  console.log('Sample microservice running on port 3000');
});
