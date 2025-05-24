const express = require("express");
const axios = require("axios");

const app = express();
const PORT = 3000;

// Replace this with your actual token
const ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiZXhwIjoxNzQ4MDY5Mjg5LCJpYXQiOjE3NDgwNjg5ODksImlzcyI6IkFmZm9yZG1lZCIsImp0aSI6ImMyOTk2NzA4LWM5ZmItNGFjMS05N2QxLWYwMzUyM2Y1NGE2OSIsInN1YiI6InlhZGhhdmFyYW1hbmFueWFkaGF2YUBnbWFpbC5jb20ifSwiZW1haWwiOiJ5YWRoYXZhcmFtYW5hbnlhZGhhdmFAZ21haWwuY29tIiwibmFtZSI6InlhZGhhdmFyYW1hbmFuIGMiLCJyb2xsTm8iOiI5Mjc2MjJiYWwwNTUiLCJhY2Nlc3NDb2RlIjoid2hlUVV5IiwiY2xpZW50SUQiOiJjMjk5NjcwOC1jOWZiLTRhYzEtOTdkMS1mMDM1MjNmNTRhNjkiLCJjbGllbnRTZWNyZXQiOiJLTlJGV1VYeXlQaFFmeHZ1In0.M0YULWPwIjiGkoXrdaYuuwOvhaukk--qvHrHE91bI4k";

const BASE_URL = "http://20.244.56.144/evaluation-service/stocks";

// Utility function to calculate average
function calculateAverage(prices) {
  const sum = prices.reduce((acc, obj) => acc + obj.price, 0);
  return prices.length ? sum / prices.length : 0;
}

// Utility function to calculate Pearson correlation
function calculateCorrelation(prices1, prices2) {
  const len = Math.min(prices1.length, prices2.length);
  if (len < 2) return null;

  const x = prices1.slice(0, len).map((p) => p.price);
  const y = prices2.slice(0, len).map((p) => p.price);

  const meanX = calculateAverage(prices1.slice(0, len));
  const meanY = calculateAverage(prices2.slice(0, len));

  let numerator = 0;
  let denomX = 0;
  let denomY = 0;

  for (let i = 0; i < len; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    numerator += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }

  const denominator = Math.sqrt(denomX * denomY);
  return denominator === 0 ? null : +(numerator / denominator).toFixed(4);
}

// Route 1: Get average stock price
app.get("/stocks/:ticker", async (req, res) => {
  const { ticker } = req.params;
  const { minutes, aggregation } = req.query;

  if (!minutes || aggregation !== "average") {
    return res.status(400).json({ error: "Missing or invalid query parameters" });
  }

  try {
    const response = await axios.get(`${BASE_URL}/${ticker}`, {
      params: { minutes },
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
    });

    const priceHistory = response.data;
    const averagePrice = calculateAverage(priceHistory);

    res.json({ averageStockPrice: averagePrice, priceHistory });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route 2: Get correlation between two stocks
app.get("/stockcorrelation", async (req, res) => {
  const { minutes, ticker } = req.query;

  if (!minutes || !ticker || ticker.length !== 2) {
    return res.status(400).json({ error: "Provide exactly two ticker symbols" });
  }

  try {
    const [ticker1, ticker2] = ticker;

    const [res1, res2] = await Promise.all([
      axios.get(`${BASE_URL}/${ticker1}`, {
        params: { minutes },
        headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
      }),
      axios.get(`${BASE_URL}/${ticker2}`, {
        params: { minutes },
        headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
      }),
    ]);

    const prices1 = res1.data;
    const prices2 = res2.data;

    const avg1 = calculateAverage(prices1);
    const avg2 = calculateAverage(prices2);

    const correlation = calculateCorrelation(prices1, prices2);

    res.json({
      correlation,
      stocks: {
        [ticker1]: { averagePrice: avg1, priceHistory: prices1 },
        [ticker2]: { averagePrice: avg2, priceHistory: prices2 },
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
